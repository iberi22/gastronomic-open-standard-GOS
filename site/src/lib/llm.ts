// llm.ts — capa agentica LLM SWAL
// Reusa ProviderRouter + Clavis + xavier-gpud de cores/swal-agent-runner/src/services/llm/
// El modelo de negocio no habla directo a OpenAI — pasa por este router con memoria RAG + billing socio.

import { xavierSearch } from './xavier';
import { domainConfig } from './domain.config';
import { canAffordInference, creditStatus } from './billing';

export type LLMRequest = { prompt: string; system?: string; model?: string; useMemory?: boolean; tierId?: 'free'|'socio'|'socio-managed'; estimatedTokens?: number };
export type LLMResponse = { text: string; model: string; fromCache?: boolean; via?: 'local'|'cf' };

export async function llmComplete(req: LLMRequest): Promise<LLMResponse> {
  // 1. Billing: verifica credito socio antes de inferencia (100% agentico no gasta si no puede pagar)
  const tierId = (req.tierId ?? (domainConfig as any).billing?.tier ?? 'socio') as any;
  const estimated = req.estimatedTokens ?? Math.ceil(req.prompt.length / 4);
  // Lee used desde localStorage (mock D1) — en prod D1/KV via Worker
  let used = 0;
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(`credits:${domainConfig.appId}:${tierId}`);
      used = raw ? parseInt(raw, 10) : 0;
    }
  } catch {}
  if (!canAffordInference(estimated, used, tierId)) {
    return { text: `[billing] credito socio agotado (${used}/${creditStatus(used, tierId).limit}). Upgrade a socio o espera reset.`, model: 'billing-blocked', via: 'local' };
  }

  // 2. Si hay tier socio y estamos en browser con Cloudflare, intenta Workers AI via cfAiInfer (20% handling)
  if (tierId !== 'free' && typeof window !== 'undefined') {
    try {
      const { cfAiInfer } = await import('./billing');
      const cf = await cfAiInfer(req.prompt, { tierId, mode: (domainConfig as any).billing?.mode ?? 'swal-managed', estimatedTokens: estimated });
      if (cf) {
        // actualiza used local para proximo canAfford
        try { if (typeof localStorage !== 'undefined') localStorage.setItem(`credits:${domainConfig.appId}:${tierId}`, String(used + cf.tokensUsed)); } catch {}
        return { text: cf.text, model: 'cf-workers-ai', via: 'cf' };
      }
    } catch {}
  }

  // 3. Fallback local: RAG + stub (xavier-gpud / opencode en prod)
  let context = '';
  if (req.useMemory) {
    const mem = await xavierSearch(req.prompt, 3);
    context = (mem.memories ?? []).map((m: any) => m.content).join('\n---\n');
  }
  const system = req.system ? req.system + '\n' : '';
  const ctx = context ? `Context:\n${context}\n\n` : '';
  console.log('[llm] complete', { model: req.model ?? 'auto', via: 'local', prompt: req.prompt.slice(0, 80) });
  return { text: `${system}${ctx}LLM local stub (sin CF): implementa ProviderRouter en src/lib/llm.ts (ver swal-agent-runner llm-provider-manager.ts)`, model: req.model ?? 'stub', via: 'local' };
}
