# Auditoría de gates: CI, SEO, evidencia y build

**Fecha:** 2026-10-02 · **Repo:** `gastronomic-open-standard-GOS` · **Rama:** `main`
**HEAD medido:** `035e89b7` (baseline de la matriz) → el árbol avanzó a `2efdc5ea` durante la auditoría por otro proceso (§7).
**Alcance:** demostrar que cada gate MUERDE. Un gate nunca visto fallar es decorado, no protección.

---

## 1. Matriz base (estado limpio, HEAD `035e89b7`)

| # | Gate | Comando | RC | Salida real (recortada) |
|---|---|---|---|---|
| 1 | Lint | `pnpm run lint` | **0** | `Checked 154 files… Found 8 warnings. Found 17 infos.` + `Lint finished. All passed.` |
| 2 | Tipos site | `cd site && pnpm exec astro check` | **0** | `Result (114 files): - 0 errors - 0 warnings - 154 hints` |
| 3 | Tests site | `cd site && npx vitest run` | **0** | `Test Files 21 passed (21) · Tests 242 passed \| 4 skipped (246)` |
| 4 | Tests worker | `cd worker && npx vitest run` | **0** | `Test Files 2 passed (2) · Tests 54 passed (54)` |
| 5 | Build | `cd site && pnpm exec astro build` | **0** | `1106 page(s) built in 22.97s · Complete!` |
| 6 | SEO | `cd site && node scripts/verify-sitemap-seo.mjs` | **0** | tabla completa + `OK: todos los invariantes pasan` |

Detalle del gate 6 en HEAD:

```
HTML totales en dist                      : 1106
  Paginas noindex (excluidas del sitemap) : 516
  URLs en sitemap = indexables            : 590
  URLs unicas                             : 590
  loc de sitemap sin / final              : 0
  Duplicados en sitemap                   : 0
  xhtml:link en sitemap                   : 0
  loc de sitemap fuera del dominio canonico: 0
  Paginas HTML con hreflang               : 0
  Canonical correcto (sin pages.dev)      : 1106
  recipeInstructions                      : 443
  URLs huerfanas (sin fichero en dist)    : 0
  html lang != es                         : 0
```

**Los 6 gates están verdes en HEAD.** Eso no dice nada sobre si sirven. Eso es lo que miden los controles negativos.

---

## 2. Controles negativos — los tres números por gate

Todos con: **RC base → RC con la mutación → RC restaurado.**
Regla aplicada: tras mutar `dist/` se regenera siempre (`rm -rf dist .astro && pnpm exec astro build`), y tras mutar la fuente se restaura con `git checkout -- <ruta>` en el mismo paso.

| Gate | Mutación | RC base | RC mutado | RC restaurado | ¿Muerde? |
|---|---|---|---|---|---|
| SEO | canonical incorrecto (`pages.dev` en un HTML de `dist/`) | 0 | **1** | 0 | ✅ |
| SEO | un `hreflang` reintroducido | 0 | **1** | 0 | ✅ |
| SEO | host viejo `pages.dev` dentro de `dist/sitemap.xml` | 0 | **1** | 0 | ✅ |
| SEO | ruta huérfana en `dist/sitemap.xml` | 0 | **1** | 0 | ✅ |
| SEO | *contrafalso*: misma corrupción en `site/public/sitemap.xml` | 0 | **0** | — | ⚠️ por diseño (ver §3) |
| Auth worker | reintroducir el bypass `/socio\|paid/i` en `worker/src/index.ts` | 0 | **1** | 0 | ✅ |
| Build/esquema | `studies:` roto (YAML inválido) | 0 | **1** | 0 | ✅ |
| Build/esquema | `year: 'not-a-year'` (YAML válido, tipo incorrecto) | 0 | **0** | — | 🔴 **NO** (§5) |
| Evidencia | DOI inexistente `10.9999/esto-no-resuelve-jamás-0001` | 0 | **0** | 0 | 🔴 **NO** (§4) |
| Evidencia | `doi_status: 'unverified'` (degradar verificado) | 0 | **0** | 0 | 🔴 **NO** (§4) |
| Lint | markdown malformado en `dishes/` | 0 | **1** | 0 | ✅ |

### Detalle de los que sí muerden

**SEO — canonical** (`dist/index.html`):
```
FAIL:
  - Canonical correcto (sin pages.dev): 1105 (esperado 1106)
Primeras canonical incorrectas:
    / -> https://gos-site.pages.dev/
```

**SEO — hreflang**:
```
FAIL:
  - Paginas HTML con hreflang: 1 (esperado 0)
```

**SEO — host viejo en el sitemap** (`dist/sitemap.xml`, NO `public/`):
```
FAIL:
  - loc de sitemap fuera del dominio canonico: 1 (esperado 0)
```

**SEO — ruta huérfana** (`dist/sitemap.xml`):
```
FAIL:
  - URLs en sitemap = indexables: 591 (esperado 590)
  - URLs huerfanas (sin fichero en dist): 1 (esperado 0)
Primeras URLs huerfanas:
    https://gos.swal.network/ruta-que-no-existe/
```
Esta es la única que dispara **dos** invariantes a la vez: el conteo y la existencia en disco.

**Auth del worker** — el más importante. Sustituí el fallback `GOS_DEV_KEY` por el bypass histórico por substring:
```ts
if (/socio|paid/i.test(apiKey)) { isPaidKey = true; keyTier = 'tiersocio' }
```
```
FAIL  test/auth.test.ts > bypass por substring: la clave de la CVE >
      > no concede tier de pago a una key de substring cuando NO hay binding DB
AssertionError: expected [ 401, 503 ] to include 200
 Test Files  1 failed | 1 passed (2)
      Tests  1 failed | 53 passed (54)
```
El bypass de la CVE es detectado por la suite. md5 de `src/index.ts` idéntico antes y después (`475d23f7…`).

---

## 3. La trampa del falso verde (control negativo del control negativo)

El gate SEO lee **`site/dist/`**, no `site/public/`. Ambos ficheros se llaman `sitemap.xml`.

Para probarlo ensucié `site/public/sitemap.xml` con la corrupción **completa** que en Control C síDetectó (todo el dominio a `pages.dev` + una loc huérfana):

```
E MUT RC = 0        <-- falso verde
loc de sitemap fuera del dominio canonico : 0
URLs huerfanas (sin fichero en dist)     : 0
OK: todos los invariantes pasan
```

**Conclusión operativa:** mutar el sitemap equivocado produce un verde limpio y silencioso. Cualquiera que mida este gate sobre `public/` (o que tenga `dist/` de un build viejo) está midiendo decorado. `public/sitemap.xml` y `dist/sitemap.xml` **no están versionados** (`git ls-files` vacío para ambos): son artefactos, y por eso el error es fácil de cometer y difícil de detectar después.

`public/sitemap.xml` se restauró regenerándolo desde la fuente (`node scripts/generate-sitemap.js` → `590 URLs`, 0 ocurrencias de `pages.dev`).

---

## 4. 🔴 HALLAZGO DE PRIMER NIVEL: la evidencia científica NO está gateada

**No existe ningún gate, en ningún sitio, que compruebe que cada DOI publicado resuelve.**

Búsqueda exhaustiva en `.github/`, `site/scripts/`, `scripts/` y los tests: los únicos que mencionan DOI son
`scripts/studies_updater.py` (escribe un bloque YAML), `site/src/lib/seo.ts` y `site/scripts/schedule-jules-research.mjs` (que solo lo *pide* en un prompt a un agente). **Ningún script verifica resolución.** Los 18 DOI publicados viven en frontmatter markdown y salen a producción sin comprobación automática.

Peor: el código **dice que existe** el verificador. Dos comentarios apuntan a `scripts/verify_dois.py`:
- `site/src/pages/api/evidence.json.ts:65` — `// Ver scripts/verify_dois.py, que es quien lo marca.`
- `site/src/content.config.ts:136` — `// La escribe scripts/verify_dois.py.`

```
$ ls -la scripts/verify_dois.py
ls: no se puede acceder a 'scripts/verify_dois.py': No such file or directory
$ find . -name "verify_doi*" -not -path "*/node_modules/*"
(nada)
```
**El comentario documenta un gate que no existe.** El mecanismo `doi_status` está implementado de extremo a extremo (schema Zod lo acepta, el endpoint lo filtra, y `unverified_verified` está previsto) pero **nadie escribe jamás ese campo**: los catálogos `research/*_studies.json` no lo incluyen, así que los 61 estudios publicados salen todos con `verified` ausente (= contados como verificados).

### Control negativo — DOI inexistente

Sustituí el DOI real de `a-a.md` por `10.9999/esto-no-resuelve-jamás-0001`:

| Gate | RC base | RC mutado | RC restaurado |
|---|---|---|---|
| `astro check` | 0 | **0** | 0 |
| `vitest` site | 0 | **0** | 0 |
| `astro build` | 0 | **0** | 0 |
| `verify-sitemap-seo.mjs` | 0 | **0** | 0 |

Y el DOI falso **llegó a producción, marcado como verificado**:
```
PUBLICADO COMO EVIDENCIA: vitamin a-a doi= 10.9999/esto-no-resuelve-jamás-0001
                          verified= AUSENTE(=>cuenta como verificado)
```
Aparece en `dist/api/evidence.json` **y renderizado en `dist/index.html`**, que es la home. Un agente que lea `/api/evidence.json` recibe una referencia inexistente presentada bajo el contrato literal del endpoint: *«Evidencia científica con DOI verificado. Cada doi resuelve en Crossref.»* Ese contrato es falso y nada lo verifica.

### Control negativo — degradar `doi_status`

Inyecté `doi_status: 'unverified'` en el mismo estudio (DOI real, intacto):

| Gate | RC base | RC mutado | RC restaurado |
|---|---|---|---|
| `astro check` | 0 | **0** | 0 |
| `astro build` | 0 | **0** | 0 |
| `verify-sitemap-seo.mjs` | 0 | **0** | 0 |

El único efecto observable es **pérdida silenciosa de datos**, no un fallo:
```
studies_with_doi : 61 -> 60
entries_with_studies: 47 -> 46
vitamina a-a presente todavia? False
```
El estudio desaparece del índice público de evidencia y **no hay ningún gate que proteste**. Peor que el DOI falso: el DOI falso al menos es visible; aquí un estudio real desaparece y el pipeline entero queda verde.

### Confirmación externa

Medido por separado durante esta auditoría: el DOI `10.9999/esto-no-resuelve-jamás-0001` devuelve **404** en `doi.org`; el real `10.1002/14651858.CD008524.pub4` devuelve **302** a la editorial. La corrupción es detectable trivialmente con una petición HTTP — simplemente nadie la hace.

### Nota de método (y Autorrevisión)

Una primera versión de este control mutó `site/src/content/vitamins/a-a.md` y dejó el DOI falso en la fuente más tiempo del debido. Fue señalada como mala ubicación y es un fallo real: `site/src/content/` es la FUENTE, el repo es público, y la regla dura del proyecto es cero DOI inventados — un DOI de relleno en el árbol es el daño más caro posible para la credibilidad del estándar. Restaurado inmediatamente con `git checkout -- site/src/content/vitamins/a-a.md` y verificado en tres puntos (diff vacío, línea 18 con el DOI real, `dist/` reconstruido sin el DOI falso).

La corrección de método, ya aplicada en los controles G, H y H2: **mutar sobre `dist/` siempre que el gate lea `dist/`** (regenerable, `rm -rf dist .astro && pnpm exec astro build`), y cuando haya que mutar la fuente, restaurar con `git checkout --` en el mismo paso antes de seguir, comprobando `git status --porcelain -- <ruta>`.

---

## 5. 🔴 HALLAZGO DE PRIMER NIVEL: el esquema de contenido solo se valida en la capa equivocada

El gate de build/esquema muerde con YAML **inválido**, pero no con tipos **incorrectos**.

Control H — `studies: 'esto-no-es-un-array'` (rompe el YAML):
```
astro check : RC 1   → bad indentation of a mapping entry (a-a.md:14:2)
astro build : RC 1
```
✅ Correcto: el error es de sintaxis y salta antes de cualquier validación de tipo.

Control H2 — `year: 'not-a-year'` (YAML perfectamente válido, `z.number()` incumplido):
| Gate | RC base | RC mutado | RC restaurado |
|---|---|---|---|
| `astro check` | 0 | **0** | 0 |
| `astro build` | 0 | **0** | 0 |
| `verify-sitemap-seo.mjs` | 0 | **0** | 0 |

🔴 **El gate no detecta la corrupción.** `astro build` ejecuta `astro check` como parte de su script (`"build": "pnpm run prebuild && astro check && astro build"`), así que ambos comparten la misma debilidad: **validan la forma del frontmatter, no los tipos de los valores.** Un `year: 'not-a-year'` o un `evidence_level` corrupto llegan al HTML publicado sin que nada lo note.

Esto es coherente con lo ya documentado en `delivery-verification-gate`: *«exit codes cover crashes, not wrong numbers»*. Aquí el RC es 0 y el número además es *incorrecto*.

---

## 6. 🔴 CI ejecuta menos que un humano — el pipeline puede desplegar sin gates

### 6.1 `deploy-cloudflare.yml` (el workflow que despliega a producción)

Su única cadena de gate es: **generate → astro build → verify-sitemap-seo → deploy**. No hay un solo test.

| Lo que corre un humano antes de un deploy | ¿En `deploy-cloudflare.yml`? |
|---|---|
| `pnpm run lint` (biome + markdownlint + manual_lint) | ❌ **NO** |
| `astro check` por separado | ⚠️ solo implícito dentro de `build` |
| `vitest` de site (242 tests) | ❌ **NO** |
| `vitest` de worker (54 tests) | ❌ **NO** |
| `astro build` | ✅ sí |
| `verify-sitemap-seo.mjs` | ✅ sí |

**Cuatro de los seis gates no se ejecutan en el camino de despliegue.** El workflow dispara `push` a `main` con `paths: site/**, dishes/**, ingredients/**, tips/**, scripts/**` — o sea, un cambio en cualquier `.astro` o script de generación llega a Cloudflare Pages sin pasar por un solo test.

Peor: **`astro build` corre, pero no es `pnpm run build`.** El script `build` de `site/package.json` es `pnpm run prebuild && astro check && astro build`, pero el workflow invoca `pnpm exec astro build` directamente, saltándose el `prebuild`. El propio CI de Cloudflare reimplementa la lista de `generate` a mano (10 scripts) y es una copia que ya se desincronizó: el `package.json` tiene 10 pasos en `generate` y el workflow lista los mismos 10, pero cualquier cambio futuro en uno no obliga al otro.

### 6.2 `deploy-worker.yml` — el peor caso: **cero gates**

```yaml
jobs:
  deploy-worker:
    steps:
      - uses: actions/checkout@v7
      - name: ⚡ Deploy API Gateway Worker
        uses: cloudflare/wrangler-action@v4
        with:
          command: deploy
```

Ni `pnpm install`, ni `typecheck`, ni `vitest`. **Los 54 tests de `worker/test/auth.test.ts` — la red que impide exactamente el bypass que verifiqué en §2 — no se ejecutan nunca en el camino de despliegue del worker.** El gateway que autentica claves de pago se despliega sin que se compruebe ni que los tests corran, y sin siquiera instalar dependencias.

`ci.yml` sí corre `astro-check`, `vitest` y `lint`, pero **ninguno de esos jobs bloquea a `deploy-cloudflare.yml` ni a `deploy-worker.yml`**: no hay `needs:`, ni `workflow_run`, ni nada que couple el gate con el deploy. Son pipelines paralelos e independientes. Un deploy disparado por `workflow_dispatch` no pasa por ningún gate, siquiera.

### 6.3 Gates declarados pero decorativos

`ci.yml` tiene `# TODO(wave-C.05): python3 scripts/audit_content.py --check` — un gate de contenido escrito y nunca habilitado. Y el job `gos-audit` lleva `continue-on-error: true`, que en la práctica lo convierte en informativo: nunca puede romper el pipeline. El `build-graph` depende de él (`needs: [astro-check, vitest, gos-audit]`), así que hereda esa puerta weakened sin que se note: un `needs:` que espera un job que nunca puede fallar.

---

## 7. Estado del árbol y concurrencia

Durante la auditoría **otro proceso terminó commits y dejó archivos sin versionar** en el mismo repo:

```
2efdc5ea docs: plan de auditoria por fases para la ola del 2026-10-02
```

y creó `site/src/lib/robustez.audit.test.ts` (untracked) y `docs/audit/ROBUSTEZ-AGENTE-PWA.md`. **Ninguno de los dos es mío**; mi isla de escritura era únicamente este informe.

**Efecto medido sobre los datos de esta auditoría:** en el momento de correr el control F, `astro check` devolvió RC=1 con 2 errores. **No eran de mi mutación** — los verifiqué línea por línea:
```
src/lib/robustez.audit.test.ts:139:5 - error ts(2578): Unused '@ts-expect-error' directive.
src/lib/robustez.audit.test.ts:110:5 - error ts(2578): Unused '@ts-expect-error' directive.
```
Ambas pertenecen al archivo del agente concurrente. Por eso los tres números del §2 se reportan contra el baseline de HEAD `035e89b7`, donde `astro check` da 0 errores, y por eso el conteo de vitest de site sube de 242 a 250 durante la sesión (su archivo aporta 8 tests): **el gate RC=0 con el DOI falso se midió con 250 tests, no con 242, y aun así no lo detectaron.**

Consecuencia sobre el gate de lint: al cierre, `pnpm run lint` da **RC=1**, no 0. Aislado: el único error real (`lint/style/noNonNullAssertion`, que en biome es *error* y no warning) está en `robustez.audit.test.ts:102`, archivo ajeno:
```
site/src/lib/robustez.audit.test.ts:102:19 lint/style/noNonNullAssertion
Checked 1 file in 22ms. Found 1 error.
```
En HEAD `035e89b7` el lint da RC=0 (154 ficheros, 8 warnings, 17 infos). **El RC=1 actual es del trabajo concurrente, no una regresión mía.**

---

## 8. Veredicto

**Los gates de SEO y de auth del worker muerden, y están probados.** Los cuatro controles SEO y el control del bypass del worker cambiaron el RC de 0 a 1 y volvieron a 0 al restaurar. La suite de auth del gateway es una red real: no es decorado.

**Dos agujeros de primer nivel, ambos medidos con tres números:**

1. **La evidencia científica no está gateada en absoluto.** No existe el script que dos comentarios prometen (`scripts/verify_dois.py`). Un DOI inventado pasa build, SEO y los 250 tests con RC=0 y **se publica en la home como verificado**, bajo un endpoint que afirma que cada DOI resuelve. Degradar `doi_status` tampoco lo detecta y borra un estudio real del índice en silencio. Es el agujero central: un estándar que se define por la calidad de su evidencia es el único que publica evidencia sin verificar.

2. **El pipeline puede desplegar lo que nadie gateó.** `deploy-worker.yml` despliega el gateway de autenticación sin instalar dependencias ni ejecutar un test; `deploy-cloudflare.yml` se salta lint y los 242 tests de site; y los jobs de `ci.yml` no bloquean a ninguno de los dos.

**Orden de arreglo sugerido:** (1) crear el verificador de DOI que el código ya referencia y engancharlo como paso bloqueante antes del deploy — sin eso, la afirmación del endpoint es propaganda; (2) añadir `pnpm install` + `vitest` + `typecheck` a `deploy-worker.yml` y los gates que faltan a `deploy-cloudflare.yml`; (3) acoplar deploy y gates con `needs:`/workflow_run; (4) validar tipos del frontmatter de contenido en la capa que hoy solo valida forma.

---

## 9. Prueba de restauración

```
$ git status --porcelain -uall
?? docs/audit/ROBUSTEZ-AGENTE-PWA.md
?? site/src/lib/robustez.audit.test.ts
```

Las 2 líneas restantes son **ambos archivos del agente concurrente** (§7), no míos: mi único archivo creado es este informe, `docs/audit/GATES-CI.md`. **Ningún archivo versionado quedó modificado**: `git diff` está vacío, y las fuentes que muté (`site/src/content/vitamins/a-a.md`, `worker/src/index.ts`, `dishes/**`) están restauradas a HEAD con `git checkout --` y verificadas una por una (`git status --porcelain -- <ruta>` vacío en cada caso). `dist/` y `public/sitemap.xml` son artefactos no versionados y quedaron regenerados desde la fuente, con el verifier SEO en RC=0 y `studies_with_doi: 61`.