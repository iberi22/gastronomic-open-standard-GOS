# @swal/gos-client

Cliente TypeScript ESM para GOS v1, sin dependencias en runtime. Construir con
`pnpm --filter @swal/gos-client build`; los exports apuntan a `dist/` e incluyen tipos.

```ts
import { createGosClient, indexedDbCache } from '@swal/gos-client';

const gos = createGosClient({ cache: indexedDbCache('fize-gos') });
const ingredient = await gos.getIngredient('gos:ingredient/ajo');
const matches = await gos.searchIngredients('garlic', { lang: 'en' });
const total = await gos.nutritionFor([{ ingredientId: 'gos:ingredient/ajo', grams: 25 }]);
```

Opciones: `baseUrl` (por defecto `https://gos.swal.network/api/v1`), `cache`
(por defecto `memoryCache()`) y `fetch` inyectable. Métodos asíncronos:
`getManifest()`, `listIngredients()`, `getIngredient(idOrSlug)`,
`searchIngredients(q, {lang?})`, `listDishes()`, `getDish(id)` y `nutritionFor(items)`.
Las búsquedas ignoran acentos y mayúsculas; los alias se filtran por idioma si se indica.
Un ID inexistente devuelve `undefined`.

El caché retorna inmediatamente la última copia completa y actualiza en segundo
plano. Su identidad incluye URL, versión semántica y hash de contenido. Las llamadas
posteriores ven las actualizaciones; IndexedDB mantiene los datos tras recargar y
permite trabajar sin conexión después de cargar cada colección al menos una vez.
Un fallo de actualización conserva la copia anterior; el primer acceso sin copia
propaga el error. `getManifest()` también puede devolver una versión anterior
mientras se actualiza. El caché persiste colecciones completas, de forma independiente.

`nutritionFor` devuelve `{ nutrition, micronutrients, missing, complete }`.
Suma únicamente valores registrados, proporcionalmente a gramos/100, conservando
las unidades de las claves (`energy_kcal`, `protein_g`, `potassium_mg`, etc.). No
convierte unidades ni supone valores para nutrientes ausentes. `missing` enumera
ingredientes inexistentes, bloques macro/micronutricionales vacíos o claves
ausentes respecto a la unión de nutrientes registrados en los ingredientes de
entrada; los totales son parciales cuando `complete` es falso. `complete` no
garantiza que los datos originales incluyan todos los nutrientes posibles.
Las cantidades negativas o no finitas producen `RangeError`.

Para SSR usar el caché de memoria; IndexedDB abre su base de manera diferida al
primer acceso en el navegador. Un `CacheAdapter` propio implementa
`get<T>(key): Promise<T | undefined>` y `set<T>(key, value): Promise<void>`.

Las condiciones de los datos y la atribución están en `manifest.license` y en
los metadatos de cada entrada. Ver también `docs/CONSUMERS.md` en el repositorio.
