// workers/ai.ts — Cloudflare Worker real para POST /api/ai/infer
// Desplegable como Worker separado o como Pages Function (functions/api/ai/infer.ts).
// Usa bindings: AI (Workers AI), SWAL_D1 (D1), SWAL_KV (KV), SWAL_R2 (R2).
// Modelo negocio: ver src/lib/billing.ts calculatePrice (infra 100% + AI*1.10 + 20% handling).

import { calculatePrice, TIERS } from '../src/lib/billing';
import { domainConfig } from '../src/lib/domain.config';

export interface Env {
  AI: { run: (model: string, opts: { prompt: string }) => Promise<{ response?: string }> };
  SWAL_D1: { prepare: (sql: string) => { bind: (...args: any[]) => { first: () => Promise<any>; run: () => Promise<any>; all: () => Promise<any> } } };
  SWAL_KV: { get: (key: string) => Promise<string | null>; put: (key: string, val: string) => Promise<void> };
  SWAL_R2: any;
  CF_ACCOUNT_ID?: string; // para self-managed (header X-CF-Account-Id)
}

// Handler tipado para Cloudflare Workers (sin Hono para no añadir dep)
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== '/api/ai/infer' || request.method !== 'POST') {
      return new Response('Not Found', { status: 404 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'invalid json' }, { status: 400 });
    }

    const { prompt, tierId = 'socio', mode = 'swal-managed', appId = domainConfig.appId } = body;
    if (!prompt || typeof prompt !== 'string') return Response.json({ error: 'prompt required' }, { status: 400 });

    const tier = (TIERS as any)[tierId];
    if (!tier || tier.monthlyCredit === 0) {
      return Response.json({ error: 'tier sin credito', tierId }, { status: 402 });
    }

    // self-managed: verifica que el cliente trajo su CF account (header)
    if (mode === 'self-managed' && !request.headers.get('X-CF-Account-Id') && !env.CF_ACCOUNT_ID) {
      return Response.json({ error: 'self-managed requiere X-CF-Account-Id' }, { status: 400 });
    }

    // 1. Leer credito usado (KV cache primero, luego D1)
    const kvKey = `credits:${appId}`;
    let used = 0;
    try {
      const cached = await env.SWAL_KV?.get(kvKey);
      if (cached !== null && cached !== undefined) used = parseInt(cached, 10);
      else {
        const row = await env.SWAL_D1.prepare('SELECT used FROM credits WHERE appId = ?').bind(appId).first();
        used = row?.used ?? 0;
      }
    } catch {
      used = 0; // si D1/KV no provisionado en dev, fallback 0
    }

    if (used >= tier.monthlyCredit) {
      return Response.json({ error: 'credito agotado', used, limit: tier.monthlyCredit }, { status: 402 });
    }

    // 2. Llamar Workers AI (power by Cloudflare)
    let text = '';
    let tokensUsed = 0;
    const estimated = Math.ceil(prompt.length / 4);
    if (used + estimated > tier.monthlyCredit) {
      return Response.json({ error: 'credito insuficiente para prompt', used, limit: tier.monthlyCredit, estimated }, { status: 402 });
    }

    try {
      // Modelo por defecto: @cf/meta/llama-3-8b-instruct (Workers AI)
      const aiRes: any = await env.AI.run('@cf/meta/llama-3-8b-instruct', { prompt });
      text = aiRes?.response ?? aiRes?.result ?? '';
      tokensUsed = Math.ceil(text.length / 4) || estimated;
    } catch (e: any) {
      // Fallback en dev sin binding AI (local)
      text = `[AI fallback dev] ${prompt.slice(0, 200)}`;
      tokensUsed = estimated;
    }

    // 3. Actualizar ledger D1 + KV
    const newUsed = used + tokensUsed;
    try {
      await env.SWAL_D1.prepare('INSERT OR REPLACE INTO credits (appId, used, tier, updatedAt) VALUES (?, ?, ?, ?)').bind(appId, newUsed, tierId, new Date().toISOString()).run();
      await env.SWAL_KV?.put(kvKey, String(newUsed));
    } catch {}

    // 4. Costo (ejemplo pricing Workers AI; reemplazar con billing real Cloudflare GraphQL)
    const aiCostBase = tokensUsed * 0.00001; // $0.00001 por token (placeholder Workers AI)
    const infraCost = 0.02; // placeholder R2/D1/KV — en prod sumar metering real
    const { total, handling, aiWithMargin } = calculatePrice(infraCost, aiCostBase);

    // 5. Registrar invoice (opcional, para dashboard)
    try {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await env.SWAL_D1.prepare('INSERT INTO invoices (id, appId, infra, aiBase, aiWithMargin, handling, total, tokensUsed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(id, appId, infraCost, aiCostBase, aiWithMargin, handling, total, tokensUsed).run();
    } catch {}

    return Response.json({ text, tokensUsed, cost: total, breakdown: { infra: infraCost, aiBase: aiCostBase, aiWithMargin, handling, total }, credit: { used: newUsed, limit: tier.monthlyCredit, remaining: tier.monthlyCredit - newUsed } });
  },
};
