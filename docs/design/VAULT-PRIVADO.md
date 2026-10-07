# Vault privado de recetas — estado real

> **Fecha:** 2026-10-01 · **Alcance:** `site/src/lib/indexeddb.ts`, `site/src/lib/recipe-vault.ts`, `site/src/components/RecipeVault.svelte`
>
> Este documento describe **lo que el vault es hoy**, verificado con comandos
> reales. No describe lo que ought a ser. Donde algo no existe, se dice que no
> existe.

## TL;DR

El vault es un **cuaderno local**, no una cuenta de usuario. Persiste recetas en
IndexedDB en el propio navegador, funciona entero sin conexión, y exporta/importa
JSON con validación contra el estándar GOS.

No hay autenticación, ni servidor, ni sincronización, ni cifrado, ni copia de
seguridad automática. Si borras los datos del navegador, las recetas se pierden.
Si no exportas, no hay copia en ninguna parte.

## Qué funciona (con evidencia)

### 1. Persistencia real en IndexedDB, verificada en navegador

Base `gos-domain`, versión 1, ocho object stores. El vault usa `recipes`, con
`keyPath: 'id'`.

Stores observados en Chromium tras crear una receta:

```
["conditions","diets","ingredients","recipes","substances","techniques","tips","vitamins"]
```

Prueba manual completa (`pnpm --filter gos-site dev` + navegador en
`http://localhost:4321/recipes`), con `fetch`/`XMLHttpRequest`/`WebSocket`/
`EventSource` sustituidos por lanzadores:

| Paso | Resultado |
|---|---|
| Crear receta con la red bloqueada | `«Arepas de choclo GOS fase 3» guardada solo en este dispositivo.` |
| Llamadas de red registradas | `[]` — ninguna |
| Recargar la página | `1 receta(s) guardada(s) en este dispositivo.` |
| Receta, ingredientes y notas tras recargar | `Maíz dulce, Queso fresco, Sal` / notas intactas |
| Exportar JSON | `Exportadas 1 receta(s). El archivo es tuyo, no se envía a ningún servidor.` |
| Importar en base vacía | `Importadas 4 receta(s). 5 receta(s) descartada(s).` |

El módulo de dominio no contiene ninguna llamada de red, y eso está verificado
por análisis del código fuente, no por confianza
(`recipe-vault-store.test.ts`, test *"el módulo del vault no importa nada de
red"*).

### 2. Validación contra el estándar antes de escribir

`validateVaultRecipe()` reusa las primitivas de `recipe-standard.ts`:
`isJunkIngredient` descarta placeholders, `formatMinutes` normaliza tiempos,
`hasNutrition` oculta la nutrición en ceros, `countryFromSlug` deriva el país.

Nada llega a disco sin pasar por ahí. Un `main_ingredients: ['Ingrediente
principal 1']` (todo relleno) se rechaza con *"Añade al menos un ingrediente
real"*.

### 3. Export/import a JSON con validación

- **Exportar** produce JSON puro: `{format: "gos-recipe-vault", version: 1, exported_at, recipes[]}`.
- **Importar** revalida **cada** receta del archivo. No confía en el JSON ajeno.
- Cada receta importada entra con **id nuevo**, así que una importación **nunca**
  pisa una receta local. Verificado en navegador: un archivo que traía
  `id: "hack-id"` no produjo ningún registro con ese id.

Comportamiento con un archivo hostil (8 entradas: `null`, `"basura"`, `12345`,
receta sin ingredientes, receta solo de relleno, título con HTML, receta con
`__proto__`, receta con id ajeno):

```
Importadas 4 receta(s). 5 receta(s) descartada(s) por no cumplir el estándar.
```

El HTML se guarda como **texto** y Svelte lo escapa al renderizar:

```
HTML interno del nodo: &lt;img src=x onerror=alert(1)&gt;Hack
Elementos <img> inyectados en la página: 0
Object.prototype.polluted: undefined
```

### 4. Aislamiento por instancia

`instance_id` = `'vault-local'`. Otro `instance_id` no ve ni puede borrar las
recetas. Verificado en tests: *«borrar una receta de otro dispositivo no la
toca»*.

## Qué NO existe

| Falta | Consecuencia real |
|---|---|
| **Autenticación** | No hay login, ni registro, ni contraseña. El vault es accesible para cualquiera con el dispositivo desbloqueado. |
| **Backend de persistencia** | Nada sale del dispositivo. `worker/` no participa en el vault. |
| **Sincronización multiusuario** | Dos dispositivos son dos vault aislados. No se ven, no se fusionan. |
| **Cifrado en reposo** | Las recetas se guardan en texto plano en el perfil del navegador. |
| **Copia de seguridad automática** | Si borras datos del navegador o pierdes el móvil, se pierden. Solo el export manual. |
| **Resolución de conflictos** | Sin sync no hay conflictos, pero tampoco hay un merge: importar dos veces el mismo archivo **duplica** las recetas (con ids distintos), no las fusiona. |
| **Cuota / tamaño máximo** | Sin límite explícito. subjecto a la cuota del navegador. |
| **Deshacer** | No hay undo. Borrar es definitivo. |

**No confundir con:** el grafo GOS de recetas públicas (recetas↔ingredientes↔
vitaminas↔sabores↔afecciones), que es contenido del sitio y no tiene relación con
el vault.

## El fallo que ya ocurrió, y por qué los tests no lo cazaron

El código pedía el object store **`'recipe'`** (singular) cuando el que se crea
es **`'recipes'`**. Pasó los tests en verde y rompió en navegador real.

La causa no fue el typo: fue el **entorno de test**. `indexeddb.test.ts` usaba un
fake artesanal con:

- `objectStoreNames.contains: () => true` — aceptaba **cualquier** nombre;
- un `transaction()` que creaba el store bajo demanda.

Con ese fake, `adapter.list('recipe')` funcionaba siempre. El esquema real nunca
se abría, así que nadie miró qué stores existían de verdad.

### Lo que se hizo para blindarlo

1. **`fake-indexeddb@6.2.5`** como devDependency. Implementa la spec: upgrade real,
   `objectStoreNames` real, `NotFoundError` real ante un store inexistente.
2. **`site/src/lib/indexeddb-schema.test.ts`** — contrato del esquema contra
   IndexedDB de verdad. Verifica que los 8 stores se crean, que **ninguno** está
   en singular, el `keyPath`, y que pedir un store inexistente lanza
   `NotFoundError`.
3. `indexeddb.test.ts` (el viejo) queda con un fake permisivo: **pasa 4/4 aunque
   el bug esté presente**. Está confirmado por mutación y es una trampa
   conocida. No es el test que protege el contrato; el que lo protege es
   `indexeddb-schema.test.ts`.

Verificación por mutación (se reintrodujo el singular, se ejecutó, se revirtió):

```
# Con el bug reintroducido
npx vitest run src/lib/indexeddb-schema.test.ts
  → Tests  7 failed | 1 passed (8)

# El suite viejo NO lo detecta:
npx vitest run src/lib/indexeddb.test.ts
  → Tests  4 passed (4)     ← verde con el bug presente

# Suite completa con el bug:
npx vitest run
  → Tests  15 failed | 138 passed | 4 skipped (157)
```

## Segundo fallo encontrado en esta fase (y arreglado)

Probando en navegador real, el vault mostraba **«Este navegador no expone
IndexedDB, así que el vault no puede guardar nada»** con un `NotFoundError`
detrás, en un navegador con IndexedDB perfectamente sano.

Causa: si la base `gos-domain` existe en la **versión correcta (1) pero sin los
stores**, `onupgradeneeded` **no se dispara** —ya no hay upgrade que hacer— y toda
operación posterior muere con `NotFoundError`. El mensaje de la UI culpa al
navegador, que es un diagnóstico falso, y el vault queda muerto para siempre.

Arreglo en `indexeddb.ts`: al abrir, si falta algún store, la base se reconstruye
sola (`deleteDatabase` + reapertura). Es seguro porque **los object stores son
lo único que guarda datos**: una base sin stores está vacía por definición, así
que no se pierde nada. Cubierto por el test *«se autorepara si la base existe en
la versión correcta pero sin stores»*.

> Nota de método: este estado lo provoque una sonda de diagnóstico propia
> (`indexedDB.open('gos-domain', 1)` sin `onupgradeneeded`). Es decir, un
> `open` desatendido es exactamente una de las formas de matar el vault. El
> fallback lo neutraliza.

## Qué haría falta para hacerlo multiusuario

**No implementado. Descripción del camino, no propuesta de trabajo.**

Hoy `instance_id` es una constante (`'vault-local'`). Todo lo demás ya está
preparado: el `StorageAdapter` es una interfaz y `IndexedDBStorageAdapter` es una
implementación más (`domain.ts` tiene también `MemoryAdapter` y D1).

1. **Autenticación** — un proveedor de identidad (OIDC, passkeys). `VAULT_INSTANCE`
   pasaría a derivarse del usuario autenticado, no a ser una constante.
2. **Servidor de sincronización** — un endpoint que persista por
   `(user_id, recipe_id)`. `worker/` ya existe en el repo pero hoy no participa en
   el vault.
3. **Resolución de conflictos** — `updated_at` ya está en cada registro, pero
   hace falta una política: last-write-wins, o CRDT, o prompted-merge. Importar hoy
   duplica en vez de fusionar.
4. **Cifrado en reposo y en tránsito** — hoy es texto plano en el perfil del
   navegador. Multiusuario lo hace inevitable: los datos de un usuario no pueden
   quedar en claro en un dispositivo compartido.
5. **Export/import versionado como formato de migración** — el `version: 1` ya está
   en el payload; haría falta una tabla de migraciones y un `upgrade` explícito.
6. **Cuota y reintentos** — cuántos stores por usuario, resolución de conflictos
   con reintento y límite de tasa.

El orden importa: (1) y (2) son el mínimo para que "multiusuario" signifique algo.
(4) no es opcional en un dispositivo compartido, aunque se posponga.

## Comandos de verificación

```bash
# Suite completa
pnpm --filter gos-site test
# → Test Files 18 passed (18)
# → Tests 159 passed | 4 skipped (163)

# Solo el contrato del esquema
cd site && npx vitest run src/lib/indexeddb-schema.test.ts
# → Tests 15 passed (15)

# Tipos
cd site && npx tsc --noEmit
# → sin salida, exit 0

# Lint
npx biome check site/src/lib/indexeddb-schema.test.ts
# → No fixes applied.

# Prueba manual
pnpm --filter gos-site dev   # → http://localhost:4321/recipes
```

## Nota operativa

En `site/src/pages/recipes/index.astro` el vault se monta con `client:visible`.
En la prueba manual **no hidrató** y el vault se quedó en *«Abriendo el vault
local…»* con los botones inertes —el DOM se ve pero no responde. Se verificó en el
markup: el `astro-island` tenía `client="visible"` sin `client-render-time`,
mientras que otro island de la misma página sí lo tenía. Para la prueba manual
se cambió a `client:load` **temporalmente** y se revirtió después; el archivo está
como en `main`.

Causa no investigada: `client:visible` depende del observer de visibilidad, y la
página tiene ~41 000 caracteres de texto antes del vault. **Queda pendiente**:
si el vault no aparece interactivo en un navegador real, mirar ahí primero.
