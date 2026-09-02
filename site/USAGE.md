# @swal/app-template — Uso

Template canonico SWAL (Astro 7 + Svelte 5 + @swal/ui + vite-pwa + Cloudflare + Xavier + mesh + LLM + AUI + Socio 20%).

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

### Billing — Socio + Cloudflare 20%

```ts
import { calculatePrice, canAffordInference, formatPriceBreakdown } from '../lib/billing';

// infra 100% Cloudflare + AI base*1.10 + handling 20%
const { total, handling } = calculatePrice(infraCost, aiCostBase);
console.log(formatPriceBreakdown(0.5, 0.3)); // Infra $0.50 + AI $0.33 ... total $1.00

// credito
canAffordInference(tokens, used, 'socio'); // true/false (402 si agotado)
// inferencia via Worker
import { cfAiInfer } from '../lib/billing';
const res = await cfAiInfer(prompt, { tierId:'socio', mode:'swal-managed' });
```

Wrangler bindings (descomentar en `wrangler.toml` al provisionar):

```toml
[[r2_buckets]] binding="SWAL_R2" bucket_name="swal-mi-tienda-r2"
[[d1_databases]] binding="SWAL_D1" database_name="swal-billing"
[[kv_namespaces]] binding="SWAL_KV" id="..."
[ai] binding="AI"
```

Ver `src/lib/billing.ts` y `src/lib/worker-ai.example.ts`.

### Xavier + Mesh + LLM

```ts
import { xavierSearch, xavierAdd } from '../lib/xavier'; // ns app/{appId}/instance/{id}
import { meshPublish } from '../lib/mesh'; // room swal/{appId}/{id}
import { llmComplete } from '../lib/llm'; // Router local->opencode->openrouter->gemini + cfAiInfer si socio
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
src/lib/aui.ts / billing.ts / xavier.ts / mesh.ts / llm.ts / worker-ai.example.ts
public/manifest.json (192/512 maskable)
wrangler.toml (cloudflare pages)
```

## Tipos de tier

- `free`: 0 credito, 1GB R2, 0$
- `socio`: 50k credito, 10GB, 9$ + infra+AI*1.10+20% handling (Cloudflare power)
- `socio-managed`: 50k, 50GB, 29$ + mismo handling pero SWAL gestiona infra (mismo sub)
