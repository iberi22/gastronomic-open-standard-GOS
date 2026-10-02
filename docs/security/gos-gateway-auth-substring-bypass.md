# Bypass de autenticacion por substring en el gateway GOS

Estado: **corregido en codigo, pendiente de despliegue**.
Worker afectado: `gos-api-gateway` (`https://gos-api-gateway.iberi22.workers.dev`).

## Que pasaba

Cualquier valor de `x-api-key` que contuviera la subcadena `socio` o `paid`
obtenia tier de pago **ilimitado**, sin existir en la base de datos. Medido en
produccion antes del fix:

```
$ curl -D - -H 'x-api-key: miso_socio_test' https://gos-api-gateway.iberi22.workers.dev/api/all.json
HTTP/2 200
x-ratelimit-limit: unlimited
x-ratelimit-remaining: unlimited
x-ratelimit-tier: tiersocio
```

Existian dos ramas, ambas en `worker/src/index.ts`:

1. **Dentro del `catch` de D1.** Si la consulta a `api_keys` lanzaba, se
   reintentaba con un match por contenido. Un fallo de base de datos se
   traducía en "quiza esta key es de pago".
2. **Sin binding `DB`** (dev local): mismo match por contenido.

## Por que era alcanzable en produccion, no solo en dev

La tabla `api_keys` **nunca se aplico** ni en local ni en remoto:

```
$ npx wrangler d1 execute gos-billing --remote --command "SELECT COUNT(*) FROM api_keys"
no such table: api_keys: SQLITE_ERROR [code: 7500]
```

La DB remota solo tiene `credits`, `invoices`, `entity`, `seed_registry`,
`sealed_meta`, `_cf_KV`. Por lo tanto **toda** consulta de autenticacion
lanzaba y caia en el `catch` (rama 1). No era un borde teorico: era el camino
normal. La unica evidencia que confirmaba la rama 1 era el 401
`Key validation failed` de una key sin subcadena; una key con `paid` salia por
el otro lado del `if`.

## El fix

- Se eliminaron las dos ramas de match por contenido.
- Un fallo de D1 responde **503** con `Retry-After`, nunca 401 ni 200. 401
  seria incorrecto: afirma que la credencial es invalida cuando en realidad no
  se pudo consultar la fuente de verdad.
- Sin binding `DB` la respuesta tambien es 503: sin key store no hay forma de
  validar nada, y adivinar no es una opcion de seguridad.
- La consulta es parametrizada (`key = ? AND status = ?`) y exige
  `status = 'active'` y `expires_at` vigente, donde NULL significa sin
  vencimiento.
- `worker/schema.sql` define la tabla real con `key, tier, status, owner,
  created_at, expires_at` mas `idx_api_keys_key` / `idx_api_keys_status`, sin
  ninguna credencial sembrada.

## Tests

`worker/test/auth.test.ts` + `worker/test/schema.test.ts` (`npm test` en
`worker/`). El adaptador D1 de los tests esta respaldado por **SQLite real**
(`node:sqlite`), no por un mock de valores fijos: la razon de fondo del bug fue
que la consulta fallaba de verdad, y un doble que devuelve filas a pedido
habria dado verde con el bug presente.

Casos: key con `socio`/`paid` ausente de la DB y D1 caida -> 503 sin acceso;
key con substring y D1 sana pero desconocida -> 401; key activa real -> 200
con tier real de la fila; key expirada o con `status` distinto de `active` ->
401; D1 que lanza -> 503; tabla `api_keys` inexistente -> 503; inyeccion SQL en
la key -> 401; query parametrizada; schema sin credenciales.

### Gate de mutacion

`worker/test/mutation-check.sh` reintroduce una a una las cinco ramas
vulnerables y exige que la suite se ponga roja. Un suite que solo pasa no
demuestra cobertura; este es el mecanismo que la demuestra.

## Comandos pendientes (NO ejecutados)

Despliegue del fix, requiere autorizacion explicita:

```bash
cd worker
npm test                                  # 46+ tests
./test/mutation-check.sh                  # gate de mutacion

# 1. aplicar el esquema que nunca existio (REMOTO, muta la DB de produccion)
npx wrangler d1 execute gos-billing --remote --file=./schema.sql

# 2. sembrar una key real de pago (placeholder, NO en git)
npx wrangler d1 execute gos-billing --remote --command \
  "INSERT INTO api_keys (key, tier, status) VALUES ('<KEY_REAL>', 'tiersocio', 'active')"

# 3. desplegar el worker corregido
npx wrangler deploy
```

El paso 1 es el que enciende la autenticacion real. Sin el, el gateway pasa a
responder 503 a toda key: fail-closed correcto, pero sin servicio hasta que se
aplique el esquema.

## Verificacion contra el endpoint desplegado

El endpoint en produccion **sigue sirviendo la version vulnerable** hasta que
se ejecute el deploy. Comprobacion usada antes y despues del deploy:

```bash
# debe dar 503 (no 200) tras el deploy
curl -s -o /dev/null -w '%{http_code}\n' \
  -H 'x-api-key: xyzpaidabc' https://gos-api-gateway.iberi22.workers.dev/api/all.json
```
