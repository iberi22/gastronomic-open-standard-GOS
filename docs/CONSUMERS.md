# Consumir GOS v1

Fize, OrionHealth y la app de entrenamiento comparten el contrato estático de
`https://gos.swal.network/api/v1`. No requiere Astro, SSR ni el schema legacy
Pydantic de `gos/schemas.py`. Los JSON Schema 2020-12 canónicos están en
`schemas/v1/`: corresponden a las colecciones publicadas de
`site/src/content.config.ts`, con los campos normalizados descritos aquí.
El exportador valida todas las entradas antes de publicar los cuatro archivos.

## Archivos e identidad

| Archivo | Contenido |
| --- | --- |
| `manifest.json` | `schemaVersion`, `version`, `contentHash`, `generatedAt`, `counts`, `license`, `files` |
| `ingredients.json` | Array de ingredientes con nutrientes, porciones, aliases y evidencia |
| `dishes.json` | Array de platos con metadatos y procedencia nutricional |
| `ingredients.min.json` | Array con únicamente `id`, `names`, `group`, `nutrition_per_100g`, `allergens` |

Ingrediente `ingredients/condiments/ajo.md`: `gos:ingredient/ajo`, slug `ajo`.
Plato `dishes/colombian/nacionales/ajiaco.md`:
`gos:dish/colombian/nacionales/ajiaco`, country `colombian`, slug
`nacionales/ajiaco`. Los subdirectorios del plato forman parte del slug para
conservar identidad. Los nombres visibles y aliases no determinan IDs.
Una colisión de IDs hace fallar la exportación; mover un archivo que cambia
su slug cambia su ID y requiere una migración de referencias del consumidor.

`version` es el semver de `package.json` raíz (actualmente `0.0.1`).
`contentHash` es SHA-256 del JSON de `{ingredients, dishes, ingredientsMin,
license}` en ese orden; arrays ordenados por ruta, sin `generatedAt`.
El tiempo de generación cambia sin invalidar contenido idéntico.
La clave de caché combina versión y hash: cambios de contenido invalidan
la caché incluso antes de un incremento semver. `/v1` identifica la versión
del contrato; cambios incompatibles deben publicar otro prefijo.

## Cliente TypeScript

El paquete ESM `@swal/gos-client` v0.1.0 tiene cero dependencias de runtime.
Se integra desde el workspace con `"@swal/gos-client": "workspace:*"`;
`pnpm --dir packages/gos-client build` genera JavaScript y declaraciones en
`dist`. Todavía no se ha publicado en npm.

```ts
import { createGosClient, indexedDbCache } from '@swal/gos-client'

const gos = createGosClient({ cache: indexedDbCache('fize-gos-v1') })
const manifest = await gos.getManifest()
const ingredients = await gos.listIngredients()
const ajo = await gos.getIngredient('ajo') // también acepta gos:ingredient/ajo
const matches = await gos.searchIngredients('garlic', { lang: 'en' })
const dishes = await gos.listDishes()
const dish = await gos.getDish('gos:dish/colombian/nacionales/ajiaco')
const totals = await gos.nutritionFor([
  { ingredientId: 'gos:ingredient/ajo', grams: 3 },
])
```

`getIngredient`/`getDish` devuelven `undefined` si no existe la entrada.
La búsqueda ignora acentos y mayúsculas y usa nombres/aliases del idioma.
`nutritionFor` escala valores por 100 g y devuelve `nutrition`,
`micronutrients`, `missing` y `complete`; los totales conocidos pueden ser
parciales, nunca deben mostrarse como completos cuando `complete` es falso.
Las unidades permanecen en las claves originales (`calories`, `protein_g`,
`vitamin_c_mg`, `selenium_ug`, etc.); no se convierten mg a µg.

`memoryCache()` es la caché por defecto y dura la sesión. `indexedDbCache()`
persiste datos entre sesiones en navegadores. Ambos usan stale-while-revalidate:
una lectura con caché devuelve el último dataset disponible inmediatamente y
actualiza en segundo plano; la siguiente lectura observa la nueva versión.
Las actualizaciones fallidas conservan el último dataset completo. Después de
cargar los ingredientes y platos una vez, esas colecciones funcionan offline.
La primera carga de una colección requiere red. La caché incluye la URL base
para aislar diferentes servidores. Se puede inyectar `fetch` y un
`CacheAdapter` (`get<T>`, `set<T>`) para SSR, tests o almacenamiento propio.

Fize debe cargar el cliente en el navegador para usar IndexedDB (por ejemplo,
en `onMount` de Svelte 5). OrionHealth y la app de entrenamiento pueden usar
el cliente en JS/TS o leer los mismos JSON directamente desde Dart u otro
lenguaje. Vinculen registros de comida mediante IDs GOS, no nombres visibles.
El bundle mínimo sirve para búsqueda de nombres y macros offline; para aliases,
micronutrientes y evidencia se necesita el archivo completo.

## Nutrición y evidencia

El cálculo de platos requiere raciones positivas explícitas y todas las
cantidades resolubles. Se aceptan `ingredient_quantities: [{ingredientId,
grams}]`, `ingredients` con esas cantidades (o nombres y gramos), o listas
Markdown bajo un encabezado Ingredientes/Ingredients con gramos/kilogramos.
Ejemplos válidos: `200 g de ajo`, `Ajo: 0,2 kg`. Solo se convierten kilogramos a gramos; no se convierten
volúmenes, cucharadas ni cantidades «al gusto». Se rechazan nombres ambiguos.
No se extrapolan porciones ni se aplica una corrección de cocción.
Una línea de ingredientes que no se puede interpretar bloquea el cálculo.
Las cantidades originales de frontmatter se conservan en
`declared_ingredient_quantities`; `ingredient_quantities` normalizado solo
se publica cuando se logra calcular el plato.

- `computed`: `nutrition_per_serving` suma cantidades y divide por raciones;
  `micronutrients_per_serving` conserva las unidades del ingrediente. Solo se
  incluyen nutrientes presentes en todos los ingredientes.
- `declared`: conserva `nutrition_per_serving` cuando existe; el campo legacy
  `nutrition` también cuenta como declarado y se conserva íntegro. Su base no
  está documentada: no se transforma automáticamente a valores por ración.
- `unknown`: no hay declaración ni cálculo completo posible.

El primer export medido contiene 552 ingredientes y 495 platos:
0 `computed`, 426 `declared`, 69 `unknown`. `manifest.counts` es el conteo
vigente después de cada build. Los 515 stubs de `pending_review` se incluyen
para identidad, con nutrientes `null` porque sus ceros son placeholders.
Una lista `allergens: []` significa «sin alérgenos declarados», no garantía
de ausencia. Los metadatos originales siguen disponibles en el archivo completo.

OrionHealth debe mostrar `health_registry` con `evidence_level`, mecanismo,
estudios y estado del DOI. Son metadatos de fuentes, no una validación clínica:
el exportador no verifica estudios ni eleva niveles de evidencia. La app de
entrenamiento consume nutrición; GOS v1 no contiene ejercicios ni rutinas.

## Licencia y atribución

`manifest.license` contiene el texto exacto de `LICENSE` (GNU AGPL v3).
Las licencias de frontmatter y fuentes individuales se conservan; muchas
entradas dicen MIT y el package.json raíz dice Unlicense. Este contrato no
resuelve esa discrepancia ni concede una licencia nueva de datos. Los
consumidores deben conservar el manifiesto/licencia, la procedencia de cada
entrada y la atribución a Gastronomic Open Standard y a sus fuentes cuando
corresponda; una URL `pending` sigue siendo procedencia incompleta.
Antes de redistribuir datasets con otra licencia, hace falta una decisión
expresa del propietario sobre la política de datos.

## Generar y verificar

```sh
pnpm install --offline
node scripts/export-v1.mjs
pnpm --dir site build
pnpm --dir site test
pnpm --dir packages/gos-client build
pnpm --dir packages/gos-client test
```

El build del sitio ejecuta el exportador después de preparar el contenido y
antes de `astro check`/`astro build`. El generador legacy de `index.json`
permanece independiente. Los tests del sitio validan todas las entradas,
IDs, hash, bundle mínimo y controles negativos del cálculo nutricional;
los del cliente usan fixtures y no hacen peticiones de red.

### Validación del contrato (2026-10-02)

- `pnpm install --offline --frozen-lockfile`: correcto, 3 proyectos del workspace.
- `pnpm --dir site build`: 1.106 páginas, Astro check sobre 118 archivos
  con 0 errores, 0 warnings y 154 hints.
- `pnpm --dir site test`: 24 archivos, 271 tests pasan y 4 omitidos.
- `pnpm --dir packages/gos-client build`: TypeScript y declaraciones correctos.
- `pnpm --dir packages/gos-client test`: 1 archivo, 17 tests pasan, sin red.
- `pnpm exec biome check` sobre exportador, test del contrato, cliente y schemas:
  11 archivos correctos.
- Baseline `c4ecce64`, ejecutado antes de editar: build del sitio correcto y
  23 archivos Vitest con 257 tests correctos y 4 omitidos.
- Python: `python -m unittest discover -s tests -v` falla ya en el baseline
  `c4ecce64`: 1 error de importación, `ModuleNotFoundError: No module named
  'sync_how_to_cook'`, desde `tests/test_sync_logic.py:8`. El módulo no existe
  en ese commit. `pytest` tampoco está instalado en los entornos disponibles.
  No se han modificado tests ni código Python.
