# Contrato de salud del ecosistema

[CONTRATO-DATOS.md](./CONTRATO-DATOS.md) es la especificación canónica de GOS. [Los schemas JSON 2020-12](../../schemas/ecosystem/v1/) y `@swal/health-contract` v0.1.0 implementan el intercambio de registros entre Fize, `swal-training` y OrionHealth. [ALLERGENS.md](./ALLERGENS.md) documenta la derivación y el mapeo de la enumeración cerrada de alérgenos.

GOS proporciona IDs de ingredientes, platos y dietas y el dataset nutricional versionado. Cada consumidor usa `@swal/gos-client` para consultar y cachear ese catálogo, sin crear una tabla propia de alimentos. `gosDataset` identifica la versión y el hash del manifest utilizados para calcular nutrientes. `@swal/health-contract` valida la estructura y los formatos; el consumidor comprueba la existencia de las referencias en el catálogo y la vigencia del perfil antes de aplicarlo.

## Flujos de los consumidores

| Consumidor | Produce | Recibe y utiliza |
| --- | --- | --- |
| Fize | `meal-log` del consumo confirmado, con referencias GOS, cantidades, nutrientes y origen del pedido | `dietary-profile` autorizado para filtrar la carta según alérgenos y dietas |
| `swal-training` | `workout-session` con ejercicios `wg:…` (con arte) o `ex:…` (catálogo GOS), series, tiempos y estimación energética | `dietary-profile` autorizado para adaptar metas nutricionales |
| OrionHealth | `dietary-profile` con restricciones, metas y caducidad, tras consentimiento explícito | Comidas, entrenamientos y perfiles; historial local y eventual mapeo FHIR |

Un pedido no confirma por sí solo que alguien consumió una comida: Fize obtiene esa confirmación antes de exportar. OrionHealth también puede registrar comidas manualmente. Los ejercicios usan IDs del catálogo vendorizado `@bryllim/workout-guide@1.0.0`; los adaptadores mantienen su atribución y licencia CC BY-SA 4.0.

Los registros permanecen en el dispositivo y viajan directamente entre dispositivos. Ningún backend SWAL almacena datos de salud de usuarios. `subject` es un seudónimo local `subj_<ULID>`: nunca nombre, correo o documento. Cada receptor confirma a qué sujeto local corresponde la importación; el ID no demuestra identidad ni consentimiento. OrionHealth solo comparte el perfil dietético autorizado y no exporta condiciones, vitales ni historial clínico. El consumidor muestra qué va a compartir, con quién y hasta cuándo.

## API TypeScript

El paquete es ESM, sin dependencias de runtime. Dentro de un workspace pnpm, el consumidor declara `"@swal/health-contract": "workspace:^"`; al distribuirlo se usa la versión `0.1.0`. Los tipos y funciones se importan desde la raíz del paquete:

```ts
import {
  ulid,
  makeRecord,
  validateRecord,
  toFile,
  fromFile,
  encodeDeepLink,
  decodeDeepLink,
  DeepLinkSizeError,
} from '@swal/health-contract';

const profile = makeRecord('dietary-profile', {
  allergens: ['gos:allergen/peanut'],
  diets: ['gos:diet/mediterranean'],
  targets: { kcalPerDay: 2200, proteinGPerDay: 140 },
  expiresAt: '2026-10-03T18:00:00Z',
}, {
  subject: `subj_${ulid()}`,
  source: { app: 'orionhealth', version: '1.0.0' },
  gosDataset: `1.4.0+sha256:${'a'.repeat(64)}`,
});

const result = validateRecord(profile); // { ok, errors: [] }
const text = toFile([profile]);         // guardar como .swalhealth.json
const records = fromFile(text);

try {
  const url = await encodeDeepLink(records, 'https://example.org/import');
  const imported = await decodeDeepLink(url);
  // Confirmar sujeto, consentimiento y caducidad antes de usar imported.
} catch (error) {
  if (error instanceof DeepLinkSizeError) {
    // Ofrecer exportar text como archivo .swalhealth.json.
  } else {
    throw error;
  }
}
```

`makeRecord(type, data, { subject, source, gosDataset })` genera `id` y `createdAt`, construye el discriminador `schema` y valida el resultado. `ulid()` genera identificadores en el dispositivo. `validateRecord(x)` recibe datos desconocidos y devuelve `{ ok, errors }`. Los helpers de transporte validan todos los registros; `ContractValidationError` conserva `errors` para mostrar el motivo de rechazo. Los receptores no guardan importaciones que fallen.

## Archivo y deep link

`toFile(records): string` y `fromFile(text): HealthRecord[]` son síncronos. El archivo `.swalhealth.json` contiene un array JSON de sobres completos; también se permite el array vacío. Es el transporte siempre disponible y el fallback para registros grandes.

`encodeDeepLink(records, base): Promise<string>` y `decodeDeepLink(url): Promise<HealthRecord[]>` son asíncronos. Con `CompressionStream`, `p` contiene `base64url(gzip(UTF8(JSON)))`, sin padding. Sin compresión disponible, se usa `j.` seguido de `base64url(UTF8(JSON))`. Ese prefijo forma parte del formato v1 y permite que Dart distinga ambos modos. Importar gzip sin `DecompressionStream` lanza `CompressionUnavailableError`; la app ofrece importar un archivo en ese dispositivo.

En HTTPS el payload va en el fragmento `#p=…`, que no se envía al servidor en una petición HTTP. En el esquema de app `orionhealth://import`, va en `?p=…`. Los helpers conservan otros parámetros; rechazan un `p` duplicado entre query y fragmento. El fragmento y gzip no cifran el registro: el usuario comparte el enlace únicamente con el destino autorizado y la app evita registrarlo en logs, analítica o telemetría.

El límite es **8192 bytes UTF-8 del valor codificado de `p`**, tanto al exportar como al importar. `DeepLinkSizeError` expone `payloadBytes` y `limitBytes` y recomienda exportar archivo. La UI ofrece esa alternativa; no trunca registros ni los divide sin informar al usuario.

El mesh cifrado con `@swal/vault` entre dispositivos del mismo sujeto es una fase posterior. Este paquete no implementa sincronización, identidad ni almacenamiento.

## Espejo Dart y fixtures

OrionHealth implementa `packages/health_contract` en Dart tomando los schemas y el contrato canónico como referencia. Reutiliza **sin modificar** los JSON de `schemas/ecosystem/v1/fixtures/{valid,invalid}` en sus golden tests: los nombres indican el tipo y el caso, y los archivos no incluyen lógica específica de JavaScript. Los tests TypeScript comparan la validación manual con Ajv 2020-12 sobre esos mismos fixtures; Ajv solo se usa durante tests.

Cada cambio normativo actualiza conjuntamente el contrato, los schemas, tipos, validadores, fixtures y su implementación Dart. Se mantiene sincronizada la copia de coordinación en `docs/ecosistema-salud/CONTRATO-DATOS.md` del workspace SWAL; ante divergencias, la versión de este repo es canónica.

## Desarrollo y verificación

Desde la raíz: `pnpm install`, `pnpm --filter @swal/health-contract build` y `pnpm --filter @swal/health-contract test`. El build genera `dist/` con JavaScript ESM y declaraciones TypeScript; `prepack` lo ejecuta antes de empaquetar. Se requiere un entorno moderno con Web Crypto, TextEncoder/TextDecoder y base64 web; gzip usa las APIs web nativas, sin dependencias de runtime.

Los fixtures incluyen tres válidos por schema y diez inválidos para `envelope`, `meal-log` y `workout-session`, once para `dietary-profile`. También se prueban fechas de calendario, propiedades desconocidas/ausentes, gzip interoperable, fallback UTF-8, importaciones malformadas y el límite exacto de 8192 bytes.
