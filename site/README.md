# @swal/app-template — Scaffold canonico SWAL

Scaffold separado en `cores/swal-app-template` — no toca `apps/gara-g` del otro agente. Coherente con ola 03.01 + plan hosteler-ia.

## Stack

Astro 7 + Svelte 5 + @astrojs/cloudflare 14.2.5 + @astrojs/svelte 7 + vite-plugin-pwa 1.3.0 + @swal/ui 0.2.0 + Xavier + edge-mesh + LLM

Tokens: `@import '@swal/ui/tokens'` (--swal-bg #020617, --swal-accent #06b6d4, etc.)

## Crear una app nueva (2 comandos)

```bash
node cores/swal-app-template/scripts/create-app.mjs mi-tienda --target apps/mi-tienda
# o con entidades: --entities "product,order,customer"

cd apps/mi-tienda && pnpm install && pnpm run build
# edita src/lib/domain.config.ts para tu modelo de negocio
```

El script:
- copia el template (sin node_modules/dist/.astro/scripts)
- reescribe `package.json` name + dep `@swal/ui` relativa correcta
- reescribe `src/lib/domain.config.ts` con appId y entities[]
- reescribe `wrangler.toml` name + `public/manifest.json` name

## Modelo de negocio -> capa agentica

```
src/lib/domain.config.ts  <- UNICO archivo obligatorio (appId + entities[])
  |-> Xavier ns: app/{appId}/instance/{id}  (src/lib/xavier.ts)
  |-> Mesh room: swal/{appId}/{id}          (src/lib/mesh.ts)
  |-> LLM: llmComplete({prompt,useMemory})  (src/lib/llm.ts + ProviderRouter)
  |-> SurrealDB tables: entities[].name     (edge-hive, futuro)
```

- **Xavier:** `xavierSearch(query)` / `xavierAdd(content)` -> http://localhost:8006 + fallback IndexedDB. Usalo para RAG antes de LLM.
- **Mesh:** `meshPublish(topic, payload)` / `meshSubscribe(topic, handler)` -> Yjs/y-webrtc via edge-mesh (realtime + offline buffer).
- **LLM:** `llmComplete({prompt, system, useMemory})` -> ProviderRouter: local xavier-gpud -> opencode-go -> openrouter -> gemini (reusa cores/swal-agent-runner/src/services/llm/*) + Clavis leases.

Tu modelo de negocio no habla directo a OpenAI — pasa por `lib/llm.ts` que ya hace RAG con Xavier y mesh.

## Estructura

```
src/
├── layouts/Layout.astro (@swal/ui/tokens + Toaster)
├── pages/index.astro (demo Card/Badge/Button/StatusBadge)
├── components/ (islas Svelte, client:load solo con estado, usa @swal/ui)
├── lib/
│   ├── domain.config.ts (appId + entities)
│   ├── xavier.ts
│   ├── mesh.ts
│   ├── llm.ts
│   └── README.md
└── env.d.ts
public/manifest.json (192/512 maskable, standalone)
wrangler.toml (Cloudflare Pages)
astro.config.mjs (cloudflare + svelte + VitePWA workbox)
```

## Comandos

```bash
pnpm install
pnpm run check   # 0 errors
pnpm run build   # 0 errors (server + cloudflare + _headers)
pnpm run dev     # astro dev
```

Verificado: pnpm install 622 + build 1.39s (cloudflare), check 0 errors.

## Coherencia con planes existentes

- **Gara-G 03.01:** `apps/gara-g/.hermes/ola-swal-gara/body-03.01.md` -- este template es la extraccion canonica de ese scaffold. El otro agente sigue en `apps/gara-g/packages/app-pwa` sin conflicto.
- **Hosteler-ia:** `apps/hosteler-ia/docs/plans/PLAN_MIGRACION_UI_CORE_ESQUELETO.md` Fase 0-1 + `apps/hosteler-ia/src-astro/` (ya usa mismo lib con appId hosteler-ia). Puede migrar a `cores/swal-app-template` como base.
- **Cores:** `cores/swal-ui` (design system), `cores/edge-mesh` (P2P), `apps/xavier` (:8006), `cores/swal-agent-runner` (LLM router + PWA pattern).

## Plano coherente (no pisar ola)

- No modificar `apps/gara-g/packages/app-pwa` del otro agente mas alla de dejarlo build verde (ya hecho).
- No crear `cores/swal-econ` etc. aqui -- eso es ola 01.x del otro agente.
- Template es isla autonoma: todo se implementa para replicar (directiva core-isla Belal 2026-08-03).
- Futuro: extraer `swal-agent-runner` LLM router a `cores/swal-llm` para que template y runner compartan codigo (ahora duplicado como stub).

## AUI + Billing

- **AUI:** `AuiRenderer.svelte` + `src/lib/aui.ts` (ver USAGE.md). Whitelist Card/Button/Badge/Input/Table/Tabs/Modal/StatusBadge/Skeleton. Demo en `src/pages/index.astro` con `demoAui`.
- **Billing:** `src/lib/billing.ts` — TIERS socio/socio-managed, 20% handling SWAL sobre infra 100% + AI 10% min (Workers AI power by Cloudflare). Ver `USAGE.md` y `src/lib/worker-ai.example.ts`.
