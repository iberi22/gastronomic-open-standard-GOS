// workers/ai.ts — Cloudflare Worker para /api/ai/infer (ejemplo, desplegado como Worker separado o como function Pages)
// Usa bindings SWAL_R2 / SWAL_D1 / SWAL_KV / AI definidos en wrangler.toml
// Modelo negocio: infra 100% + AI base * (1+marginMin) + handling 20% -> ver src/lib/billing.ts calculatePrice

// Pseudo-codigo Hono/Worker — copiar a workers/ai.ts cuando se despliegue
/*
import { Hono } from 'hono';
import { calculatePrice, TIERS, SWAL_HANDLING_PCT, AI_MARGIN_MIN_PCT } from '../src/lib/billing';

type Bindings = { AI: any; SWAL_D1: D1Database; SWAL_KV: KVNamespace; SWAL_R2: R2Bucket };

const app = new Hono<{ Bindings: Bindings }>();

app.post('/api/ai/infer', async (c) => {
  const { prompt, tierId = 'socio', mode = 'swal-managed', appId } = await c.req.json();
  const tier = TIERS[tierId];
  if (!tier || tier.monthlyCredit === 0) return c.json({ error: 'tier sin credito' }, 402);

  // 1. Verificar credito en D1 (ledger)
  const usedRow = await c.env.SWAL_D1.prepare('SELECT used FROM credits WHERE appId=?').bind(appId).first();
  const used = usedRow?.used ?? 0;
  if (used >= tier.monthlyCredit) return c.json({ error: 'credito agotado' }, 402);

  // 2. Llamar Workers AI (power by Cloudflare) — ej: @cf/meta/llama-3-8b-instruct
  const aiRes: any = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', { prompt });
  const text = aiRes.response ?? '';
  const tokensUsed = Math.ceil(text.length / 4);

  // 3. Metering: actualizar D1
  await c.env.SWAL_D1.prepare('INSERT OR REPLACE INTO credits (appId, used) VALUES (?, ?)').bind(appId, used + tokensUsed).run();

  // 4. Costo: infra (R2/D1/KV metering via Cloudflare billing API) + AI base
  // Para MVP, aiCostBase = tokensUsed * 0.00001 (ejemplo Workers AI pricing)
  const aiCostBase = tokensUsed * 0.00001;
  const infraCost = 0.02; // placeholder: sumar R2/D1 real via Cloudflare GraphQL
  const { total } = calculatePrice(infraCost, aiCostBase);

  // 5. Respuesta incluye costo para que el cliente muestre breakdown (billing.ts formatPriceBreakdown)
  return c.json({ text, tokensUsed, cost: total });
});

export default app;
*/

// Nota: Si mode === 'self-managed', el Worker usa env.CF_ACCOUNT_ID del usuario (traido en header X-CF-Account-Id)
// y SWAL solo cobra handling 20% (el infra ya lo paga el usuario en su cuenta Cloudflare).
// Si mode === 'swal-managed', todo se factura en la cuenta SWAL y se cobra total al socio en el mismo sub (Stripe/socio).
// En ambos casos Cloudflare es el que ejecuta inferencia (Workers AI) y almacenamiento (R2).

export {};
