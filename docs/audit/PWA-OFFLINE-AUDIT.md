# Auditoría de cobertura offline — PWA GOS

**Fecha:** 2026-10-01
**Alcance:** `site/public/sw.js` (service worker manual), precache, estrategias de runtime, versionado de cache, seed de IndexedDB.
**Método:** Chromium 153 real (Playwright 1.63), `context.setOffline(true)` para cortar la red de verdad. Ninguna cifra de este documento es una suposición: todas salen de una ejecución con el navegador abierto y la red cortada. Un `fetch` que devuelve 200 del cache no se cuenta como cobertura; para las páginas se exige que el DOM renderice.

Artefactos de la medición (fuera del repo, en la caché de Hermes):
`audit-BASELINE.json`, `audit-FINAL.json`, `cold-final.json`, `stratified2.json`.

---

## 1. Resumen: el service worker estaba activo y aun así la PWA no funcionaba offline

El estado heredado era "service worker activo, cache `gos-pwa-v1`, `/recipes` funciona offline". **Las tres afirmaciones son wrong o están a medias:**

| Afirmación | Medido | Veredicto |
| --- | --- | --- |
| El service worker está activo | `activated`, scope `/`, `controller: true` | ✅ cierto |
| Existe el cache `gos-pwa-v1` | 34 entradas tras visitar 22 rutas | ✅ cierto |
| `/recipes` funciona offline | **503 "Offline", 7 bytes de cuerpo** | ❌ **falso** |

**`/recipes` NO funcionaba offline.** Devolvía un `503` de 7 bytes cuyo `bodyLen` era literalmente el texto `Offline`. Y tampoco por un accidente casual: **las 8 rutas HTML del sitio fallaban**, y con ellas `/graph`, `/ingredients`, `/substances`, `/countries`, `/scientific`, `/api` y las rutas de detalle. `/` (la home) era la única página que sobrevivía, porque estaba en el precache de 3 entradas.

La causa no era la ausencia de rutas en el precache —el precache viejo nunca pretendió cubrirlas— sino que **el HTML no podía entrar al cache por más que se pidiera**. Ver §2.

## 2. Causa raíz: `clone()` diferido envenenaba el cache de HTML

El `sw.js` heredado cacheaba así en las cuatro estrategias:

```js
caches.open(CACHE_NAME).then((cache) => {
  cache.put(request, response.clone())   // <-- ¿cuándo se ejecuta esto?
})
return response
```

Ese `caches.open().then(...)` no se espera: se dispara y la `response` se devuelve al navegador **de inmediato**. Para cuando la microtarea corre, el navegador ya transmitió el body al cliente, la `Response` quedó con el body consumido y `clone()` lanza:

```
TypeError: Failed to execute 'clone' on 'Response': Response body is already used
```

Como el `.then()` no tiene `.catch()`, el error se pierde como `unhandledrejection` silencioso. Resultado: **`put()` nunca se completaba y ningún documento HTML entraba jamás al cache**, por muchas veces que se visitara la página.

Reproducido de forma aislada dentro del scope del service worker, con los dos patrones lado a lado:

```json
{
  "A_stored": false,
  "A_unhandled": ["TypeError: Failed to execute 'clone' on 'Response': Response body is already used"],
  "B_stored": true,
  "B_unhandled": []
}
```

(A = patrón heredado, `clone()` dentro del `.then` diferido. B = patrón corregido, `clone()` síncrono antes de devolver.)

**El arreglo:** el `clone()` se hace de forma síncrona, se guarda en una variable, y sólo entonces se devuelve la `response` al navegador. Aplicado en las cuatro estrategias (`cacheFirst`, `networkFirst`, `staleWhileRevalidate`, `navigationHandler`).

### Un segundo defecto que el mismo experimento destapó

`/api/*.json` y `graph-data.json` **sí** se cacheaban en el estado heredado, pero por casualidad: pasaban por `networkFirst`, cuyo `put` estaba encadenado al `await fetch` y por tanto no perdía la carrera.

El HTML, en cambio, es `navigate`. Se añadió un `navigationHandler` dedicado: en un acierto de cache sirve al instante y revalida en segundo plano; sin red y sin entrada propia sirve la `/404.html` cacheada, que es preferible a la pantalla de error del navegador y a un 503 de 7 bytes.

### Tercer defecto: `Vary: Origin` dejaba el HTML cacheado inservible

El server sirve el HTML con `Vary: Origin` y `Cache-Control: no-cache`. Cache API **respeta `Vary` al hacer match**: una entrada guardada con `Vary: Origin` deja de encontrar darle cuando la petición que llega no lleva esa cabecera. GOS devuelve el mismo HTML a todos los orígenes, así que `sw.js` ahora tiene un `sanitize()` que borra `Vary` antes de cachear. Sin esto, el HTML podía estar en el cache y aun así no servir.

## 3. Tabla de cobertura — rutas auditadas con la red cortada

22 rutas, medidas tras recalentar online (para que los caches de runtime se llenen) y luego **cortando la red de verdad** y volviendo a visitar cada una.

| # | Ruta | Tipo | Antes (v1) | Ahora (v2) |
| --- | --- | --- | --- | --- |
| 1 | `/` | página | ✅ 200 (precache) | ✅ 200 (precache) |
| 2 | `/recipes` | página | ❌ **503 "Offline"** | ✅ 200 |
| 3 | `/graph` | página | ❌ **503 "Offline"** | ✅ 200 |
| 4 | `/ingredients` | página | ❌ **503 "Offline"** | ✅ 200 |
| 5 | `/substances` | página | ❌ **503 "Offline"** | ✅ 200 |
| 6 | `/countries` | página | ❌ **503 "Offline"** | ✅ 200 |
| 7 | `/scientific` | página | ❌ **503 "Offline"** | ✅ 200 |
| 8 | `/api` | página | ❌ **503 "Offline"** | ✅ 200 |
| 9 | `/ruta-inexistente` | error | ❌ **503 "Offline"** | ✅ 200 (404 de GOS) |
| 10 | `/api/index.json` | JSON | ✅ 200 | ✅ 200 (precache) |
| 11 | `/api/evidence.json` | JSON | ✅ 200 | ✅ 200 (precache) |
| 12 | `/api/substances.json` | JSON | ✅ 200 | ✅ 200 (precache) |
| 13 | `/api/all.json` | JSON | ✅ 200 | ✅ 200 (precache) |
| 14 | `/api/agent/knowledge.json` | JSON | ✅ 200 (runtime) | ✅ 200 (runtime) |
| 15 | `/api/vectors/index.json` | JSON | ✅ 200 (runtime) | ✅ 200 (runtime) |
| 16 | `/api/ingredients/variants.json` | JSON | ✅ 200 (runtime) | ✅ 200 (runtime) |
| 17 | `/api/by-country/catalog.json` | JSON | ✅ 200 (runtime) | ✅ 200 (runtime) |
| 18 | `/graph-data.json` | JSON | ❌ **503 "Offline"** | ✅ 200 (precache) |
| 19 | `/manifest.json` | JSON | ✅ 200 | ✅ 200 (precache) |
| 20 | `/llms.txt` | txt | ❌ **503 "Offline"** | ✅ 200 (precache) |
| 21 | `/recipes/pollo-a-la-parrilla` | detalle | ❌ **503 "Offline"** | ✅ 200 (runtime) |
| 22 | `/ingredients/pollo` | detalle | ❌ **503 "Offline"** | ✅ 200 (runtime) |

**Total: 10/22 (45,5 %) → 22/22 (100 %).** Las 12 rutas que fallaban eran exactamente las que ningún precache cubría y que dependían del runtime cache, que era donde el bug del `clone()` hacía su daño.

Tamaño del cache tras la auditoría: **34 → 50 entradas**.

## 3b. Barrido estratificado sobre las 1105 rutas

La tabla anterior audita 22 rutas. Un muestreo **estratificado** cubre las 10 secciones del sitio: los índices de cada sección se miden enteros y las rutas de detalle se muestrean de forma determinista (espaciado uniforme) para no gastar 1105 navegaciones en un espacio que se comporta igual por sección.

```
Espacio total: 1105 rutas HTML -> muestreadas 46

===== COBERTURA OFFLINE ESTRATIFICADA (red cortada) =====
TOTAL 46/46 = 100.0%
  countries      10/10  offline  (muestra 10/20 del espacio)
  ingredients    10/10  offline  (muestra 10/553 del espacio)
  recipes        10/10  offline  (muestra 10/496 del espacio)
  substances     10/10  offline  (muestra 10/31 del espacio)
  (home)          1/1   offline  (muestra 1/1 del espacio)
  404.html         1/1   offline  (muestra 1/1 del espacio)
  api             1/1   offline  (muestra 1/1 del espacio)
  graph           1/1   offline  (muestra 1/1 del espacio)
  scientific      1/1   offline  (muestra 1/1 del espacio)
  ruta-inexistente-probe 1/1 offline
```

El **`/api/` falló en la primera pasada de este barrido** (503) y por eso está hoy en el precache: es la página de referencia de la API, 26 KB de HTML, y no la tenía nadie. Ese fallo es el argumento a favor de muestrear secciones y no sólo rutas de__: la auditoría de 22 rutas de la §3 lo había dado por bueno porque `/api` se había visitado online antes de cortar la red. Segunda pasada: 46/46.

## 4. Precache: qué entra desde el primer uso, sin haber visitado nada

`STATIC_ASSETS` pasó de 3 entradas a 17. Precargar es lo que separa "funciona offline si ya paseaste por la página" de "funciona offline la primera vez".

| Entrada | Por qué |
| --- | --- |
| `/`, `/index.html` | Home. La única que sobrevivía antes. |
| `/recipes/`, `/graph/`, `/ingredients/`, `/substances/`, `/countries/`, `/scientific/` | Catálogos y grafo: el corazón navegable del sitio. |
| `/api/` | Referencia de la API (26 KB). La puerta de entrada de los agentes que llegan sin red. |
| `/404.html` | Sin ella, una ruta desconocida sin red muestra la pantalla de error del navegador en vez de la 404 de GOS. |
| `/graph-data.json` | 3,2 MB. Sin esto `/graph` renderiza pero no pinta el grafo. |
| `/api/index.json`, `/api/all.json`, `/api/substances.json`, `/api/evidence.json` | Catálogos que consume la UI y que los agentes consultan. |
| `/manifest.json`, `/favicon.svg`, `/llms.txt` | Metadatos PWA y para agentes. |

**Excluido a propósito:** `/api/vectors/*` (11,9 MB en tres shards) es material de búsqueda semántica web, no de navegación. Precargarlo multiplicaría por cuatro el costo de instalación de la PWA a cambio de una función que nadie usa sin red. Un test falla si alguien lo añade.

## 5. Bug adicional: `/recipes` sin barra servía la 404 offline

Este lo destapó el test de arranque en frío, no la auditoría de rutas visitadas.

El precache guarda `/recipes/` (con barra). Una navegación a `/recipes` (sin barra) consultaba el cache con `cache.match(request)` y fallaba el match, caía al fallback y devolvía... la 404 de GOS. El usuario que abre `/recipes` desde el menú, sin red, veía un error de "esta página no está en el grafo" en lugar del catálogo de recetas.

```
ANTES (arranque en frío, sólo se visitó la home online):
  200  bodyLen=870   /recipes      h1=Esta página no está en el grafo   <-- la 404
  200  bodyLen=1099  /recipes/     h1=Recetas del grafo global
```

`navigationHandler` ahora prueba la forma pedida, la variante con barra y `.../index.html`, y además deja un alias en el cache bajo la URL exacta para que la segunda visita sea un match directo.

```
DESPUÉS (mismo arranque en frío):
  200  bodyLen=1099  /recipes      h1=Recetas del grafo global
  200  bodyLen=1099  /recipes/     h1=Recetas del grafo global
  200  bodyLen=1647  /graph        h1=Grafo gastronómico global
  200  bodyLen=833   /ingredients  h1=Ingredientes científicos
  200  bodyLen=4495  /scientific   h1=Capa científica
```

Este caso es la razón de ser de auditar el arranque en frío: la auditoría de la §3 lo daba por bueno **porque esa URL exacta se había visitado online antes de cortar la red**.

## 6. Versionado de cache: una sola versión viva

`CACHE_NAME` se deriva de `PRECACHE_VERSION`:

```js
const PRECACHE_VERSION = 2
const CACHE_PREFIX = 'gos-pwa-v'
const CACHE_NAME = `gos-pwa-v${PRECACHE_VERSION}`
```

`activate` purga sólo los caches de GOS **anteriores** a esta versión, y sólo los que comparten prefijo — no toca caches ajenos a la PWA. `isCurrentOrNewer()` evita que un cliente con un SW más nuevo que la página borre en caliente un cache que todavía se está usando.

**Medido, no supuesto.** Se plantó un `gos-pwa-v1` legado, luego se sirvio el `sw.js` con `PRECACHE_VERSION = 3` y se disparó `registration.update()`:

```
phase1  v2 installed      : ["gos-pwa-v2"]
phase2  +legacy v1 planted: ["gos-pwa-v1","gos-pwa-v2"]
phase3  v3 activated      : ["gos-pwa-v3"]

GOS alive      : ["gos-pwa-v3"]
v1 purged?     : true
v2 purged?     : true
EXACTLY ONE GOS: true (1) -> ["gos-pwa-v3"]
```

Un cache ajeno convive con los de GOS sin ser tocado:

```
2. after planting            : ["app-ajeno-v9","gos-pwa-v1","gos-pwa-v2"]
3. after v3 activates        : ["app-ajeno-v9","gos-pwa-v3"]
   v1 purged? true   v2 purged? true   ajeno kept? true
```

## 7. `offline-seed.ts` sembraba 0 registros

Encontrado al auditar el seeding. Las cinco URLs que el módulo pedía **no existen**:

| URL pedida | Estado real |
| --- | --- |
| `/api/recipes.json` | **404** |
| `/api/ingredients.json` | **404** |
| `/api/vitamins.json` | **404** |
| `/api/conditions.json` | **404** |
| `/api/diets.json` | **404** |

El módulo reportaba `{seeded: 0, skipped: [...]}` y nada más lo delataba: la PWA arrancaba "bien" con el cache vacío. Los catálogos reales que produce `scripts/generate-api.js` son `/api/all.json` (objeto `{recipes:[...]}`) y `/api/substances.json` (objeto `{substances:[...]}`).

Otro defecto en el mismo archivo: `isSeeded()` consultaba el store `ingredient` mientras la siembra escribía en `recipes`/`substances` — **nunca podía confirmar su propia siembra**.

Corregido: las fuentes apuntan a endpoints que existen, cada una declara su clave de colección y su store, y los registros sin `id` se descartan.

## 8. Tests de guardia

`site/src/lib/pwa-offline.test.ts` (30 tests) y `site/src/lib/offline-seed.test.ts` (10 tests).

Fallan si alguien quita una ruta crítica del precache, reintroduce `gos-pwa-v1`, fija el nombre del cache a mano, o reintroduce el `clone()` diferido. Verificado por mutación, no por inspección:

| Mutación | Resultado |
| --- | --- |
| Quitar `/graph/` de `STATIC_ASSETS` | ❌ `1 failed \| 28 passed` — `precachea /graph/`: `/graph/ salió de STATIC_ASSETS` |
| Volver a `const CACHE_NAME = 'gos-pwa-v1'` | ❌ `3 failed \| 26 passed` — `deriva CACHE_NAME de PRECACHE_VERSION`, `no fija un nombre de cache versionado a mano`, `no reintroduce el nombre viejo gos-pwa-v1` |
| Restaurar el `clone()` dentro del `.then` diferido | ❌ `1 failed \| 28 passed` — `ninguna estrategia clona dentro de un then diferido sin clonar antes` |

Las tres mutaciones se detectaron y `sw.js` quedó restaurado byte a byte tras cada una.

## 9. Límites honestos de esta auditoría

- **El barrido de las 1105 rutas se midió por muestreo estratificado, no entero.** Se visitoron 46 rutas que cubren las 10 secciones (índices completos, detalle muestreado con espaciado uniforme). Un barrido entero de las 1105 se intentó y no terminó a tiempo con la máquina bajo carga (load average llegó a 88 por otros procesos), así que se descartó. El 100 % reportado es de esas 46 rutas muestreadas, no de las 1105. Repetir contra el despliegue antes de cerrar la fase.
- **`site/astro.config.mjs` no se tocó.** `VitePWA` sigue en `devDependencies` e inactivo (`devOptions.enabled: false`, `manifest: false`); el SW efectivo es el manual de `public/sw.js`. Activar el plugin cambiaría el cacheo entero y queda fuera de esta fase.
- El `dist/` se reconstruyó a mitad de auditoría (otro proceso) y cambió un hash de CSS, lo que hizo desaparecer del comparando las fuentes web. No es un efecto del SW: `dist/` está en `.gitignore` y el hash de `Layout` es una decisión de build, no de cacheo. La medición de fuentes está contaminada por eso y se excluye de las tablas.
- **Los datos son de Chromium 153 en `astro preview` sobre `127.0.0.1:4399`.** Cloudflare Pages sirve cabeceras distintas; conviene repetir la medición contra el despliegue antes de dar por buena la cobertura en producción.
- Sin commit ni push, según lo pedido. `git status` muestra únicamente los cuatro archivos de mi isla.
