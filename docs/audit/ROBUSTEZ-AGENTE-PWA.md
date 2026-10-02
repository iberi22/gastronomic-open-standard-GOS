# Auditoría adversarial de robustez — agente IA + PWA/vault

**Rama:** `main` · **HEAD:** `035e89b7` · **Fecha:** 2026-10-02
**Alcance:** revisión de lo entregado por la ola anterior de subagentes, asumiendo que sus
reportes son incorrectos hasta medirlos. Cifras pegadas con su comando.
**Método:** lectura + ejecución real + control negativo por mutación (3/3 detectados).

> Este informe es de **hallazgos con evidencia**, no de regresión. A diferencia de la ola
> previa, aquí no hay ninguna afirmación de "verde" que no tenga la salida del comando pegada
> debajo. Donde no medí, lo digo explícitamente.

---

## 0. TL;DR — veredicto por entregable

| Entregable | Tests | Veredicto |
|---|---|---|
| `worker/` (fix de auth, schema, tests) | **54/54 verdes** | Correcto. Sin hallazgos de primer nivel. |
| `site/src/lib/llm.ts` (grounding) | **41/41 verdes**, 3 contratos con detección por mutación confirmada | La lógica de citas es sólida. **El peaje por tier no existe.** |
| PWA / vault (`sw.js`, `indexeddb.ts`, `offline-seed.ts`) | **16/16 verdes** en esquema, resto verde | **Códigos muertos + cuelgue silencioso sin manejar.** |

**Medición de baseline (comandos exactos):**

```
$ cd site && npx vitest run
 Test Files  21 passed (21)
      Tests  242 passed | 4 skipped (246)

$ cd worker && npx vitest run
 Test Files  2 passed (2)
      Tests  54 passed (54)
```

**No hay tests que declararan verdes y ahora fallen.** Los "35 de 54 fallando" que motivó
esta auditoría no se reproducen: el árbol está sano y `package.json` declara correctamente
sus dependencias. Ver §6 — el problema real es otro, y es peor que los tests rojos, porque
es invisible a la suite.

---

## 1. HALLAZGOS DE PRIMER NIVEL

### 1.1 — CRÍTICO · El peaje por tier se falsea desde el body del cliente

`site/src/pages/api/ai/ask.ts:301-308`:

```ts
const tierId = normalizeTier(body.tierId)      // ← del body
const used = Number.isFinite(Number(body.used)) ? Number(body.used) : 0   // ← del body

const sources = await collectSources(question)
const data = await askGrounded({ question, sources, tierId, used })
```

Traza completa del flujo:

1. `normalizeTier()` valida el string contra `TIERS` — pero **solo** que el string sea uno
   de los tres ids conocidos. No hay sesión, ni cookie, ni token, ni nada que ate el tier a
   una identidad. `s in TIERS ? s : 'free'`.
2. `used` se parsea del body con `Number()`. **No hay clamp a `>= 0`**, ni validación de
   rango, ni lectura server-side del ledger real.
3. Ese par se pasa tal cual a `askGrounded()` → `creditStatus(used, tierId)` y
   `canAffordInference()`. La decisión de cortar o no se toma **solo** con esos dos números
   que eligió el cliente.
4. El comentario del propio código lo admite y lo justifica
   (`ask.ts:302-304`): *"El crédito lo lee llm.ts de su ledger (localStorage → D1 en prod).
   Aquí no se inventa: si no viene en el body, cero."* — pero **no hay ledger server-side que
   lo valide**. El único ledger real (`localStorage`, `llm.ts:33-38`) es cliente también.

**Medido** (`site/src/lib/robustez.audit.test.ts`, 8/8 verdes):

- `used: -1000000000` es aceptado tal cual. `creditStatus(-1e9, 'socio').remaining` =
  **1 000 050 000** tokens. `canAffordInference(10_000_000, -1e9, 'socio')` = **`true`**.
  Un crédito negativo produce un saldo virtualmente infinito.
- Un cliente `free` que envía `{"tierId":"socio-managed"}` alcanza la rama de inferencia: el
  test confirma que **el LLM sí es invocado** (`llmWasCalled === true`) y que el ledger que se
  le asigna es el del tier más caro (`credit.limit === 50_000`, `used === 0`). Sin pagar nada.
- `used: "abc"` → 0; `used: "49999"` → 49999. El campo acepta strings numéricos.

**Impacto:** el corte de cuota no es un control de acceso, es un parámetro de la petición. Un
cliente anónimo puede (a) saltearse cualquier agotamiento de crédito, (b)ejecutar inferencia
en un tier que no compró, (c)inflar su propio `used` para no gastar, o (d)declarar un
`used` negativo. El coste real cae en la cuenta de SWAL.

**Contexto atenuante, medido:** `ask.ts:23-27` declara que GOS despliega `output:'static'` sin
adapter SSR, así que en el deploy real de Cloudflare Pages este POST **devuelve 405**. El
endpoint no está expuesto hoy. **Pero** (a) el archivo de producción es este, y en cuanto se
añada el adapter el bug queda vivo sin que nada avise; (b) la misma lógica de `tierId`
controlada por el cliente **sí** está en el camino que sí funciona hoy: `fetchGroundedAnswer()`
(`llm.ts:604`) manda `tierId` en el body del POST, y `AgentAsk.svelte` resuelve en el
navegador. Si algún día el navegador delega el tier, el cliente vuelve a decidir su peaje.

**Arreglo requerido** (no aplicado — este encargo no edita producción): el tier debe derivarse
de una sesión autenticada en el servidor, nunca del body; y `used` debe ignorarse
completamente en el endpoint, leyéndose de un ledger server-side (D1/KV).

### 1.2 — ALTO · `offline-seed.ts` es código muerto: nadie lo llama

Medido:

```
$ grep -rn "offline-seed\|seedFromStaticBuild\|isSeeded" src/ public/ scripts/ \
    | grep -v "src/lib/offline-seed" | grep -v "\.test\.ts"
(fin busqueda)
```

**Cero** llamadores en producción. El módulo nunca se ejecuta. Todo lo que la ola anterior
reportó como "el seed funciona / las fuentes existen" está verificado por tests que importan
el módulo directamente, nunca por el producto. El vault (`RecipeVault.svelte:20,41`) usa
`IndexedDBStorageAdapter` pero **nunca** siembra: la base arranca vacía y el vault no tiene
contenido offline aunque la PWA "funcione".

Los tests de `offline-seed.test.ts` pasan (verde) y no lo detectan — uno de ellos incluso
afirma lo contrario en su nombre: *"isSeeded consulta el store correcto"*. Ver §1.3.

### 1.3 — ALTO · `isSeeded()` consulta un store inexistente y siempre devuelve `false`

`offline-seed.ts:88` llama `adapter.list('recipe', 'seed-default')` — **singular**. Pero
`STORES` en `indexeddb.ts:9-18` define `'recipes'` (plural). `db.transaction('recipe')` lanza
`NotFoundError` siempre.

Medido con IndexedDB real vía `fake-indexeddb` (test `AUDIT B`):

- `expect(stores).toContain('recipes')` ✅ / `expect(stores).not.toContain('recipe')` ✅
- La transacción real lanza: `NotFoundError: No objectStore named recipe in this database`
- **Y con la base llena de datos, `await isSeeded()` devuelve `false`**, porque el
  `try { ... } catch { return false }` de `offline-seed.ts:92-95` traga el error y lo convierte
  en un "no sembrado" limpio. Falso negativo silencioso.

Ironicamente, `offline-seed.test.ts:190-196` verifica el store correcto **leyendo el texto
fuente con una regex** (`expect(SEED_SOURCE).toMatch(/adapter\.list\('recipe'/)`), y
afirma que arregla un bug anterior. La regex pasa sobre el bug. Un test que valida el código
con el código no puede detectar que el código está mal — y aquí además la aserción está
invertida respecto de la realidad de la spec.

### 1.4 — ALTO · `indexeddb.ts`: `onblocked` sin manejar = cuelgue silencioso, no error

El bucle de reparación es **correcto y está acotado** (punto confirmado por test): `MAX_INTENTOS
= STORES.length + 2` y cada reintento decrementa el contador, así que **no hay ciclo infinito
aunque `STORES` crezca** — la pregunta 4 sobre el bucle infinito es un no-hallazgo. El
`VersionError` → `version + 1` también está bien medido.

El fallo es otro. En `indexeddb.ts:49-105`, `intentarEn()` asigna `onerror`, `onsuccess` y
`onupgradeneeded` — **nunca `onblocked`**. Medido (`AUDIT C`, test 3): con una conexión
ajena abierta y pidiendo una versión superior, el resultado es **`'onblocked'`**: el evento se
dispara, y como nadie lo escucha, **la promesa de `openDB()` no se resuelve ni se rechaza**.

Consecuencia: no es un fallo visible, es un cuelgue. `RecipeVault.svelte` queda en spinner
para siempre. Y es el escenario de **dos pestañas**, precisamente el que la tarea señalaba:
`await openDB()` se ejecuta en cada `create/list/get/update/del`, y **ninguna de esas cinco
rutas cierra la conexión**. Cada llamada abre una conexión nueva y la filtra. Con dos
pestañas, la segunda que necesite reparar la base se cuelga para siempre.

Los tests del esquema pasan (16/16) porque cada test abre y cierra su propia conexión:
nunca reproducen la condición de dos pestañas.

**Arreglo requerido:** asignar `onblocked` (rechazar con error accionable, o esperar al
`versionchange`), y `db.onversionchange = () => db.close()` en `onsuccess` para que las
conexiones propias no bloqueen a las demás.

### 1.5 — MEDIO · `sw.js` precachea una página `noindex` y hay dos generadores de SW compitiendo

Medido:

- `dist/sw.js` es **idéntico** a `public/sw.js` (`diff -q` → IDENTICOS). El `VitePWA` de
  `astro.config.mjs` **no generó** workbox: `grep "precacheAndRoute|self.__WB_MANIFEST"`
  en `dist/sw.js` → vacío, y no existe ningún `dist/workbox-*.js`. El SW manual gana porque
  `public/` se copia después. **Consecuencia: el `runtimeCaching` de workbox en
  `astro.config.mjs:40-46` (NetworkFirst para `/api/`) está configurado y NO se ejecuta
  jamás.** Configuración muerta.
- `dist/404.html` contiene `noindex` y **está en `STATIC_ASSETS`** (línea de sw.js). Es
  deliberado y está bien documentado en el propio código (fallback de navegación), y no es
  un problema de SEO (noindex es lo correcto para una 404; no se sirve como contenido
  indexable). **Lo señalo solo porque la pregunta lo pedía: no hay ninguna URL precacheada
  con `noindex` que sea contenido real.** `dist/api/index.html` es indexable, y debe serlo.
- **Las 18 rutas de `STATIC_ASSETS` existen todas en `dist/`** (verificado una por una). El
  service worker **no** cachea URLs inexistentes en el build actual.
- **Datos de usuario en el precache: ninguno.** `dist/api/all.json` (1,3 MB) contiene
  `recipes` + `count`, 473 recetas con campos de contenido público
  (`category, cookTime, country, difficulty, mainIngredients, …`). No hay `instance_id`,
  ni email, ni token. `offline-seed.ts` *añade* `instance_id: 'seed-default'` en el cliente
  al sembrar, no en el archivo servido.
- `BASE_URL = ''` hardcodeado y `astro.config.mjs` fija `base: '/'`: hoy coincide. Si algún
  día el sitio se sirve bajo un subdirectorio, todo el precache queda apuntando a rutas
  inexistentes y **no hay nada que lo detecte** — `pwa-offline.test.ts` compara `sw.js`
  contra una lista escrita a mano en el propio test, no contra `dist/`.

---

## 2. Alcance 1 — `llm.ts`: ¿resiste al LLM que inventa?

**Resiste. Verificado por mutación (contrato b).**

- **Slug inventado con formato válido → DESCARTADO.** `resolveCitations()`
  (`llm.ts:194-215`) indexa las fuentes por `sourceKey(kind, id)` y exige un hit exacto.
  Una cita a `substance:inventada` no está en el índice → va a `unknownKeys` y se descarta.
  Además valida el **par** `kind:id`, no solo el id: el test *"no acepta el mismo slug con
  otro tipo"* cubre exactamente el ataque de citar `[recipe:alicina]` cuando lo que existe
  es `[substance:alicina]`.
- **Afirmación que la fuente real NO dice → RECORTADA.** `unsupportedClaims()`
  (`llm.ts:230-247`) evalúa **frase a frase**, no sobre el texto entero, y una cita válida en
  otro punto del texto **no absuelve** a las frases vecinas. Acepta la cita de la frase
  siguiente (los modelos citan al final del párrafo) pero **no una cita lejana**: dos frases
  después ya no cubre. El recorte real ocurre en `askGrounded` (`llm.ts:543-570`), que
  reconstruye el texto quedándose solo con las frases citadas o sin cifras, y añade el
  recuento de lo descartado. Un modelo que dice una verdad citada y dos cifras inventadas
  pierde las dos cifras.
- **Sin ninguna cita válida → NO SE PUBLICA.** `askGrounded:527-540` devuelve
  `status: 'ungrounded'`, `citations: []`, con `unsupported` como evidencia de depuración.
- **`NO_LO_SE` del modelo se respeta** como respuesta válida, no como fallo (`:507-519`).
- **Las fuentes del prompt son verbatim.** `buildGroundedPrompt` (`:260-283`) emite el
  `snippet` literal del repo, nunca redactado por el modelo. `ask.ts:78-77` los arma desde
  `astro:content`, la misma fuente que las fichas. `collectSources` recorta con `clip()`
  por palabra sin cortar a medias.

**Debilidades reales (no vulnerabilidades del contrato):**

1. `HEALTH_CLAIM_RE` (`llm.ts:167`) contiene `previene` **duplicado** y `vitamina`/`vitamins`
   desbalanceado; sin efecto funcional, pero es ruido de una regex escrita a mano. La
   cobertura depende de una enumeración de palabras: un claim de salud con un verbo fuera de
   la lista ("mitiga", "alivia", "reduce el riesgo") pasa el filtro. El diseño es
   *defensa en profundidad*, no garantía: el contrato fuerte es "toda cifra o claim de salud
   necesita cita", y eso sí se sostiene.
2. `askGrounded` no limita la longitud de `text` antes de las operaciones de regex. Un modelo
   que devuelva 5 MB de texto las recorre enteras. No es un problema de Correctness a esta
   escala.

---

## 3. Alcance 2 — el peaje por tier

Detalle completo en **§1.1**. Resumen: **`used` y `tierId` vienen del body sin validación de
identidad ni clamp de rango; el corte de cuota es un parámetro de la petición, no un
control de acceso.** Medido con tres tests de auditoría. Agravante atenuante: el endpoint
da 405 en el deploy estático actual (documentado en el propio archivo), pero el archivo de
producción es este y la lógica equivalente del cliente también manda el tier en el body.

---

## 4. Alcance 4 — `indexeddb.ts`

Ciclo infinito: **NO**. Está acotado por `MAX_INTENTOS = STORES.length + 2` con decremento en
cada reintento, y `onupgradeneeded` crea todos los stores que falten en una sola subida.
Verificado por test (`AUDIT C` test 2). La base "a medias" sí se repara: es justo el caso que
 midió el test *"se autorepara si la base existe en la versión correcta pero
sin stores"*.

Lo que sí está roto: **`onblocked` sin manejar** (§1.4) y **conexiones que nadie cierra**.

---

## 5. Alcance 5 — controles negativos por MUTACIÓN

Las tres mutaciones se aplicaron sobre el archivo de producción, se corrió el test, se
restauró el archivo y se volvió a correr. **Las tres baselines son reales y están pegadas.**

### Baseline antes de mutar

```
$ cd site && npx vitest run src/lib/llm.test.ts
 Test Files  1 passed (1)
      Tests  41 passed (41)
$ md5sum src/lib/llm.ts
22a794c073447c589e70bc94885dc0d2  src/lib/llm.ts
```

### (a) Tier free debe devolver texto literal SIN llamar al LLM

Mutación: se elimina el gate `if (tierId === 'free') return retrievalOnlyAnswer(...)`
(`llm.ts:473`).

```
 Tests  4 failed | 37 passed (41)

 FAIL  > integración con llmComplete real (sin mock) > y askGrounded en free no depende de ese gate
AssertionError: expected 'credit-exhausted' to be 'answered'
  expected 'answered'  received 'credit-exhausted'
  ❯ src/lib/llm.test.ts:570:24
```

**DETECTADO** (4 tests caen). Restaurado:

```
$ cp /tmp/llm.ts.bak src/lib/llm.ts && md5sum src/lib/llm.ts
22a794c073447c589e70bc94885dc0d2  src/lib/llm.ts
$ npx vitest run src/lib/llm.test.ts
 Test Files  1 passed (1)
      Tests  41 passed (41)
```

### (b) Una cita que no está en las fuentes debe descartarse

Mutación: `resolveCitations()` acepta cualquier slug con formato válido
(`hit ?? {kind, id, label: id}`).

```
 Tests  5 failed | 36 passed (41)

 × RECHAZA una cita a un slug inventado
 × no acepta el mismo slug con otro tipo
 × RECHAZA cuando la única cita es a un slug inventado
 × rechaza el texto del endpoint cuando sus citas no existen en el catálogo
 × y además marca las afirmaciones sin respaldo de ese mismo texto
```

**DETECTADO** (5 tests caen — exactamente el conjunto de contratos de cita).
Restaurado → `22a794c0…` → **41 passed**.

### (c) Una base sin object stores debe repararse

Baseline:

```
$ cd site && npx vitest run src/lib/indexeddb-schema.test.ts
 Test Files  1 passed (1)
      Tests  16 passed (16)
$ md5sum src/lib/indexeddb.ts
f243a3ca7a98ab573e0e17e907c436fb  src/lib/indexeddb.ts
```

Mutación: la reparación se desactiva (`faltan.length === 0` → `faltan.length >= 0`).

```
 Tests  2 failed | 14 passed (16)

 × B2: repara desde la versión REAL del disco, no desde la pedida
 × se autorepara si la base existe en la versión correcta pero sin stores
```

**DETECTADO** (2 tests caen). Restaurado:

```
$ cp /tmp/indexeddb.ts.bak src/lib/indexeddb.ts && md5sum src/lib/indexeddb.ts
f243a3ca7a98ab573e0e17e907c436fb  src/lib/indexeddb.ts
$ git diff -- src/lib/llm.ts src/lib/indexeddb.ts | wc -l
0
```

### Verificación final (tras restaurar)

```
$ cd site && npx vitest run
 Test Files  22 passed (22)
      Tests  250 passed | 4 skipped (254)      ← 22 = los 21 originales + robustez.audit.test.ts
$ cd worker && npx vitest run
 Test Files  2 passed (2)
      Tests  54 passed (54)
$ git status --short
?? site/src/lib/robustez.audit.test.ts        ← único cambio; ningún archivo de producción tocado
```

**3/3 mutaciones detectadas.** A diferencia de la ola anterior, estas cifras están respaldadas
por la salida pegada de cada paso, y el árbol quedó con `git diff` vacío sobre producción.

---

## 6. Dependencias sin declarar

La ola anterior dejó `fake-indexeddb` sin declarar. **Ya está declarado** (`site/package.json`,
`devDependencies.fake-indexeddb: 6.2.5`).

Escaneo automático de los **27** archivos de test del sitio, extrayendo cada specifier de
import y comparándolo contra `dependencies ∪ devDependencies`:

```
$ node -e '...'   # walker de src/**/*.test.ts, regex de import|from|require
test files scanned: 27
UNDECLARED: none
```

**No hay más dependencias sin declarar.** (`worker/` no importa nada externo en sus tests.)

Nota sobre los 27 vs 21: la diferencia son 6 specs de Playwright en `tests/e2e/`, excluidas
por `vitest.config.ts` (`include: ['src/**/*.test.ts']`, `exclude: ['tests/e2e/**']`). No es
una suite perdida: se corren con `pnpm test:e2e`, en otro runner. **No los ejecuté** — no
forman parte del alcance y no son medibles sin un build sirviendo el sitio.

---

## 7. Hallazgos de robustez de los tests (por qué la ola anterior pasó)

Los tests **funcionan** — las 3 mutaciones lo demuestran. Pero tienen una debilidad
estructural que explica cómo se reportan cosas que no se midieron:

1. **Un test que valida el código con el código no puede encontrar que el código está mal.**
   `offline-seed.test.ts:194` comprueba `expect(SEED_SOURCE).toMatch(/adapter\.list\('recipe'/)`
   — lee la fuente y la compara con una regex. Pasa sobre un bug real (§1.3). La validación
   debe ser contra la spec de IndexedDB (`fake-indexeddb` da `NotFoundError`), no contra el
   texto del archivo.
2. **Los tests del esquema nunca reproducen dos pestañas**, que es la condición donde
   `onblocked` importa (§1.4). Cada test abre y cierra su propia conexión.
3. **`worker/package.json` sí declara `test: vitest run`, pero la instrucción de la tarea
   decía que no existía** — verificado: existe. `npm test` en `worker/` sí funciona. La
   discrepancia viene de que la ola anterior dejó el árbol a medias; hoy está consistente.

---

## 8. Recomendaciones, priorizadas

| # | Prioridad | Acción | Hallazgo |
|---|---|---|---|
| 1 | **Bloqueante** | Derivar `tierId` de una sesión autenticada en el servidor; **ignorar `used` del body** y leerlo de un ledger server-side (D1/KV). Clamp a `>= 0` si se mantiene el parámetro. | §1.1 |
| 2 | **Bloqueante** | Asignar `onblocked` en `intentarEn()` y `db.onversionchange = () => db.close()` en `onsuccess`; revisar las 5 rutas que abren conexión y la filtran. | §1.4 |
| 3 | Alta | Conectar `seedFromStaticBuild()` desde el arranque de la PWA, o borrar el módulo y sus tests. Hoy es código muerto verificado por tests que lo importan directamente. | §1.2 |
| 4 | Alta | Corregir `adapter.list('recipe')` → `'recipes'` y **reemplazar el test de regex** por uno que ejecute la operación contra `fake-indexeddb`. | §1.3 |
| 5 | Media | Decidir entre `VitePWA` y el `sw.js` manual: el `runtimeCaching` de workbox está muerto. Eliminar la integración o el SW manual, no ambos. | §1.5 |
| 6 | Media | Hacer que `pwa-offline.test.ts` valide `STATIC_ASSETS` contra el contenido real de `dist/`, no contra una lista escrita a mano en el test. | §1.5 |
| 7 | Baja | `HEALTH_CLAIM_RE`: quitar el `previene` duplicado y cubrir verbos ausentes (`mitiga`, `alivia`, `reduce el riesgo`). | §2 |

---

## Anexo — método y reproducibilidad

- **Baseline gate:** antes de cada mutación se ejecutó el test y se pegó la salida con
  `N passed`. Ningún control negativo se reportan sin baseline real. Esto cierra exactamente
  el fallo que se reportaba antes (vitest con cwd equivocado →
  "No test files found" → falso verde); los comandos se ejecutan siempre con `cd` explícito
  y la salida incluye `Test Files` y `Tests`.
- **Restauración:** cada mutación se respaldó con `cp` a `/tmp` y se verificó por `md5sum`
  antes y después. `git diff --stat` sobre los dos archivos de producción = **vacío**.
- **Fichero de auditoría creado:** `site/src/lib/robustez.audit.test.ts` (8 tests, todos
  verdes). Contiene los tests de §1.1, §1.3 y §1.4. No modifica producción; sirve de línea
  base ejecutable para que los arreglos futuros sean verificables.
- **No ejecutado:** `tests/e2e/` (6 specs de Playwright, requiere build sirviendo).
  `astro check` / `tsc --noEmit` no se corrieron (fuera de alcance, y el árbol tiene
  dependencias sin instalar en la raíz). `worker/` se verificó solo con su suite.
