# SWAL — Modelo de negocio 20% + AUI + Socio via Cloudflare (update 2026-08-31)

Este archivo actualiza el scaffold `cores/swal-app-template` con lo que faltaba: UI unificado con AUI, tier socio con credito inferencia, infra gestionada opcional, y modelo 20% handling.

## 1. UI unificado — AUI (Agent-generated UI, nuevo)

**Problema:** cada app tenia UI estatica distinta. Se quiere que **si hay LLM presente, el agente genere la interfaz** (potencia agentica), sin reescribir codigo.

**Solucion:** JSON spec whitelisteada -> renderer @swal/ui (seguro, sin eval).

```
LLM (local xavier-gpud o Workers AI) --prompt--> generateAui() --JSON--> validateAui() --AuiRenderer.svelte--> @swal/ui
                              ^                |
                              | RAG            v
                         xavierSearch()   lockedKeys bloqueados
```

- `src/lib/aui.ts`: `AUI_COMPONENTS = Card/Button/Badge/Input/Table/Tabs/Modal/StatusBadge/Skeleton/GlobalTicker` (whitelist). `AuiSpec {version, theme?, copy?, components:[{id,type,props,data?}], lockedKeys?}`. `generateAui(prompt)` concatena RAG de Xavier, llama a `llmComplete` con `AUI_SYSTEM` (solo JSON), valida whitelist + lockedKeys (`manager_adds_vote_weight` etc. nunca tocables). `saveAuiSpec()` persiste en Xavier (`aui` kind) + publica en mesh `aui:update`.
- `src/components/AuiRenderer.svelte`: Svelte 5, recibe `spec: AuiSpec`, mapea cada `type` a componente real de `@swal/ui` via `MAP` (no dynamic import). Aplica `theme` como CSS vars, renderiza `copy.title/subtitle`, grid de celdas. Si `spec.components` vacia -> fallback estatico. Si `type` no whitelisteado -> muestra borde rojo danger (no crashea).
- `src/lib/domain.config.ts`: nuevo `aui: {enabled, allowAgentTheme}`. Si `enabled=false`, la pagina usa UI estatica y no llama a `generateAui`.
- Demo en `src/pages/index.astro`: `demoAui` estatico con 3 componentes + `<AuiRenderer spec={demoAui} client:load />`. En prod: `const aui = await generateAui("muestra vehiculos con alertas", true)`.

Extiende `docs/SWAL/MALOCA_UI_JSON_CANVAS.md` fase 2 (components[] + region slots), pero con aislamiento por app (cada app tiene su AUI spec en `app/{appId}/instance/{id}`).

## 2. Tier socio — credito inferencia + Cloudflare Workers AI

**Objetivo:** el usuario paga **socio** y recibe credito mensual para gastar en inferencia que alimenta su SWAL app. Cloudflare se encarga de todo (infra + metering).

- `src/lib/billing.ts` + `domain.config.ts billing: {tier, mode}`:
  ```ts
  TIERS = { free: {monthlyCredit:0, r2:1GB, base:0}, socio:{50000,10GB,9$}, 'socio-managed':{50000,50GB,29$} }
  SWAL_HANDLING_PCT = 0.20; AI_MARGIN_MIN_PCT = 0.10;
  canAffordInference(tokens, used, tier) / creditStatus() / deductCredit()
  cfAiInfer(prompt, {tierId, mode}) -> fetch /api/ai/infer
  calculatePrice(infra, aiBase) -> {infra, aiWithMargin, subtotal, handling, total}
  ```

- Flujo:
  1. UI llama `generateAui()` o `llmComplete()` -> si `tier` tiene credito, va via `cfAiInfer()` -> `POST /api/ai/infer` (Worker).
  2. Worker `src/lib/worker-ai.example.ts` (plantilla Hono): verifica credito en D1 `credits` (KV cache), si agotado 402, si ok llama `c.env.AI.run('@cf/meta/llama-3-8b-instruct', {prompt})`, cuenta tokens, actualiza D1 `used`, calcula costo `aiBase = tokens*0.00001`, infra placeholder `0.02`, `total = (infra+aiWithMargin)*1.20`, responde `{text, tokensUsed, cost}`.
  3. Cliente deduce credito con `deductCredit()` y muestra `formatPriceBreakdown()`.

- Wrangler bindings (comentados en `wrangler.toml`, descomentar al provisionar):
  ```
  [[r2_buckets]] SWAL_R2, [[d1_databases]] SWAL_D1, [[kv_namespaces]] SWAL_KV, [ai] AI
  ```

## 3. Infra gestionada opcional — mismo sub, SWAL gestiona

**Opcion A self-managed (default si el usuario trae su Cloudflare):**
- Usuario crea su cuenta Cloudflare, pone `CF_ACCOUNT_ID` + token en `env`/`X-CF-Account-Id` header. Worker usa esa cuenta para R2/AI. SWAL solo cobra handling 20% sobre infra+AI (Cloudflare le cobra 100% directo al usuario).

**Opcion B swal-managed (extra, mismo sub socio):**
- `billing.mode = 'swal-managed'` + `tier = 'socio-managed'` (29$ base). SWAL provisiona R2/D1/KV/AI en su cuenta Cloudflare, todo se factura en SWAL y se cobra al socio como `total` (infra+AI+handling) en el mismo sub (Stripe/socio). Usuario no gestiona nada.
- Worker detecta `mode` y usa `c.env` de SWAL (no requiere header del cliente).

Precio en ambos modos (unificado):
```
aiWithMargin = aiBase * 1.10  (minimo Cloudflare)
subtotal = infra (100% Cloudflare) + aiWithMargin
handling = subtotal * 0.20
total = subtotal + handling
```
Ejemplo: infra $0.50 + aiBase $0.30 -> aiWithMargin $0.33 -> subtotal $0.83 -> handling $0.166 -> total $0.996

Todo lo que se cobre lleva 20% manejo SWAL, resto es 100% costo infra + min% modelos nube power by Cloudflare (Workers AI).

## 4. Archivos tocados (replicados 3 repos, builds verdes)

- `cores/swal-app-template` (canonico):
  - src/lib/aui.ts, src/components/AuiRenderer.svelte, src/lib/billing.ts, src/lib/worker-ai.example.ts, wrangler.toml (+R2/D1/KV/AI), src/lib/domain.config.ts (aui+billing), src/pages/index.astro (demo AUI + status badges)
  - pnpm check 0 errors, build 1.47s (cloudflare)

- `apps/gara-g/packages/app-pwa` (no pisa ola 01/02 del otro agente, solo 03.01):
  - mismo lib + AuiRenderer + domain.config patched + wrangler synced (name gara-g, bucket gara-g-r2)
  - check 0 errors, build 1.38s

- `apps/hosteler-ia/src-astro` (F0):
  - mismo lib + AuiRenderer + domain.config patched
  - check 0 errors, build 898ms

## 5. Uso para crear apps rapido (actualizado)

```bash
node cores/swal-app-template/scripts/create-app.mjs mi-tienda --target apps/mi-tienda
# editar apps/mi-tienda/src/lib/domain.config.ts:
#   appId: 'mi-tienda', entities:[...], aui:{enabled:true}, billing:{tier:'socio', mode:'swal-managed'}
# descomentar wrangler.toml bindings + crear D1/R2/KV en Cloudflare (una vez)
# wrangler d1 create swal-billing && wrangler r2 bucket create swal-mi-tienda-r2
# cd apps/mi-tienda && pnpm install && pnpm run build && wrangler pages deploy dist
```

## 6. Pendiente (fuera de este delta)

- Extraer LLM router de swal-agent-runner a core compartido (ahora duplicado como stub + cfAiInfer)
- Worker real desplegado (ahora example.ts) + tabla D1 credits + metering Cloudflare GraphQL
- ProBadge gate en dashboard para mostrar credito remaining y bloquear AUI si 402
- Tests: vitest para aui validate + billing calculatePrice + playwright AUI render
