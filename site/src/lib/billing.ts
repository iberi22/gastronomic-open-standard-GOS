// billing.ts — Socio tier + creditos inferencia + infra gestionada + 20% handling SWAL
// Cloudflare se encarga de infra y metering; SWAL cobra 20% manejo.
// Modelo: precio = infra 100% + AI base * (1 + marginMin) + handling 20% sobre (infra+AI)
// Socio elige: self-managed (trae su Cloudflare account) vs managed (SWAL gestiona, mismo sub).

import { domainConfig } from './domain.config';

// --- Tipos ---

export type BillingMode = 'self-managed' | 'swal-managed';

export type SocioTier = {
  // id para wrangler billing: free | socio | socio-managed
  id: 'free' | 'socio' | 'socio-managed';
  // credito mensual inferencia (tokens / invocations) — Cloudflare Workers AI
  monthlyCredit: number;
  // quota R2 (GB) / D1 rows — via Cloudflare bindings
  r2QuotaGB: number;
  // precio base mensual suscripcion (sin infra variable), USD
  basePrice: number;
};

// Catálogo ejemplo — ajustar en domain.config.ts si la app necesita otros valores
export const TIERS: Record<SocioTier['id'], SocioTier> = {
  free: { id: 'free', monthlyCredit: 0, r2QuotaGB: 1, basePrice: 0 },
  socio: { id: 'socio', monthlyCredit: 50000, r2QuotaGB: 10, basePrice: 9 },
  'socio-managed': { id: 'socio-managed', monthlyCredit: 50000, r2QuotaGB: 50, basePrice: 29 },
};

// --- Pricing (20% handling + AI margin minimo) ---

export const SWAL_HANDLING_PCT = 0.20; // 20% sobre (infra + AI)
export const AI_MARGIN_MIN_PCT = 0.10; // 10% minimo sobre costo base Workers AI (Cloudflare)

/**
 * Calcula precio final mensual.
 * @param infraCost costo Cloudflare 100% (R2 + Workers + D1 + KV) en USD, reportado por Cloudflare metering
 * @param aiCostBase costo base Workers AI (Cloudflare) sin margen
 */
export function calculatePrice(infraCost: number, aiCostBase: number): {
  infra: number;
  aiWithMargin: number;
  subtotal: number;
  handling: number;
  total: number;
} {
  const aiWithMargin = aiCostBase * (1 + AI_MARGIN_MIN_PCT);
  const subtotal = infraCost + aiWithMargin;
  const handling = subtotal * SWAL_HANDLING_PCT;
  const total = subtotal + handling;
  return { infra: infraCost, aiWithMargin, subtotal, handling, total };
}

// --- Credito inferencia (socio) ---

export type CreditLedger = { used: number; limit: number; remaining: number };

export function creditStatus(used: number, tierId: SocioTier['id'] = 'socio'): CreditLedger {
  const limit = TIERS[tierId]?.monthlyCredit ?? 0;
  return { used, limit, remaining: Math.max(0, limit - used) };
}

export function canAffordInference(estimatedTokens: number, used: number, tierId: SocioTier['id'] = 'socio'): boolean {
  const { remaining } = creditStatus(used, tierId);
  // socio-managed y socio comparten mismo credito; free siempre false si >0
  return estimatedTokens <= remaining;
}

// Deduct se hace en Worker (D1) tras inferencia real — aqui solo helper para UI
export function deductCredit(used: number, consumed: number): number {
  return used + consumed;
}

// --- Cloudflare proxy para LLM (Workers AI) ---

// Cuando hay socio, llmComplete debe pasar por /api/ai/infer que es un Cloudflare Worker
// que: verifica credito en D1/KV, llama Workers AI (power by Cloudflare), mete handling, registra ledger.
// Si self-managed, el Worker usa la cuenta Cloudflare del usuario (env.CF_ACCOUNT_ID del cliente).
// Si swal-managed, env.CF_ACCOUNT_ID es el de SWAL (gestionado), mismo sub.

const CF_AI_ENDPOINT = '/api/ai/infer'; // Worker route — implementado en workers/ai.ts (ver docs)

export async function cfAiInfer(
  prompt: string,
  opts: { tierId?: SocioTier['id']; mode?: BillingMode; estimatedTokens?: number; useManagedInfra?: boolean } = {},
): Promise<{ text: string; tokensUsed: number; cost: number } | null> {
  const tierId = opts.tierId ?? 'socio';
  // si free y pide inferencia via CF, rechazar en Worker (401)
  try {
    const res = await fetch(CF_AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, tierId, mode: opts.mode ?? 'swal-managed', appId: domainConfig.appId }),
    });
    if (res.status === 402) {
      console.warn('[billing] credito agotado, upgrade socio');
      return null;
    }
    if (!res.ok) throw new Error(`cf ai ${res.status}`);
    return (await res.json()) as { text: string; tokensUsed: number; cost: number };
  } catch (e) {
    console.warn('[billing] cfAiInfer fallback a llm local', e);
    return null;
  }
}

// --- Helper UI: muestra breakdown para el socio ---

export function formatPriceBreakdown(infra: number, aiBase: number): string {
  const p = calculatePrice(infra, aiBase);
  return `Infra $${p.infra.toFixed(2)} + AI $${p.aiWithMargin.toFixed(2)} (base $${aiBase.toFixed(2)} + ${AI_MARGIN_MIN_PCT * 100}% min) = subtotal $${p.subtotal.toFixed(2)} + handling SWAL 20% $${p.handling.toFixed(2)} = total $${p.total.toFixed(2)}`;
}

// --- Wrangler bindings esperados (documentado, no validado en build) ---
// wrangler.toml debe declarar:
// [[r2_buckets]] binding = "SWAL_R2" bucket_name = "swal-{appId}-{instanceId}"
// [[d1_databases]] binding = "SWAL_D1" database_name = "swal-billing"
// [[kv_namespaces]] binding = "SWAL_KV" id = "..."
// [ai] binding = "AI"
// Ver workers/ai.ts para implementacion Worker que usa estos bindings y TIERS.
