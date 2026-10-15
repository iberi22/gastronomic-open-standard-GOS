# @swal/app-template — Uso

Template canonico SWAL (Astro 7 + Svelte 5 + @swal/ui + vite-pwa + Cloudflare + Xavier + mesh + LLM + AUI).

## Crear una app

```bash
# desde monorepo root
node cores/swal-app-template/scripts/create-app.mjs mi-tienda --target apps/mi-tienda
node cores/swal-app-template/scripts/create-app.mjs veedur --target apps/veedur --entities "case,evidence"

# instalar y build
cd apps/mi-tienda && pnpm install && pnpm run build
# preview: pnpm run dev
```

El script genera `src/lib/domain.config.ts` con `appId` y `entities[]`, `wrangler.toml` name, `public/manifest.json`.

Unico cambio obligatorio: `src/lib/domain.config.ts`

```ts
export const domainConfig = {
  appId: 'mi-tienda',
  appName: 'Mi Tienda',
  instanceId: 'default',
  entities: [{ name:'product', label:'Producto', fields:['name','price'], xavierKind:'product' }],
  aui: { enabled:true, allowAgentTheme:true },
  billing: { tier:'socio', mode:'swal-managed' },
} as const;
```

## Capas

### AUI — Agent genera UI

```ts
import { generateAui } from '../lib/aui';
import AuiRenderer from '../components/AuiRenderer.svelte';

// si hay LLM + credito socio, el agente genera JSON whitelisteado
const spec = await generateAui("muestra productos con stock bajo", true);
```

```svelte
<AuiRenderer spec={spec} client:load />
```

Whitelist: `Card, Button, Badge, Input, Table, Tabs, Modal, StatusBadge, Skeleton, GlobalTicker`. Props validadas, `lockedKeys` bloqueados (ver `src/lib/aui.ts`).

Fallback: si no hay LLM, usa UI estatica.

### Billing

Obsoleto desde 2026-10-15: la membresia es global (un plan SWAL para todas
las apps) y la cuota de IA la gestiona la plataforma. Esta app no lleva tiers,
creditos ni paywall propios; `src/lib/billing.ts` y `src/lib/worker-ai.example.ts`
se eliminaron.

### Xavier + Mesh + LLM

```ts
import { xavierSearch, xavierAdd } from '../lib/xavier'; // ns app/{appId}/instance/{id}
import { meshPublish } from '../lib/mesh'; // room swal/{appId}/{id}
import { llmComplete } from '../lib/llm'; // Router local->opencode->openrouter->gemini
```

## Comandos

```bash
pnpm install
pnpm run check      # astro check 0 errors
pnpm run build      # astro + cloudflare + _headers
pnpm test           # vitest 14 tests
pnpm exec playwright test # 3 e2e
```

## Estructura

```
src/layouts/Layout.astro  (@swal/ui/tokens + Toaster)
src/pages/index.astro     (demo AUI + stats + instrucciones)
src/components/AuiRenderer.svelte
src/lib/domain.config.ts  <- unico obligatorio
src/lib/aui.ts / xavier.ts / mesh.ts / llm.ts
public/manifest.json (192/512 maskable)
wrangler.toml (cloudflare pages)
```

