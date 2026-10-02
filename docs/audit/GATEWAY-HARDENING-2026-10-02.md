# Hardening del gateway `gos-api-gateway` (2026-10-02)

Rama `salud/g6`. Cubre N-03, N-04, F-01, F-02 y los pendientes 8-10 del plan. Sin deploy.

## Cambios

| Hallazgo | Cambio | Test |
|---|---|---|
| N-03 ledger elegido por el cliente | El ledger (`credit_ledger`, D1) se indexa por `key:<sha256(key)[0..32]>` de la key autenticada. El `appId` del body se ignora. | `hardening.test.ts` N-03 (3 casos) |
| N-04 rate limit nominal | Antes de cualquier D1/billing: rechazo barato 401 para keys con forma invalida (`^[A-Za-z0-9_.-]{1,128}$`) y throttle 429 por IP y por prefijo de key (8 chars) tras `AUTH_FAIL_LIMIT` fallos/hora (def. 20, contador en KV, solo cuentan fallos para no penalizar keys validas tras NAT). | N-04 (3 casos) |
| Contador no atomico | Reserva con una sentencia `UPDATE credit_ledger SET used = used + ? WHERE key_id=? AND period=? AND used + ? <= cuota RETURNING used`; ajuste posterior al consumo real, devolucion si falla la IA. No hay DO en wrangler.toml, se usa D1. | 5 peticiones concurrentes: exactamente 2 caben |
| F-01 fail-open del ledger | Sin D1 o D1 caida: 503 (antes `used = 0`). | caso "sin D1" |
| `/api/entities/*` | Gateway: POST/PUT/DELETE requieren key de pago (403 si no). Sitio: se eliminaron los handlers POST/PUT/DELETE de `site/src/pages/api/entities/[entity].ts` (sin callers, sin auth, sitio estatico); queda GET. | 403 sin key; con key se reenvia |
| Prototype chain | `isTierId` (`Object.hasOwn`) en `site/src/lib/billing.ts`, usado por `ask.ts` y `pay.ts`. `pay.ts` devuelve 400 ante tier desconocido (antes caia a `socio`). | `site/.../pay.test.ts` |
| `?key=` | Ya no autentica ni se reenvia al origen (se borra del query reenviado). | `?key=` no reenviado |
| Nombre del secreto | Canonico `SERVICE_SHARED_SECRET` (wrangler.toml); `BILLING_SERVICE_SECRET` se sigue leyendo, marcado deprecado en `Env`. | ambos nombres |

Tambien: el proxy ahora reenvia el body en metodos no GET/HEAD (solo alcanzables con key de pago en entities).

## Gates (medidos)

- worker typecheck: OK
- worker tests: 3 ficheros, 67 passed (base 56; +11 en `hardening.test.ts`, 1 test existente de `?key=` actualizado). Sin los cambios de `src/index.ts`, 12 fallan.
- site vitest: 24 ficheros, 259 passed, 4 skipped (base 257; +2 de `pay.test.ts`).
- `biome ci` no se ejecuto (sin node_modules en la raiz del worktree): formatear antes del commit.

## Pendiente del owner

1. Aplicar `worker/schema.sql` en la D1 de produccion (`wrangler d1 execute gos-billing --file=worker/schema.sql --remote`): crea `credit_ledger`. Sin la tabla, `/api/ai/infer` responde 503 (fail-closed).
2. Confirmar que el binding D1 `DB` esta activo en prod (health reportaba `d1: not bound`).
3. Definir el secreto `SERVICE_SHARED_SECRET` (`wrangler secret put`) y retirar `BILLING_SERVICE_SECRET`.
4. Rotar las keys expuestas (N-02) y limpiar historial; este cambio no toca eso.
5. Deploy del gateway (issue #257). No hecho.
6. Limitaciones conocidas: el throttle de fallos y el contador free-tier por IP siguen en KV (no atomico, eventual); aceptable como freno, no como cuota. Los creditos previos en KV `credits:<appId>` no se migran (eran manipulables).
