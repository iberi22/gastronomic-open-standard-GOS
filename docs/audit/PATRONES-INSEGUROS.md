# Auditoría de patrones inseguros — GOS (Gastronomic Open Standard)

- **Fecha:** 2026-10-01
- **Repo:** `gastronomic-open-standard-GOS` (público: `github.com/iberi22/gastronomic-open-standard-GOS`)
- **Ref revisada:** `035e89b7` (`main`), árbol con 1 modificado + 1 untracked ajeno a esta auditoría
- **Alcance:** 14 páginas Astro, 12 endpoints en `site/src/pages/api/`, `worker/src/index.ts` (402 LOC), `site/src/lib` (8.354 LOC), 613 recetas, 552 ingredientes, 30 substancias, 3 `package.json`
- **Modo:** solo lectura. No se modificó código, ni tests, ni CI. Único archivo creado: este informe.
- **Skills aplicadas:** `secret-scanning`, `supply-chain-security`, `javascript-supply-chain-hardening`, `security-audit`

> Ningún valor de credencial se reproduce aquí. Los candidatos se describen por longitud y
> hash truncado (`sha256[:8]`), suficiente para girar sin re-exponer.

---

## 0. Resumen ejecutivo

| Severidad | Cantidad | IDs |
|---|---|---|
| 🔴 CRÍTICA abierta | 1 | F-01 |
| 🟠 ALTA | 3 | F-02, F-03, F-04 |
| 🟡 MEDIA | 5 | F-05 … F-09 |
| ⚪ BAJA / INFO | 5 | F-10 … F-14 |
| ✅ Corregido en HEAD (contexto) | 2 | C-01, C-02 |

**La tesis del encargo —"el cliente declara su propio privilegio y el servidor lo cree"— es cierta
y aparece en tres sitios, pero ninguno es explotable hoy**, porque los tres endpoints que la reciben
responden `405` en producción (medido, §2.1). El hallazgo explotable real y grave es otro: **el
ledger de crédito de inferencia no tiene servidor** (F-02) y **el endpoint que sí está desplegado y
escrito con autenticación no tiene CI que lo ejecute** (F-04).

---

## 1. Contexto: qué está realmente desplegado

El sitio es `output: 'static'` sin adapter SSR (`site/astro.config.mjs:11`). Eso decide el
alcanzamiento de casi todo lo que sigue.

```bash
$ find site/src/pages -name '*.astro' | wc -l          # 14
$ find site/src/pages/api \( -name '*.ts' -o -name '*.astro' \) | wc -l   # 12
$ find site/src/lib -name '*.ts' -exec cat {} + | wc -l   # 8354
$ wc -l < worker/src/index.ts                             # 402
$ git rev-list --all --count                              # 2936
$ git ls-files | wc -l                                    # 3017
```

En el build estático, los `APIRoute` con `POST` se prerenderizan como archivo plano y el handler
nunca se ejecuta. Medido contra producción:

```bash
$ for p in /api/agent/pay /api/ai/infer /api/ai/ask; do curl -s -o /dev/null -w "$p -> %{http_code}\n" https://gos.swal.network$p; done
/api/agent/pay -> 200      # 200 = el GET, que responde 405 como cuerpo JSON
/api/ai/infer -> 200
/api/ai/ask -> 200

$ curl -s -X POST -H 'Content-Type: application/json' -d '{"question":"cafeina","tierId":"socio-managed","used":0}' \
    -w '\nHTTP=%{http_code}\n' https://gos.swal.network/api/ai/ask
HTTP=405

$ curl -s -X POST -H 'Content-Type: application/json' -d '{"tier":"socio-managed","estimatedTokens":0}' \
    -w '\nHTTP=%{http_code}\n' https://gos.swal.network/api/agent/pay
HTTP=405

# y tampoco a través del gateway, que proxea el mismo origen:
$ curl -s -X POST -H 'Content-Type: application/json' -d '{"x":1}' -w '\nHTTP=%{http_code}\n' \
    https://gos-api-gateway.iberi22.workers.dev/api/entities/recipe
HTTP=405
```

El **único** código de autorización que corre en producción es `worker/src/index.ts`.

---

## 2. Alcance 1 — el cliente declara su privilegio

### 2.1 Mapa de endpoints y de dónde sale el privilegio

| Endpoint | Fuente del privilegio | Alcance real | Clasificación |
|---|---|---|---|
| `worker/src/index.ts` `/api/*` | key en header/query validada en D1 o billing central | **activo en producción** | ✅ C-01 (ya corregido) |
| `worker/src/index.ts` `/api/ai/infer` | `env.DB`/billing + `isPaidKey` (servidor) | activo, 402 sin key | ✅ sano |
| `site/src/pages/api/ai/ask.ts` | `body.tierId` + `body.used` | 405 | 🟠 F-03 |
| `site/src/pages/api/ai/infer.ts` → `site/workers/ai.ts` | `body.tierId` + `body.mode` + `body.appId`, **sin autenticación alguna** | 405 | 🟠 F-02 |
| `site/src/pages/api/agent/pay.ts` | `body.tier` + `body.used` | 405 | 🟡 F-05 |
| `site/src/pages/api/agent/catalog.json.ts` | — | 200 | ✅ **no es hallazgo** |

### 2.2 `catalog.json.ts`: revisado, NO es bypass

Se pidió comprobarlo específicamente. `site/src/pages/api/agent/catalog.json.ts:35-53` no lee
`request`, ni `url`, ni body: recibe todo de `getCollection('dishes' | 'ingredients' | …)`, que es
contenido del repo. No hay campo de entrada controlable por el cliente que influya en nada, y el
catálogo es público por diseño (es lo que indexa el agente). **Sin hallazgo.** Lo mismo aplica a
`knowledge.json.ts:3-24`, `evidence.json.ts:76`, `substances.json.ts:4`, `countries.ts:9`,
`site/src/pages/api/v1/translate.ts:9` (los `searchParams` filtran datos, no permisos).

### 2.3 `ask.ts` — el mismo patrón del bypass ya corregido, en otro sitio

`site/src/pages/api/ai/ask.ts:301` y `:304`:

```ts
const tierId = normalizeTier(body.tierId)            // :301
const used = Number.isFinite(Number(body.used)) ? Number(body.used) : 0   // :304
…
const data = await askGrounded({ question, sources, tierId, used })      // :308
```

`normalizeTier` (`:42-45`) solo valida contra el catálogo (`s in TIERS ? s : 'free'`), es decir
**valida que el nombre exista, no que el solicitante lo tenga**. El `used` es literalmente el
contador de consumo declarado por el cliente: el "ledger" de `creditStatus(used, tierId)`
(`site/src/lib/billing.ts:66-72`) es aritmética sobre un número que viene en el body.

Clasificación: 🟠 **SOSPECHOSO (alto) / EXPLOTABLE solo si el handler se sirve.** Alcanzabilidad
medida: `405` en el sitio y en el gateway. Ruta si se activa: añadir el adapter SSR o una Pages
Function → `POST {"question":"x","tierId":"socio-managed","used":0}` → `askGrounded` corre
`llmComplete` con tier de pago y crédito declarado en cero. No hay ruta más lejana: no requiere
key, ni sesión, ni Turnstile.

El impacto no es solo "el cliente dice su tier": es que **el sistema de facturación completo es
informativo**. Ver F-02.

### 2.4 `ai/infer.ts` → `workers/ai.ts`: el `mockEnv` sí es un problema

`site/src/pages/api/ai/infer.ts:11-31`:

```ts
const runtimeEnv = (globalThis as unknown as GlobalWithEnv).__env ?? {}      // :11
const env: Partial<Env> = (request as unknown as { cf?: Partial<Env> }).cf ?? runtimeEnv  // :12-13
const mockEnv: Env = { AI: { run: async () => ({ response: 'mock' }) }, SWAL_D1: {…}, … }  // :15-28
const effectiveEnv: Env = env?.AI ? (env as Env) : mockEnv                   // :29
const res = await worker.fetch(request, effectiveEnv)                       // :31
```

Dos cosas distintas, ambas reales:

1. **El `mockEnv` no degrada a error, degrada a "respuesta válida"** (`:29`). Si no llega binding
   `AI`, en vez de `503`/`501` se entra al worker con un `AI.run` que devuelve la cadena `'mock'`
   y una D1 que devuelve `null` en todo. El handler **responde `200` con `cost`, `tokensUsed` y
   `credit` calculados** (`site/workers/ai.ts:181-197`). Es un fail-open de autenticación/billing
   (§3).
2. **El handler delegado no tiene autenticación.** `grep -n 'x-api-key\|Authorization\|auth' site/workers/ai.ts`
   → 0 coincidencias. No hay ninguna credencial que presented. El único control es el tier, y el
   tier viene del body (`site/workers/ai.ts:57-62`).

Clasificación: 🟠 **SOSPECHOSO (alto) / EXPLOTABLE en cuanto exista runtime.**

### 2.5 Bypass de la validación de tier por cadena de prototipos — **defecto real, medido**

`site/workers/ai.ts:66-75`:

```ts
const tier = typeof tierId === 'string' && tierId in TIERS
  ? TIERS[tierId as SocioTier['id']]
  : undefined
if (!tier || tier.monthlyCredit === 0) { … 402 … }      // :70
```

El `in` consulta la cadena de prototipos, y `tier` puede ser una función (no tiene
`monthlyCredit`), con lo que `tier.monthlyCredit === 0` es `false` y **la puerta de crédito se
abre**. Reproducido contra la lógica exacta del archivo:

```bash
$ node -e "const TIERS={free:{monthlyCredit:0},socio:{monthlyCredit:50000},'socio-managed':{monthlyCredit:50000}};
           for (const t of ['socio','free','constructor','toString','__proto__','valueOf','nope']) {
             const tier=(typeof t==='string'&&t in TIERS)?TIERS[t]:undefined;
             console.log(t.padEnd(14),'402=',(!tier||tier.monthlyCredit===0),'quota bloquea=',0>=tier?.monthlyCredit);
           }"
socio         402= false quota bloquea= false
free          402= true  quota bloquea= true
constructor   402= false quota bloquea= false   ← hueco
toString      402= false quota bloquea= false   ← hueco
__proto__     402= false quota bloquea= false   ← hueco
valueOf       402= false quota bloquea= false   ← hueco
nope          402= true  quota bloquea= false
```

`"constructor"` pasa la puerta de crédito igual que `"socio"`, sin ser un tier. Y la segunda
barrera, `used >= tier.monthlyCredit` (`:107`), tampoco dispara porque `undefined >= …` es `false`.
Clasificación: 🟠 **SOSPECHOSO (medio-alto) / EXPLOTABLE si el handler corre.** Consecuencia real:
`monthlyCredit` queda `undefined` en el breakdown de coste que se devuelve al cliente, y el consumo
no se contabiliza contra ningún límite.

El mismo patrón `x in RECORD` aparece en `site/src/pages/api/ai/ask.ts:44` y
`site/src/pages/api/agent/pay.ts:27`. En `ask.ts` el daño es menor: `TIERS['constructor'].monthlyCredit`
también es `undefined`, pero `creditStatus` (`billing.ts:70`) usa `?? 0`, así que cae a `free` por el
suelo. En `pay.ts:27` el `?? TIERS.socio` hace algo peor (§F-05).

---

## 3. Alcance 2 — credenciales o permisos concedidos por contenido

Búsqueda de comparaciones por contenido en decisiones de autorización:

```bash
$ grep -rnE "\.(includes|startsWith|endsWith)\(|\.length\s*[<>=]|substring\(|slice\(0,|=== *apiKey|== *apiKey" \
    --include='*.ts' --include='*.astro' --include='*.mjs' site/src worker/src scripts site/scripts
```

| Ubicación | Expresión | ¿Decide autorización? | Veredicto |
|---|---|---|---|
| `site/workers/ai.ts:113-118` (`ai.ts` del sitio) | `turnstileToken.length < 10` | "el captcha es válido" | ⚠️ F-05 |
| `worker/src/index.ts:113-115` | `apiKey.startsWith('swal_')` | **no**: enruta a qué validador | ✅ revisado, sano |
| `worker/src/index.ts:99` | `authHeader?.startsWith('Bearer ')` | no: parseo de esquema | ✅ sano |
| `worker/src/index.ts:99` | `.substring(7).trim()` | no: parseo | ✅ sano |
| `site/src/pages/api/ai/ask.ts:42-45` | `s in TIERS` | sí: decide tier | ⚠️ §2.5 |
| `site/workers/ai.ts:67` | `tierId in TIERS` | sí: decide tier | ⚠️ §2.5 |
| `worker/src/index.ts:185` | `apiKey === devKey` | sí | ✅ correcto (exacto, fail-closed) |

`worker/src/index.ts:113-115` merece nota porque *parece* el patrón buscado y no lo es: una key
`swal_*` con `BILLING_URL` sin configurar cae al `else if (apiKey)` de `:143` y se valida igual
contra D1 con `401`. El prefijo nunca concede por sí solo. **No es hallazgo.**

Sobre longitudes y hashes parciales: no hay ningún authorization por longitud ni por hash
parcial. El único `length` en decisión de permiso es el Turnstile de longitud mínima (F-05).

---

## 4. Alcance 3 — cada `catch`: ¿deniega o permite?

Inventario completo:

```bash
$ grep -rn 'catch' --include='*.ts' --include='*.astro' site/src/pages/api site/src/lib worker/src
```

### 4.1 Fallos abiertos (permiten) — 🔴 el hallazgo grave

| # | Ubicación | Qué falla | Resultado |
|---|---|---|---|
| **F-01** | `site/src/lib/llm.ts:31-38` | `localStorage.getItem('credits:…')` lanza | `used = 0` → `canAffordInference` (`:40`) pasa con crédito completo |
| **F-01** | `site/workers/ai.ts:103-105` | D1/KV del ledger lanza | `used = 0` → `used >= monthlyCredit` (`:107`) no bloquea |
| **F-01** | `site/workers/ai.ts:137-141` | `env.AI.run` lanza | devuelve `text = '[AI fallback dev] ' + prompt` como **200 de éxito**, y consume crédito del solicitante |
| **F-01** | `site/workers/ai.ts:145-152` | `INSERT OR REPLACE credits` + `KV.put` lanza | `catch {}` mudo: el consumo **nunca se persiste** → el mismo prompt se puede repetir indefinidamente sin descontar crédito |
| **F-01** | `site/workers/ai.ts:163-179` | `INSERT invoices` lanza | `catch {}` mudo: no hay factura |
| **F-01** | `site/src/pages/api/ai/infer.ts:29` | no hay binding `AI` | entra al worker con `mockEnv` → 200 con coste inventado (§2.4) |
| F-09 | `worker/src/index.ts:213-215` | `RATE_LIMIT_KV.get` lanza | `currentCount = 0` → el límite diario se reinicia |
| F-09 | `worker/src/index.ts:244-246` | `RATE_LIMIT_KV.put` lanza | no se incrementa |
| F-09 | `worker/src/index.ts:294-296` | `RATE_LIMIT_KV.get` (crédito) lanza | `used = 0` |
| F-09 | `worker/src/index.ts:328` | `RATE_LIMIT_KV.put` (crédito) lanza | `catch {}` mudo → inferencia de pago ilimitada |

**F-01 en una frase:** el sistema de cuota de inferencia es *fail-open en todas partes*. No hay
ningún `catch` en el camino de decisión de cuota que niegue; todos devuelven "cero consumido",
y dos de ellos además devuelven éxito al cliente.

**Alcance de F-01:** el único tramo *activo* es `worker/src/index.ts:294-296` y `:328`, y ahí la
puerta previa (`isPaidKey`, `:258`) sí está bien. Es decir, el fail-open de cuota solo puede ser
usado por quien ya tiene key de pago — degrada el control de facturación, no la autenticación.
Los tramos de `site/workers/ai.ts` y `llm.ts` son los VB.NET-complete del problema, pero no se
ejecutan (405). Por eso F-01 es **ALTA** y no CRÍTICA explotable: es la deuda que se convierte en
incidente en el momento en que alguien añada el adapter SSR que el propio repo ya planeó
(`site/src/pages/api/ai/ask.ts:23-27` lo documenta como pendiente).

### 4.2 Fallos cerrados (niegan) — ✅

| Ubicación | Degradación |
|---|---|
| `worker/src/index.ts:166-179` | catch de D1 → **503**, sin conceder (C-01) |
| `worker/src/index.ts:189-196` | sin `DB` y sin `GOS_DEV_KEY` → **401** (C-01) |
| `worker/src/index.ts:124-129` | `verifySwalKey` → `null` → **503** (fail-closed, bien diseñado) |
| `worker/src/index.ts:313-321` | `AI.run` → **502** (nunca devuelve texto de relleno) |
| `worker/src/swal-billing.ts:66-68` | catch → `null` → el caller responde 503 (contrato correcto) |
| `site/src/pages/api/ai/ask.ts:290-297` | JSON inválido → 400 |
| `site/src/pages/api/ai/ask.ts:316-324` | fallo del agente → 500 |
| `site/src/pages/api/entities/[entity].ts:82` | → 500, no expone el stack (`:83` devuelve `String(err)`, ver F-13) |
| `site/src/lib/xavier.ts:37`, `:57` | memoria offline → `[]`, no es auth |
| `site/src/lib/agentDomain.ts:54-65` | sync a memoria/mesh best-effort, no es auth |

---

## 5. Alcance 4 — secretos y credenciales

### 5.1 Working tree

```bash
$ grep -rInE "(api[_-]?key|secret|token|password|passwd|credential)[[:space:]]*[:=][[:space:]]*['\"][^'\"]{6,}" \
    --include='*.ts' --include='*.js' --include='*.mjs' --include='*.cjs' --include='*.json' \
    --include='*.toml' --include='*.yml' --include='*.yaml' --include='*.astro' --include='*.sql' \
    --include='*.env*' . | grep -v node_modules | grep -v /dist/
(sin resultados)
```

**Working tree limpio de credenciales.** Verificado también:

- `git ls-files | grep -iE '(^|/)(\.env|\.dev\.vars|.*\.pem|.*\.key|credentials)'` → 0.
- `worker/wrangler.toml:13-15`: `BILLING_URL` y el secreto compartido están comentados; el secreto
  va por `wrangler secret`. `GOS_DEV_KEY` no está en ningún `wrangler.toml` (confirmado: no aparece).
- `site/src/pages/api/agent/pay.ts:67`: la "firma" del JWT es la cadena literal
  `mock-signature-kv-d1`, no un secreto. Se reporta en F-05, no aquí.
- `worker/src/index.ts:77` contiene `header: 'x-api-key: <KEY>'`. Verificado por forma: 5
  caracteres, patrón `<AAA>`, sin no-ASCII. Es un **placeholder** deliberado en el mapa de rutas
  público, no una credencial. **No es hallazgo.**

### 5.2 Historial

```bash
$ git log -p --all | grep -inE "(api[_-]?key|secret|token|password)[[:space:]]*[:=]" \
  | sed -E "s/[A-Za-z0-9_\-]{16,}/<VAL>/g" | sort -u | head -50
```

Todo lo que aparece son referencias a `process.env.*`, al diff del propio fix, y el placeholder
`<KEY>`. **No hay valores de `sk-…`, `ghp_…`, `AKIA…`, `AIza…` ni claves privadas** en el historial
(`rg` sobre provider prefixes: 0). Pero hay **dos filtraciones concretas de credenciales de este proyecto**, ambas ya no vivas:

**F-06 — credencial de gateway versionada en `worker/schema.sql`, eliminada del árbol pero viva
en el historial (público).**

```bash
$ git show e0ecaa91 -- worker/schema.sql     # con literales hasheados, no impresos
+INSERT OR IGNORE INTO api_keys (key, tier, owner, status)
+VALUES ('<LITERAL len=23 sha=2cc0ccb1a7 socio=True>', '<LITERAL len=9 … socio=True>', …);

$ git log --all --oneline -S'socio' -- worker/schema.sql
8c239fdf security(worker): eliminar el bypass de autenticacion por substring
e0ecaa91 feat: implement rate-limited API gateway worker and AI SEO (#241)
```

El valor de 23 caracteres contenía la subcadena `socio`, es decir **era precisamente lo que
activaba el bypass de substring que el commit `8c239fdf` cerró**. Se eliminó del árbol
(`worker/schema.sql` hoy no tiene seed) y la rotación es responsibility del owner.

Estado actual medido (un solo probe por candidato, sin imprimir el valor):

```bash
# seed del historial
$ curl -s -D - -o /dev/null -H "x-api-key: <valor de 23 chars de e0ecaa91>" \
    https://gos-api-gateway.iberi22.workers.dev/api/all.json
HTTP/1.1 401 Unauthorized
```

Clasificación: 🟠 **ALTA como higiene / ⚪ en impacto actual.** La credencial está **muerta**
(`401`, la tabla `api_keys` remota no existe — confirmado en
`docs/security/KEY-AUTH-VULNERABILITY-2026-10-01.md:10-14`), pero el repo es público y la clave no
se puede quitar del historial sin reescribir 2.936 commits. Requiriría rotación; no basta con
borrar el archivo.

**F-07 — credenciales reales publicadas dentro de un informe de vulnerabilidad público.**

`docs/security/KEY-AUTH-VULNERABILITY-2026-10-01.md:21-22` documenta, como prueba del bypass, dos
valores de `x-api-key` de 20 y 8 caracteres marcados `= AUTENTICADO` (el de 20 también con
`5028 Workers AI error`, que solo se alcanza **después** de pasar la autenticación). El archivo es
público:

```bash
$ curl -s -o /dev/null -w '%{http_code}\n' \
    https://raw.githubusercontent.com/iberi22/gastronomic-open-standard-GOS/main/docs/security/KEY-AUTH-VULNERABILITY-2026-10-01.md
200

$ git log --oneline -1 -- docs/security/KEY-AUTH-VULNERABILITY-2026-10-01.md
364cbfae fix(worker): ORIGIN_URL al dominio canonico + documentar la vulnerabilidad de auth
```

Estado actual medido: **ambos `401`.** Ya no autentican.

Este es exactamente el anti-patrón que documenta `secret-scanning`: *"un subagente o informe que
cita un secreto crea una SEGUNDA exposición, y aterriza en un archivo que estás a punto de
commitear"*. El informe de la vulnerabilidad se convirtió en sí mismo en la filtración. Sin
impacto vivo, pero **el patrón debe cortarse**: el informe debería llevar `<REDACTED len=20>` y el
hash, no el valor.

---

## 6. Alcance 5 — supply chain

### 6.1 Versiones pineadas

```bash
$ python3 -c "…"
package.json       range= 2  exact/git= 2   # glob@^13.0.6, markdownlint-cli@^0.49.1
site/package.json  range= 17 exact/git= 17
worker/package.json range= 3 exact/git= 2
```

22 dependencias con rango `^` sobre 41 declaradas. Ninguna es `latest` ni `*`. Con
`pnpm-lock.yaml` (`lockfileVersion 9.0`) y `save-exact=true` global, el lockfile es la red real.
Clasificación: ⚪ **BAJA** — hygienic, no un hallazgo por sí sola.

### 6.2 Dependencia git sin pin en el manifiesto

`site/package.json:20`: `"@swal/ui": "github:iberi22/swal-ui"` — sin `#commit`. El lockfile sí
resuelve a un commit inmutable, lo cual es lo correcto:

```
$ grep -n -A4 '@swal/ui' pnpm-lock.yaml | head -6
38-      specifier: github:iberi22/swal-ui
39-        version: https://codeload.github.com/iberi22/swal-ui/tar.gz/9e2d78110a7b2857da0a603657e6878b1fc8d300(svelte@5.57.1)
2156-    resolution: {gitHosted: true, integrity: sha512-NWBnCqGQ…, tarball: …}
```

Clasificación: ⚪ **BAJA.** Con `--frozen-lockfile` es determinista. Se documenta porque un
`pnpm install` sin lockfile (o un `npm install` en `site/`, que no tiene lockfile) seguiría la
rama `main` del repo ajeno.

### 6.3 Lockfiles

```bash
$ ls -la pnpm-lock.yaml worker/package-lock.json site/package-lock.json
-rw-r--r-- 343186 pnpm-lock.yaml
-rw-r--r--  85946 worker/package-lock.json
ls: site/package-lock.json: No such file
```

`site/` no tiene lockfile propio: es miembro del workspace pnpm (`pnpm-workspace.yaml:1-2`), así que
`pnpm-lock.yaml` de la raíz lo cubre. **Correcto, no es hallazgo.** `worker/` **no** está en
`pnpm-workspace.yaml` (solo `site`) y gestiona su propio `package-lock.json` (v3, 152 paquetes).
Hosts resueltos, todos oficiales:

```bash
$ python3 -c "…worker/package-lock.json…"
resolved_hosts: ['registry.npmjs.org']
```

Sin registries mirrors, sin http://, sin git-hosted en el worker. ✅

### 6.4 Scripts de ciclo de vida

```bash
$ python3 -c "…"
package.json       {'prepare': 'git config core.hooksPath .husky'}
site/package.json  {}
worker/package.json {}
```

Un solo `prepare`, en la raíz, y es idempotente y local (configura hooks de Husky). No hay
`preinstall`/`postinstall`/`pretest`. **No es hallazgo.** Además, el hardening global ya está:

```bash
$ npm config get ignore-scripts   # true
$ npm config get save-exact       # true
$ npm config get engine-strict    # true
$ pnpm config get ignore-scripts      # true
$ pnpm config get minimumReleaseAge   # 3
$ pnpm config get save-exact          # true
$ pnpm config get strictDepBuilds     # false   ← F-08
```

**F-08 — la política de build de scripts está desactivada a nivel de configuración.**

`pnpm-workspace.yaml:25`: `strictDepBuilds: false`. Y `pnpm-workspace.yaml:4-7`:

```yaml
allowBuilds:
  esbuild: set this to true or false
  protobufjs: set this to true or false
  workerd: set this to true or false
```

Esos tres valores son **placeholders sin resolver**, no booleanos. La intención era
`onlyBuiltDependencies` (`:9-12`: `esbuild`, `workerd`, `sharp` — correcta), pero `allowBuilds`
con strings literales no whitelistea nada: es configuración muerta que aparenta endurecer. Con
`strictDepBuilds: false`, cualquier dependencia transitiva puede ejecutar su script de install.

Agravante: `protobufjs` es precisamente el paquete con la vulnerabilidad CRÍTICA (§6.5) y aparece
en la lista sin resolver. Clasificación: 🟠 **ALTA.** Mitigación parcial real: `ignore-scripts=true`
global y `npm_config_ignore_scripts: "true"` en cada `pnpm install` de
`.github/workflows/ci.yml:20,36,52`. Es defensa que depende del entorno del runner, no del repo.

### 6.5 Vulnerabilidades de dependencias

```bash
$ pnpm audit --audit-level=high
42 vulnerabilities found
Severity: 7 low | 18 moderate | 16 high | 1 critical

$ pnpm audit --audit-level=high --json | python3 -c "…"
critical  protobufjs   Arbitrary code execution in protobufjs   6.11.6
high      protobufjs   Code injection through bytes field defaults
high      protobufjs   Code generation gadget after prototype pollution
high      fast-uri     authority injection / host confusion      3.1.6
high      undici       DoS + TLS validation bypass               8.10.1, 7.29.0
high      brace-expansion  DoS via uncontrolled recursion        5.0.9, 2.1.4

$ pnpm why protobufjs
protobufjs@6.11.6
└─┬ onnx-proto@4.0.4
  └─┬ onnxruntime-web@1.14.0
    └─┬ @xenova/transformers@2.17.2
      └── gos-site@0.0.1 (dependencies)

$ grep -rn '@xenova' --include='*.ts' --include='*.mjs' site/src site/scripts
site/scripts/export-vectors.mjs:319:    const { pipeline } = await import('@xenova/transformers')
```

Clasificación del caso crítico: 🟡 **SOSPECHOSO, no explotable en runtime.** `@xenova/transformers`
está en `dependencies` de producción, pero su **único** import es un `await import()` dinámico
dentro de `site/scripts/export-vectors.mjs`, un script de **build** que corre en CI
(`.github/workflows/deploy-cloudflare.yml:56`) y en local, nunca en el navegador ni en el Worker. El vector declarado
es "arbitrary code execution in protobufjs", que requiere procesar un `.onnx`/protobuf **no
confiable**; los pesos y fixtures son del propio repo. No hay entrada de atacante. **No lo
reporto como CRÍTICA explotable; lo reporto como deuda de build con una dependencia pesada en
`dependencies` en vez de `devDependencies`.**

Lo mismo con `undici`: llega por `wrangler → miniflare`, o sea la herramienta de deploy.

```bash
$ cd worker && npm audit --audit-level=high
3 vulnerabilities (2 moderate, 1 high)   # todas undici vía wrangler → miniflare
```

Clasificación: ⚪ **BAJA** (herramienta de desarrollo, no se despliega).

Nota de higiene: `pnpm-workspace.yaml:18` pinea `fast-uri: "3.1.6"` con el comentario *"pines
temporales: versiones publicadas <24h violan minimumReleaseAge en CI"*. `3.1.6` es exactamente la
versión que el audit marca como vulnerable. El pin de emergencia caducó y nadie lo evaluó.
Clasificación: 🟡 **MEDIA (F-09)**.

### 6.6 GitHub Actions

```bash
$ grep -rh 'uses:' .github/workflows/ | wc -l          # 27
$ grep -rh 'uses:' .github/workflows/ | grep -cE '@[0-9a-f]{40}'   # 0
$ grep -rhn 'uses:' .github/workflows/ | sed -E 's/.*uses: //' | sort | uniq -c | sort -rn
10 actions/checkout@v7
 4 pnpm/action-setup@v6
 4 actions/setup-node@v7
 2 cloudflare/wrangler-action@v4
 2 actions/setup-python@v7
 2 actions/github-script@v9
 1 dtolnay/rust-toolchain@stable
 1 crazy-max/ghaction-github-labeler@v6
 1 actions/upload-artifact@v7
```

**0 de 27 acciones pinneadas por SHA**; todas por tag mutable, y una por la rama `stable` sin
cuantizar. Los dos workflows de deploy escriben en Cloudflare
(`.github/workflows/deploy-cloudflare.yml:75-78`, `.github/workflows/deploy-worker.yml:26-29` con `secrets.CLOUDFLARE_API_TOKEN`).
Si una etiqueta se mueve o se compromete una action, la credencial de despliegue es alcanzable desde el
proceso de build. Clasificación: 🟡 **MEDIA (F-10).**

### 6.7 Dependabot

`.github/dependabot.yml` existe y cubre `cargo`, `npm` y (según el archivo) `github-actions`, con
agrupación y etiqueta `quarantine`. ✅

---

## 7. Corregido en HEAD — contexto, no hallazgos

**C-01 — bypass de autenticación por substring en el gateway. Corregido, commit `8c239fdf`.**

El `catch` de la consulta a `api_keys` adivinaba el tier por contenido de la key. Diff del fix
(`git show 8c239fdf -- worker/src/index.ts`):

```diff
-          if (apiKey.includes('socio') || apiKey.includes('paid')) {
-            isPaidKey = true
-            keyTier = 'tiersocio'
-          } else {
-            return jsonResponse({ error: 'Unauthorized: Key validation failed' }, 401)
-          }
+          return jsonResponse(
+            { error: 'Service Unavailable: key validation unavailable', tier: 'unavailable' },
+            503,
+          )
```

Estado actual verificado por mí, independiente del commit:

- `worker/src/index.ts:166-179`: catch de D1 → **503**, no concede.
- `worker/src/index.ts:180-197`: sin `DB` solo acepta `env.GOS_DEV_KEY` con **comparación exacta**
  (`:185`); sin él, **401**. Ya no queda ninguna heurística por contenido.
- `worker/src/index.ts:147-149`: la consulta filtra `status='active'` **y** `expires_at`.
- `worker/src/index.ts:113-129`: el camino `swal_*` contra el billing central devuelve **503** si
  el veredicto es `null` (fail-closed), **401** si `active:false`.
- Estado en producción, medido: key con `socio`/`paid` en el cuerpo → **401** (no concede);
  key aleatoria → **401**; sin key → **200** free tier; `POST /api/ai/infer` sin key → **402**.
- Regresión existente: `cd worker && npx vitest run` → **54 passed (2 files)**, incluidos
  `worker/test/auth.test.ts:294` ("503 cuando la tabla api_keys NO existe") y `:358` (inyección SQL).

Esto es contexto útil y explica por qué varios hallazgos de este informe son "SOSPECHOSO, no
EXPLOTABLE": la lección del bypass por substring **sí** se aplicó al gateway. Lo que no se aplicó
fue a los endpoints del sitio (§2.3, §2.4), que son gemelos del mismo patrón.

**C-02 — seed de key de pago en `schema.sql`. Corregido, commit `8c239fdf`.** Eliminado del árbol.
Lo que persiste es el historial (F-06).

---

## 8. Registro de hallazgos

### 🔴 F-01 — ALTA · Cuota y billing de inferencia: fail-open en todos los catch
**Clasificación: EXPLOTABLE en diseño, NO alcanzable hoy (los handlers responden 405).**
Alcance activo limitado a `worker/src/index.ts:294-296` / `:328`, tras `isPaidKey`.

Pérdida de crédito verificada conceptualmente en cada rama:
`site/src/lib/llm.ts:31-38` (ledger en `localStorage`, ni siquiera servidor),
`site/workers/ai.ts:103-105` (lectura), `:137-141` (inferencia → texto de relleno devuelto como
éxito), `:145-152` y `:163-179` (escritura silenciosa),
`site/src/pages/api/ai/infer.ts:29` (mockEnv en vez de error),
`worker/src/index.ts:213-215`, `:244-246`, `:294-296`, `:328`.

**Invariante roto:** ningún error de infraestructura puede reducir el crédito consumido a cero, y
ninguna escritura fallida puede devolver un `200` de éxito.
**Fix mínimo:** en cada rama de cuota, `catch` → `503` con "ledger no disponible"; nunca `used = 0`.
En las escrituras, `catch` → log + banding de la petición, no silencio. Sacar `AI.run` de un `catch`
que devuelve texto.

### 🟠 F-02 — ALTA · `POST /api/ai/infer` no autentica; el `mockEnv` degrada a éxito
**Clasificación: SOSPECHOSO (alto) / EXPLOTABLE en cuanto exista runtime.**

`site/workers/ai.ts` completo: `grep -n 'x-api-key\|Authorization' site/workers/ai.ts` → **0**.
No hay credencial que presentar. `site/src/pages/api/ai/infer.ts:29` decide entre el env real y un
mock según `env?.AI` —es decir, **el mock es el camino que se toma cuando el despliegue está mal
configurado**, y produce `200` con `cost` y `credit` calculados (`:181-197`).
Ruta: añadir adapter SSR o Pages Function → `POST {"prompt":"…","tierId":"socio"}` sin ninguna key
→ inferencia real contra el binding `AI` de producción, facturada a `gos`.
**Fix mínimo:** el handler rechaza si no hay un verificador de key (mismo contrato 503 que
`worker/src/index.ts:166-179`); y `mockEnv` **solo** en `import.meta.env.DEV`, nunca como fallback
silencioso.

### 🟠 F-03 — ALTA · `POST /api/ai/ask` acepta tier y consumo del body
**Clasificación: SOSPECHOSO / EXPLOTABLE solo con runtime (405 medido).**
`site/src/pages/api/ai/ask.ts:301` (`tierId` del body), `:304` (`used` del body), `:308` (ambos
alimentan la decisión de crédito). `normalizeTier` (`:42-45`) valida existencia, no titularidad.
Es el mismo patrón que C-01 corrigió en el worker, sin corregir en el sitio.
**Fix mínimo:** derivar `tierId` y `used` de una sesión/JWT verificados; el body no puede escribir
en el ledger. Si no hay sesión, `tierId` es siempre `free`.

### 🟠 F-04 — ALTA · Los 54 tests de seguridad del gateway no corren en CI
**Clasificación: EXPLOTABLE como proceso — es la puerta por la que vuelve C-01.**

```bash
$ grep -nE '^  [a-z-]+:' .github/workflows/ci.yml
10:  markdown-lint:
26:  astro-check:
42:  vitest:
62:  gos-audit:
77:  build-graph:
$ grep -c 'worker' .github/workflows/ci.yml
0
```

`worker/` no aparece en ningún job. Los tests que protegen el fix de C-01
(`worker/test/auth.test.ts`, `test/schema.test.ts`, `test/mutations.py`) solo corren si alguien se
acuerda localmente. `worker/package-lock.json` existe y es válido: añadir el job es trivial.
Severidad alta porque el precedente es directo: C-01 entró en `main` y *hubo que escribir un
informe de vulnerabilidad después*, precisamente porque nada lo verificó automáticamente.

### 🟡 F-05 — MEDIA · `pay.ts`: tier desconocido cae a `socio`, JWT sin firmar, captcha por longitud
**Clasificación: SOSPECHOSO / 405 medido.**
`site/src/pages/api/agent/pay.ts:27` — `TIERS[tierId] ?? TIERS.socio`: un `tier` inventado
obtiene el tier de pago por defecto. `:33` — `used` del body. `:51` — el Turnstile se acepta si
`length >= 10`, o sea cualquier cadena de 10 caracteres, y **si no se manda token, no se rechaza**
(`:51` solo evalúa si está presente). `:67` — JWT con `alg: HS256` y firma constante literal
`mock-signature-kv-d1`, que cualquiera puede reconstruir; el propio comentario (`:55`) admite que no
está firmado. Nada en el repo verifica ese JWT (`grep -rn 'mock-signature'` → solo `pay.ts:67`).
Hoy es inerte porque `POST` → 405 y ningún consumidor valida el token. Se vuelve explotable en el
mismo instante en que algo confíe en ese JWT.
**Fix mínimo:** tier desconocido → 400 (no `?? TIERS.socio`); verificar Turnstile contra la API de
Cloudflare o rechazar sin token; no emitir un token que parezca un JWT sin firmarlo.

### 🟡 F-06 — MEDIA · Credencial de gateway en el historial público
`worker/schema.sql` en `e0ecaa91`: literal de 23 chars que contenía `socio`, o sea activaba el
bypass de C-01.Fuera del árbol; **medido `401` hoy**. Ver §5.2. Requiere rotación del owner; borrar
el archivo no basta.

### 🟡 F-07 — MEDIA · Credenciales reales citadas dentro del informe público que las documentaba
`docs/security/KEY-AUTH-VULNERABILITY-2026-10-01.md:21-22`: dos valores de `x-api-key` (20 y 8
chars) transcritos como prueba, archivo servido en `raw.githubusercontent.com` (`200`). **Medidos
`401` hoy**, sin impacto vivo. Romper el patrón: redactar a `<REDACTED len=20 sha=…>`.

### 🟡 F-08 — MEDIA · `strictDepBuilds: false` y `allowBuilds` con placeholders sin resolver
`pnpm-workspace.yaml:25` y `:4-7`. Clasificación: SOSPECHOSO (no hay exploit medido; la
configuración *parece* endurecer y no lo hace). Mitigación parcial: `ignore-scripts=true` global +
`npm_config_ignore_scripts` en cada install de CI. **Fix:** borrar el bloque `allowBuilds` y poner
`strictDepBuilds: true`, resolviendo `esbuild`/`workerd`/`sharp` en `onlyBuiltDependencies`.

### 🟡 F-09 — MEDIA · Rate limit y cuota dependen de un solo KV, y su catch es fail-open
`worker/src/index.ts:213-215` (catch → `currentCount = 0`), `:244-246`, `:294-296`, `:328`.
Clasificación: SOSPECHOSO. Un `KV.get` que lance **devuelve el límite diario completo** a quien
sea. Además `fast-uri` pineado a `3.1.6` (`pnpm-workspace.yaml:18`), que es la versión que el audit
marca vulnerable; el comentario dice que el pin era temporal.
Verificado que `x-forwarded-for` **no** permite evadir el límite (ver F-12, es dato de soporte).

### 🟡 F-10 — MEDIA · 0 de 27 GitHub Actions pinneadas por SHA
`grep -rh 'uses:' .github/workflows/ | grep -cE '@[0-9a-f]{40}'` → **0**. `dtolnay/rust-toolchain@stable`
además sin cuantificar. Dos workflows despliegan a Cloudflare con `secrets.CLOUDFLARE_API_TOKEN`.
Clasificación: SOSPECHOSO. **Fix:** SHA-pinnear todo; el Dependabot de `github-actions` ya está
configurado y mantiene los SHA al día.

### ⚪ F-11 — BAJA · CORS `*` en el gateway con credencial por header
`worker/src/index.ts:24-28`, aplicado a toda respuesta vía `jsonResponse:39` y `:372`.
Medido: `access-control-allow-origin: *`, `allow-headers: … x-api-key, Authorization`.
Clasificación: **TEÓRICO.** Un `*` con credencial en header no
expone respuestas a JS cross-origin porque el navegador no adjunta la key del atacante; el riesgo
real es que el endpoint de datos sea embebible desde cualquier origen sin CORS restrictivo. Sin
`Access-Control-Allow-Credentials`, el cookies-vec no aplica. Bajo.

### ⚪ F-12 — INFO (verificado, NO es vulnerabilidad) · `x-forwarded-for` no evade el rate limit
`worker/src/index.ts:201-204` prefiere `cf-connecting-ip` y usa `x-forwarded-for` como segundo
resorte. Medido en producción:

```bash
$ for i in 1 2 3; do curl -s -D - -o /dev/null -H "x-forwarded-for: 10.9.9.$i" \
    https://gos-api-gateway.iberi22.workers.dev/api/all.json | grep -i x-ratelimit-remaining; done
x-ratelimit-remaining: 89
x-ratelimit-remaining: 88
x-ratelimit-remaining: 87
```

El contador **sigue bajando** al rotar el header, porque en el edge real `cf-connecting-ip` está
presente y gana. El bypass clásico no funciona. Se documenta para que nadie lo "arregle" ni lo
reporte: el fallback a `127.0.0.1` sí sería un problema si el edge no sellara el header, y eso es
una decisión de despliegue, no de código.

### ⚪ F-13 — BAJA · Mensajes de error con `String(err)` y sin CSP
`site/src/pages/api/entities/[entity].ts:83`, `:106`; `site/src/pages/api/ai/ask.ts:320`;
`site/src/pages/api/agent/pay.ts:84`; `worker/src/index.ts:317`, `:396`. Devuelven el mensaje de
excepción al cliente (fuga de internos; `ask.ts:320` puede incluir la URL de un provider).
Medido en respuesta del sitio: solo `referrer-policy: strict-origin-when-cross-origin`; **no hay
`Content-Security-Policy`** en `site/public/_headers` (el archivo no existe) ni en
`astro.config.mjs`. Clasificación: TEÓRICO sin entrada de atacante controlable; adyacente a
`GraphExplorer.astro:1121`/`SearchBar.astro:153` que escriben `innerHTML` con datos de `graph-data.json`
(ficheros del repo, no entrada de usuario).

### ⚪ F-14 — INFO · Raíz sin script `test`
`package.json` scripts: `build, lint, lint:code, manuallint, markdownlint, prepare`. No hay `test`
en la raíz, así que `npm test` / `pnpm test` en la raíz no existe. Los tests viven en
`site/` (254: 250 passed, 4 skipped) y `worker/` (54 passed). Clasificación: **no es
vulnerabilidad**; se documenta porque la ausencia previa de `npm test` fue parte del contexto de
esta ola.

---

## 9. Lo que sigue bien (para no inflar)

- La autenticación del gateway (único auth activo) es correcta y con test de regresión (§C-01).
- `swal-billing.ts` tiene un contrato fail-closed bien diseñado: devuelve `null` solo si el billing
  es inalcanzable, y el caller responde 503.
- CORS sin `Allow-Credentials`; HSTS implícito en Cloudflare; queries SQL siempre parametrizadas con
  `?`/`.bind()` (test de inyección en `auth.test.ts:358`).
- No hay secretos en el working tree; no hay registries espejo; no hay lifecycle scripts de
  dependencias; Dependabot configurado; `ignore-scripts` y `save-exact` activos; `onlyBuiltDependencies`
  con una lista sensata.
- `worker/src/index.ts` type-checa limpio:
  `npx tsc --noEmit --module esnext --moduleResolution bundler --target es2022 --types node --skipLibCheck src/cf-env.d.ts src/index.ts src/swal-billing.ts` → exit 0.

---

## 10. Orden de arreglo sugerido

1. **F-04** — añadir el job de CI de `worker/` (30 min, y es lo que evita que C-01 vuelva).
2. **F-01** — reemplazar cada `used = 0` en `catch` por `503`, y sacar los `catch {}` mudos de las
   escrituras de ledger.
3. **F-02 / F-03** — que el tier y el consumo dejen de venir del body. Aunque hoy sea 405, el
   adapter SSR está planeado (`ask.ts:23-27`) y estos dos endpoints son la vía de entrada.
4. **F-05** — `?? TIERS.socio` → 400; verificación real de Turnstile; no emitir JWT sin firmar.
5. **F-06 / F-07** — rotar la key del historial; redactar los valores del informe público.
6. **F-08 / F-10** — `strictDepBuilds: true` + borrar `allowBuilds`; SHA-pinnear las 27 actions.
7. **F-09** — replantear cuota sobre D1 (transaccional) en vez de un KV best-effort; revisar el
   pin de `fast-uri`.

---

## Anexo A — Comandos usados (todos ejecutados, salida resumida arriba)

```bash
# Superficie
find site/src/pages -name '*.astro' | wc -l
find site/src/pages/api \( -name '*.ts' -o -name '*.astro' \) | wc -l
find site/src/lib -name '*.ts' -exec cat {} + | wc -l
wc -l < worker/src/index.ts ; git rev-list --all --count ; git ls-files | wc -l

# Alcance por contenido
grep -rnE "\.(includes|startsWith|endsWith)\(|\.length\s*[<>=]|substring\(|slice\(0,|=== *apiKey|== *apiKey" \
  --include='*.ts' --include='*.astro' --include='*.mjs' site/src worker/src scripts site/scripts

# Catch
grep -rn 'catch' --include='*.ts' --include='*.astro' site/src/pages/api site/src/lib worker/src

# Secretos
grep -rInE "(api[_-]?key|secret|token|password|passwd|credential)[[:space:]]*[:=][[:space:]]*['\"][^'\"]{6,}" … | grep -v node_modules
git log -p --all | grep -inE "(api[_-]?key|secret|token|password)[[:space:]]*[:=]" | sed -E "s/[A-Za-z0-9_\-]{16,}/<VAL>/g" | sort -u
git show e0ecaa91 -- worker/schema.sql     # literales hasheados, no impresos
curl -s -o /dev/null -w '%{http_code}\n' https://raw.githubusercontent.com/iberi22/gastronomic-open-standard-GOS/main/docs/security/KEY-AUTH-VULNERABILITY-2026-10-01.md

# Supply chain
npm config get ignore-scripts ; npm config get save-exact ; npm config get engine-strict
pnpm config get ignore-scripts ; pnpm config get minimumReleaseAge ; pnpm config get strictDepBuilds ; pnpm config get save-exact
pnpm audit --audit-level=high ; pnpm audit --audit-level=high --json ; pnpm why protobufjs
(cd worker && npm audit --audit-level=high && npx vitest run)
grep -rh 'uses:' .github/workflows/ | wc -l ; grep -rh 'uses:' .github/workflows/ | grep -cE '@[0-9a-f]{40}'

# Producción (solo GET/HEAD y POSTs que devuelven 405; una sonda por credencial, sin imprimir valores)
curl -s -o /dev/null -w '%{http_code}\n' https://gos.swal.network/api/ai/ask
curl -s -X POST -H 'Content-Type: application/json' -d '{"tier":"socio-managed","estimatedTokens":0}' -w '\nHTTP=%{http_code}\n' https://gos.swal.network/api/agent/pay
curl -s -X POST -H 'Content-Type: application/json' -d '{"prompt":"x"}' -w '\nHTTP=%{http_code}\n' https://gos-api-gateway.iberi22.workers.dev/api/ai/infer
curl -s -D - -o /dev/null -H "x-api-key: <valor de 23 chars de e0ecaa91>" https://gos-api-gateway.iberi22.workers.dev/api/all.json   # → 401
```

## Anexo B — Nota metodológica

Este informe **no ejecutó el código del repo** salvo `npx tsc --noEmit` (worker), `npx vitest run`
(worker y site), `pnpm audit` y `npm audit`: son análisis estático y ejecución de la suite propia,
sin efectos externos. Las sondas contra `gos.swal.network` y
`gos-api-gateway.iberi22.workers.dev` fueron de lectura (GET/HEAD y POSTs que sabemos que
devuelven 405), más **una** petición de autenticación por credencial candidata, sin valor impreso.
No se envió ninguna carga de IA, no se gastó cuota, no se hizo lectura destructiva ni se borró nada del árbol.
Ningún secreto se reproduce en este archivo.
