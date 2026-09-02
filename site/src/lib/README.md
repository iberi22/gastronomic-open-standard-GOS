# app-pwa — Scaffold SWAL (Astro + Svelte + Cloudflare)

Scaffold canonico de la ola **03.01** (`apps/gara-g/packages/app-pwa`) — base para crear cualquier app SWAL en 2 min.

Stack: Astro 7 + Svelte 5 + @astrojs/cloudflare 14.2.5 + @astrojs/svelte 7 + vite-plugin-pwa 1.3.0 + @swal/ui 0.2.0 + edge-mesh + Xavier + edge-hive stub

## Crear una app nueva

```bash
cp -r apps/gara-g/packages/app-pwa apps/mi-app-pwa
# editar apps/mi-app-pwa/src/lib/domain.config.ts  (appId, entities)
# editar apps/mi-app-pwa/wrangler.toml (name)
# editar apps/mi-app-pwa/public/manifest.json (name/short_name)
cd apps/mi-app-pwa && pnpm install && pnpm run build
```

## Donde va el modelo de negocio

- `src/lib/domain.config.ts` — UNICO archivo obligatorio. Define `appId` y `entities[]`. De ahi se derivan Xavier ns `app/{appId}/instance/{id}`, mesh room `swal/{appId}/{id}`, y tablas SurrealDB.
- `src/lib/domain.ts` — helpers CRUD para tus entidades (TODO: conectar a edge-hive SurrealDB).
- `src/components/` — Svelte islands (`client:load` solo donde hay estado). Usa `@swal/ui` (Button/Card/Badge/Table/Modal/StatusBadge/...). No crear UI local.
- `src/pages/` — Astro file routing. `index.astro` es landing, `dashboard.astro` etc.

## Capa agentica ya cableada (stubs build-verde, reemplazar con impl real en 04.02+)

- `src/lib/xavier.ts` — `xavierSearch` / `xavierAdd` con namespace `app/{appId}/instance/{id}` -> Xavier :8006 + fallback IndexedDB. Usalo para RAG: `xavierSearch(query)` antes de `llmComplete({prompt, useMemory:true})`.
- `src/lib/mesh.ts` — `meshPublish` / `meshSubscribe` -> `swal/{appId}/{instanceId}` via Yjs/y-webrtc (edge-mesh). Para realtime orders/telemetria.
- `src/lib/llm.ts` — `llmComplete({prompt, system, useMemory})` -> ProviderRouter (local xavier-gpud -> opencode-go -> openrouter -> gemini). Reusa `cores/swal-agent-runner/src/services/llm/llm-provider-manager.ts` + Clavis leases.

## Comandos

```bash
pnpm install
pnpm run check   # astro check — 0 errors
pnpm run build   # astro check && astro build — 0 errors
pnpm run dev     # astro dev
pnpm type-check  # tsc --noEmit
```

## Verificacion 03.01

```bash
pnpm --filter @gara-g/app-pwa build
ls packages/app-pwa/public/manifest.json
grep -c "vite-plugin-pwa\|VitePWA" packages/app-pwa/astro.config.mjs  # >=1
grep -c "@swal/ui" packages/app-pwa/src/layouts/Layout.astro          # >=1
```

## Notas

- PWA: workbox via vite-plugin-pwa (no @vite-pwa/astro muerto). Manifest 192/512 maskable. Instalable en `localhost` sin HTTPS.
- Cloudflare Pages: `wrangler.toml` type pages, build `pnpm --filter @gara-g/app-pwa build`, output `dist/`.
- No tocar `cores/swal-ui` ni `cores/edge-mesh` desde la app — importar.
