# Contrato de datos del ecosistema de salud SWAL — v1 (borrador 2026-10-02)

Apps: **GOS** (fuente de verdad de alimentos), **Fize** (hosteler-ia: carta, pedidos, recetas de cocina), **App de entrenamiento** (nueva, nombre de trabajo `swal-training`), **OrionHealth** (salud personal, local-first, Gemma on-device).

## Principios

1. **GOS es la única fuente de alimentos.** Ninguna app mantiene su propia tabla de ingredientes o nutrición; guardan IDs de GOS y una copia cacheada versionada (`@swal/gos-client`).
2. **Local-first, sin servidor con datos de salud.** Los registros viajan dispositivo→dispositivo (archivo, deep link, mesh). Ningún backend SWAL almacena registros de salud de usuarios (coherente con: mesh sin datos de usuario).
3. **Divulgación mínima.** OrionHealth recibe todo; solo emite `dietary-profile` (alérgenos, dietas, metas). Nunca emite condiciones, vitales ni historial.
4. **Un solo core de UI.** Todas las apps web usan `@swal/ui` (tema Bone Warm Minimalist + app-shell extraído de Fize).

## Identificadores

| Entidad | Formato | Fuente |
|---|---|---|
| Ingrediente | `gos:ingredient/<slug>` | GOS `ingredients/<grupo>/<slug>.md` |
| Plato | `gos:dish/<pais>/<slug>` | GOS `dishes/<pais>/<slug>.md` |
| Dieta | `gos:diet/<slug>` | GOS `site/src/content/diets` |
| Alérgeno | `gos:allergen/<slug>` | tags de alérgeno de GOS (lista cerrada, a definir en schema v1) |
| Ejercicio | `wg:<slug>` | `@bryllim/workout-guide@1.0.0` (vendorizado, CC BY-SA 4.0) |
| Registro | ULID | generado en el dispositivo |
| Sujeto | `subj_<ulid>` seudónimo local | nunca nombre, correo ni documento |

## Sobre común

```json
{
  "schema": "swal.health/v1/<tipo>",
  "id": "01J…",
  "subject": "subj_01J…",
  "createdAt": "2026-10-02T18:00:00Z",
  "source": { "app": "fize|training|orionhealth|gos", "version": "x.y.z" },
  "gosDataset": "1.4.0+sha256:abcd…",
  "data": { }
}
```

`gosDataset` = versión del manifest de GOS con que se calcularon los nutrientes (reproducibilidad).

## Tipos

### `meal-log` (Fize → OrionHealth; también entrada manual en OrionHealth)

```json
{
  "consumedAt": "…", "mealType": "breakfast|lunch|dinner|snack",
  "items": [
    { "ref": "gos:dish/colombian/ajiaco", "servings": 1 },
    { "ref": "gos:ingredient/aguacate", "grams": 80 }
  ],
  "nutrition": { "calories": 0, "protein_g": 0, "fat_g": 0, "carbs_g": 0, "fiber_g": 0, "sugar_g": 0, "micros": {} },
  "nutritionSource": "computed|declared|unknown",
  "origin": { "app": "fize", "venue": "<tenant-id opcional>", "orderId": "<opcional>" }
}
```

### `workout-session` (entrenamiento → OrionHealth)

Widened 2026-10-04 while porting openGym: the v1 shape could not express a real gym log, so a session
exported from the training app lost most of itself. What was added is exactly what the port proved
is needed — nothing speculative.

```json
{
  "startedAt": "…", "endedAt": "…",
  "routineId": "<opcional>",
  "exercises": [
    { "ref": "wg:barbell-bench-press", "notes": "<opcional>", "topWeightKg": 62.5,
      "sets": [
        { "reps": 8, "weightKg": 20, "phase": "warmup" },
        { "reps": 5, "weightKg": 60, "rir": 2 },
        { "reps": 5, "weightKg": 100, "shape": "dropset",
          "drops": [{ "weightKg": 80, "reps": 5 }] },
        { "reps": 12, "weightKg": 60, "shape": "restpause",
          "clusters": [{ "reps": 6, "restSec": 15 }] },
        { "durationS": 45 },
        { "distanceM": 5000, "durationS": 1500, "speedKph": 12 }
      ] },
    { "ref": "wg:one-arm-row",
      "sets": [ { "sides": { "L": { "weightKg": 40, "reps": 5, "weightOrigin": "manual" },
                               "R": { "weightKg": 32, "reps": 8 } } } ] }
  ],
  "energy": { "kcal": 310, "method": "met-estimate" },
  "perceivedEffort": 7, "notes": ""
}
``````

Why each field:

- **`sides`** — a unilateral exercise is trained one limb at a time and **the asymmetry is the point**
  of tracking it. A single combined row cannot hold 40 kg × 5 left and 32 kg × 8 right.
- **`drops`** — a main set followed by lighter drops logged with no rest. The main set is the row's own
  load; the drops are extra volume on top of it.
- **`clusters`** — **not the same as `drops`**: on a rest-pause row the row's own `reps` **already is**
  the total across every burst, so `clusters` only says how that total breaks down and **must never be
  added to it again** (that would double-count).
- **`phase`** — a warm-up set is not training. Counting it would overstate the session.
- **`rir`** — effort as reps in reserve, alongside `rpe`. **Mutually exclusive per set**: each set keeps
  the scale it was logged with, and nothing else reads the value.
- **`speedKph`** — cardio without pace is not a cardio record.
- **`weightOrigin: manual`** — the load was set by hand here, so a later cascade must not overwrite it.

`estimated1RmKg` is deliberately **not** in the contract: a 1RM is a function of the estimator and its
inputs, so whoever reads the session recalculates it. Persisting it would let two apps disagree about
the same lift.

### `workout-plan` (the prescribed routine, so a plan can travel between apps)

A session is half a training record: without the plan it was written against, the next prescription
cannot be derived — and deriving it is what avoids storing a number that drifts from the log that
produced it. The progression policy travels with it, because a target without its rule is not
reproducible.

```json
{
  "name": "Push A",
  "progression": "off | linear | greyskull | double | time",
  "exercises": [
    { "ref": "wg:barbell-bench-press", "sets": 4, "reps": 8, "repsMin": 6,
      "weightKg": 60, "inc": 2.5 },
    { "ref": "wg:push-up", "sets": 3, "reps": 15, "bodyweight": true, "inc": 2 }
  ]
}
```

`repsMin` requires `reps`, and the lower bound must stay below it. JSON Schema 2020-12 cannot compare
two sibling properties, so the hand-written validator enforces the ordering and the TS type narrows it.

### `bodyweight-log` (body weight over time)

Separate from `workout-session` because it is a different cadence and a different consumer: the
weigh-in answers "how is the trend going", not "what did you do". Folding it into a session would mix
a slow signal with a fast one and make both harder to read.

```json
{ "entries": [{ "date": "2026-09-01", "weightKg": 82.4 }] }
```

`date` is a calendar date (YYYY-MM-DD), not a timestamp: a weigh-in is "the morning of", and asking for
a time would let two apps disagree about which day the same weigh-in belongs to.

### `dietary-profile` (OrionHealth → Fize / entrenamiento, con consentimiento explícito)

```json
{
  "allergens": ["gos:allergen/peanut"],
  "diets": ["gos:diet/mediterranean"],
  "targets": { "kcalPerDay": 2200, "proteinGPerDay": 140 },
  "expiresAt": "…"
}
```

## Transporte (en orden de implementación)

1. **Archivo** `.swalhealth.json` (array de registros): export/import en todas las apps. Siempre disponible.
2. **Deep link / Web Share Target**: `https://orionhealth…/import#p=<base64url(gzip(json))>` y `orionhealth://import?p=…` (Android App Links). Payload máx. ~8 KB; si es mayor, archivo.
3. **Mesh** (`cores/edge-mesh`, Yjs/WebRTC) entre dispositivos del mismo sujeto, cifrado E2E con `@swal/vault`. Fase posterior.

## Mapeo FHIR en OrionHealth

| Registro | FHIR | Código |
|---|---|---|
| `workout-session` | `Observation` (panel) + componentes | LOINC 73985-4 (actividad física), 55411-3 (duración ejercicio), 41981-2 (kcal quemadas) |
| `meal-log` | `NutritionIntake` (R5) / `Observation` | LOINC 9052-2 (ingesta calórica) |
| `dietary-profile` | `AllergyIntolerance` + `NutritionOrder.oralDiet` | — |

## Artefactos a construir

- `GOS/schemas/ecosystem/v1/{envelope,meal-log,workout-session,workout-plan,bodyweight-log,dietary-profile}.schema.json` + tests de validación.
- Paquete `@swal/health-contract` (GOS `packages/health-contract`): tipos TS, validadores sin dependencias, `encodeDeepLink`/`decodeDeepLink`, `toFile`/`fromFile`.
- Dart: `packages/health_contract` en OrionHealth (modelos + parser) generado/espejado de los schemas, con golden tests compartidos (mismos fixtures JSON).

## Especificación normativa implementada v1

Este documento en GOS (`docs/ecosystem/CONTRATO-DATOS.md`) es canónico. La copia de coordinación `docs/ecosistema-salud/CONTRATO-DATOS.md` del workspace SWAL se mantiene idéntica. Los schemas de `schemas/ecosystem/v1/` son JSON Schema 2020-12; los fixtures son sobres completos, incluidos los casos de `envelope`.

- Los sobres y objetos de datos son cerrados (`additionalProperties: false`). `micros` es un mapa abierto de slugs de micronutriente a números no negativos; las unidades corresponden al dataset GOS. No admite texto ni valores desconocidos: se usa `{}` si no hay micronutrientes conocidos.
- Los ULID usan Crockford en mayúsculas, 26 caracteres, primer carácter `0–7`; `subject` usa exactamente `subj_` seguido de ULID. Los slugs de referencias usan ASCII minúsculo alfanumérico, con separadores `-` o `_` internos. Las referencias validan formato, no existencia en el catálogo.
- Las fechas requieren fecha de calendario válida, hora, segundos y zona (`Z` o offset `±HH:MM`); se permiten fracciones de segundo y `t`/`z` minúsculas. No se admiten segundos intercalares. La aplicación comprueba orden temporal, vigencia del perfil e identidad local del sujeto.
- `source.app`: `fize`, `training`, `orionhealth` o `gos`; `source.version`: tres componentes numéricos con prerelease/build opcionales. `gosDataset`: `x.y.z[-prerelease]+sha256:` y 64 dígitos hexadecimales minúsculos del manifest. No se permite `latest`.
- `meal-log` requiere todos los campos del ejemplo. `items` no puede estar vacío; cada elemento admite exactamente una cantidad positiva (`grams` o `servings`), con cualquier ref de ingrediente/plato. Los seis nutrientes principales y `micros` son obligatorios y no negativos. `origin.app`: `fize`, `orionhealth` o `gos`; `venue` y `orderId` son opcionales y, si existen, no vacíos. `unknown` indica procedencia desconocida, no certeza de los valores declarados.
- `workout-session` requiere `startedAt`, `endedAt` y `exercises` no vacío; cada ejercicio requiere ref y `sets` no vacío. Cada serie contiene al menos uno de `reps` (entero positivo), `durationS` o `distanceM` (positivos), o bien `sides` con un número en cada extremidad. `rir` y `rpe` son excluyentes en la misma serie; `drops` exige `shape: dropset` y `clusters` exige `shape: restpause`; `speedKph` solo con `distanceM`. `weightKg` es no negativo; `rpe` y `perceivedEffort` están entre 0 y 10. `routineId`, `energy`, `perceivedEffort`, `notes` son opcionales; `routineId` no vacío. `energy` exige `kcal` no negativo y `method`: `met-estimate`, `device`, `declared` o `unknown`.
- `dietary-profile` requiere `allergens`, `diets`, `targets` y `expiresAt`. Las listas admiten vacío y no duplicados. `targets` admite vacío; sus únicos campos opcionales son `kcalPerDay` positivo y `proteinGPerDay` no negativo. No incluye condiciones clínicas. El enum de alérgenos y su derivación están en [ALLERGENS.md](./ALLERGENS.md): los 14 grupos UE; el frontmatter actual no aporta etiquetas positivas adicionales.
- Archivo: array JSON de registros completos, incluso vacío, sin wrapper. Los transportes validan cada registro al importar y exportar. Errores de datos usan `ContractValidationError` con `errors[]`.
- Deep link: HTTPS usa fragmento `p`; `orionhealth:` usa query `p`. El valor normal es base64url sin padding del gzip de JSON UTF-8, interoperable con Dart. Si no existe `CompressionStream`, se emite `j.` seguido de base64url del JSON UTF-8 sin comprimir. El decoder distingue ambos formatos; gzip sin `DecompressionStream` produce `CompressionUnavailableError` recomendando archivo. Los parámetros ajenos se conservan y los payloads duplicados se rechazan.
- Límite estricto: 8192 bytes UTF-8 del valor codificado `p`, incluido `j.` si aplica, tanto importación como exportación. `DeepLinkSizeError` expone `payloadBytes` y `limitBytes` y recomienda archivo. La importación gzip limita la salida descomprimida a 1 MiB para evitar expansión desproporcionada; archivos no tienen este límite. El transporte no cifra ni autentica registros.
