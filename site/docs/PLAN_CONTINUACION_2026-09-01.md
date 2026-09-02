# PLAN CONTINUACION — Template SWAL + AUI + Socio + Infra 20% (2026-09-01)

> Estado actual (31-08-2026) — builds verdes:
> - `cores/swal-app-template` canonico separado (Astro 7 + Svelte 5 + @swal/ui + vite-pwa + cloudflare + AUI + billing 20% + domain.config)
> - `apps/gara-g/packages/app-pwa` (03.01 scaffold del otro agente, replicado, check 0, build 1.38s)
> - `apps/hosteler-ia/src-astro` (F0, check 0, build 898ms, plan migracion hosteler-ia Fase 0)
> Otro agente sigue en `apps/gara-g` ola 32 islands (01.x cores/swal-econ, 02.x wraps, 03.02 fleet Yjs, 04.x mesh/xavier/billing, 05.x mobile, 06.x ADAS, 07.x marketplace, 08.x E2E). Este plan NO pisa esa ola.

## Objetivo siguiente

Dejar el **template usable para que cualquiera cree una app en 2 comandos, con modelo de negocio 20% + AUI + credito socio via Cloudflare**, y llevar 2 apps piloto (hosteler-ia y gara-g) a prod Cloudflare Pages con metering real.

## Principios (no negociables)

- Template es isla autonoma en `cores/swal-app-template` — todo se implementa ahi y se replica (no fork en cada app).
- AUI whitelisteada + lockedKeys (seguridad MALOCA_UI_JSON_CANVAS.md).
- Cloudflare power: R2/D1/KV/AI metering 100% + SWAL 20% handling + AI margin 10% min (ver `src/lib/billing.ts`).
- Socio tier = credito inferencia (50k) + R2 quota; `self-managed` vs `swal-managed` mismo sub.
- No reintroducir Stripe para Pro — socio es para pago infra/creditos, Pro = nodo activo (GOAL).

## Fases siguientes (orden, dependencias, DoD)

### FASE 1 — Template estable + tests + docs (3 dias)

**Objetivo:** template con 0 warnings, tests, y ejemplo `mi-tienda` creado via script.

| Tarea | Archivos | AC verificable |
|-------|----------|----------------|
| 1.1 Tests AUI + billing | `src/lib/aui.test.ts` (validateAui whitelist/locked), `src/lib/billing.test.ts` (calculatePrice 20%/10%, creditStatus) | `pnpm test --filter @swal/app-template` 0 failed |
| 1.2 Playwright AUI render | `tests/e2e/aui-render.spec.ts` (AuiRenderer pinta Card/Button del demo) | `pnpm exec playwright test` 3 passed |
| 1.3 Ejemplo via create-app | `apps/demo-tienda` generada con `create-app.mjs mi-tienda --entities "product,order"` | `ls apps/demo-tienda/src/lib/domain.config.ts` + `pnpm --filter demo-tienda build` 0 errors |
| 1.4 Docs template | `README.md` + `docs/PLAN_AUI_BILLING_20PCT.md` ya existen; añadir `USAGE.md` con API AuiRenderer/billing | `grep -c "AuiRenderer" README.md >=1` |
| 1.5 CI template | `.github/workflows/ci-template.yml` (check + build + test) | CI green |

**DoD Fase 1:** `pnpm run check && pnpm run build && pnpm test` en `cores/swal-app-template` 0 errors; `apps/demo-tienda` existe y buildea.

### FASE 2 — Dominio -> SurrealDB (edge-hive) (5 dias)

**Objetivo:** `domain.config.entities[]` genera tablas SurrealDB + Zod schemas + CRUD via edge-hive WASM.

| Tarea | Archivos | AC |
|-------|----------|----|
| 2.1 Proto codegen | `cores/swal-app-template/src/lib/domain.ts` (helpers CRUD: create/list/get/update/delete por entity, instance_id isolation) | `grep -c "instance_id" src/lib/domain.ts >=1` |
| 2.2 Edge-hive stub local | `edge-hive/` docker compose (SurrealDB) + `src/lib/surreal.ts` (WS) | `cargo check -p edge-hive`  0 errors (si Rust local, sino mock) |
| 2.3 Demo hosteler-ia | `apps/hosteler-ia/src-astro/src/lib/domain.ts` mapea Restaurant/Table/Order a SurrealDB | `pnpm --filter hosteler-astro build` ok |
| 2.4 Demo gara-g | `apps/gara-g/packages/app-pwa/src/lib/domain.ts` mapea Vehicle/Fleet/Telemetry | `pnpm --filter @gara-g/app-pwa build` ok |

**Depende de:** Fase 1. Paralelizable con Fase 3 si hay Rust.

### FASE 3 — Worker AI real + D1 ledger + R2 (4 dias)

**Objetivo:** `/api/ai/infer` deja de ser example.ts y mete metering real.

| Tarea | Archivos | AC |
|-------|----------|----|
| 3.1 Wrangler bindings provision | `wrangler.toml` descomentado R2/D1/KV/AI + `wrangler d1 create`/`r2 bucket create` | `wrangler d1 execute --command "SELECT 1"` 0 errors |
| 3.2 Worker `workers/ai.ts` (Hono) | `src/lib/worker-ai.example.ts` -> `workers/ai.ts` real (ver plantilla, con env AI/D1/KV) | `wrangler deploy --dry-run`  0 errors |
| 3.3 Billing D1 ledger | `D1` tabla `credits(appId, used, tier, updatedAt)` + `invoices` | `pnpm --filter billing test` ledger ok |
| 3.4 ProBadge + credito UI | `src/components/ProBadge.svelte` (ya existe en @swal/ui? sino port) + `src/components/CreditMeter.svelte` | `grep -c "remaining" CreditMeter.svelte >=1` |
| 3.5 Pricing e2e | Test `cfAiInfer` -> 402 cuando agotado, 200 con cost + D1 increment | `pnpm test` cfAiInfer 2 casos ok |

**Modelo negocio verificado:** `calculatePrice(infra=0.50, aiBase=0.30)` -> aiWithMargin 0.33, subtotal 0.83, handling 0.166, total 0.996 (infra 100% + AI 10% min + 20% handling).

### FASE 4 — Yjs fleet + Xavier sync + mesh (4 dias)

**Objetivo:** offline-first + realtime P2P para entidades de dominio.

| Tarea | Archivos | AC |
|-------|----------|----|
| 4.1 Fleet Yjs (03.02) | `src/lib/yjsFleet.ts` + `fleetStore.ts` (Y.Doc + IndexedDBStorage) | `pnpm run build` + e2e offline add item -> sync |
| 4.2 Xavier sync (04.02) | `src/lib/xavierSync.ts` (heartbeat 60s, queue IndexedDB -> POST :8006) | `xavierSearch` con ns `app/{appId}/instance/{id}` ok |
| 4.3 Mesh publish (04.01 bridge TS) | `src/lib/mesh.ts` pasa de stub a Yjs Y.Array `bus:events` | `meshPublish('order:created', {...})` llega a peer |
| 4.4 AUI via mesh | `saveAuiSpec` ya hace meshPublish `aui:update` — verificar subscripcion en peer | `grep -c "aui:update" src/lib/aui.ts >=1` |

### FASE 5 — Prod Cloudflare Pages + observabilidad (3 dias)

| Tarea | Archivos | AC |
|-------|----------|----|
| 5.1 Deploy 2 pilotos | `apps/hosteler-ia/src-astro` -> `fize.pages.dev`, `apps/gara-g/packages/app-pwa` -> `gara-g.pages.dev` | `curl https://fize.pages.dev` 200, `curl https://gara-g.pages.dev` 200 |
| 5.2 Headers + PWA | `_headers` immutable Cache-Control, manifest 192/512, sw.js precache | Lighthouse PWA 90+ |
| 5.3 Observabilidad | `workers/analytics.ts` (log handling total, infra, AI tokens) + D1 dashboard | `SELECT sum(total) FROM invoices` ok |
| 5.4 Docs negocio | `docs/SWAL/BILLING_SOCIO_20PCT.md` (publico) + `TEMPLATE.md` usage | `ls docs/SWAL/BILLING*` exists |

### FASE 6 — Gobernanza + kit crear apps (2 dias)

| Tarea | Archivos | AC |
|-------|----------|----|
| 6.1 `pnpm create @swal/app` alias | `package.json` root `create-swal-app` -> `cores/swal-app-template/scripts/create-app.mjs` | `pnpm create @swal/app test-6 --target /tmp/test-6` 0 errors |
| 6.2 Registry | `docs/SWAL/PROJECT_MAP.md` añade `swal-app-template` como infra | `grep -c "swal-app-template" PROJECT_MAP.md >=1` |
| 6.3 Video/docs | `cores/swal-app-template/docs/DEMO_2MIN.md` (gif + 2 comandos) | `ls docs/DEMO*` exists |

## Orden ejecucion recomendado (si solo muse-spark, sin subagentes)

Semana 1: Fase 1 (template tests) + Fase 2 inicio (domain.ts)
Semana 2: Fase 3 (Worker AI) en paralelo con Fase 4 (Yjs) — son islas disjuntas
Semana 3: Fase 5 deploy + Fase 6 registry

Cada fase: `astro check` 0 errors + `pnpm build` 0 errors + `pnpm test` 0 failed antes de siguiente.

## Riesgos y mitigacion

- Otro agente toca `apps/gara-g` (ola 32) -> no tocar `packages/app-pwa` mas alla de lo ya sincronizado; trabajar en `cores/swal-app-template` (isla separada).
- `hono` no estaba en template -> quitado del example, no afecta build (verificado).
- Cloudflare bindings requieren provision manual -> dejar comentados en wrangler.toml hasta Fase 3, builds no bloquean.
- Tailwind PostCSS conflicto monorepo -> postcss.config.mjs solo autoprefixer (ya fix).

## Checklist cierre

- [ ] `cores/swal-app-template` check/build/test 0 errors
- [ ] `apps/demo-tienda` generada via script y buildea
- [ ] Worker AI real factura con 20% handling (test 402/200)
- [ ] 2 pilotos desplegados en Cloudflare Pages
- [ ] Docs billing publico + demo 2min
