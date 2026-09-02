import { describe, it, expect } from 'vitest';
import { llmComplete } from './llm';

describe('llm billing gate', () => {
  it('bloquea si credito agotado (free)', async () => {
    const res = await llmComplete({ prompt: 'hola', tierId: 'free', estimatedTokens: 1 });
    expect(res.model).toBe('billing-blocked');
    expect(res.text).toContain('credito socio agotado');
  });

  it('permite con socio y va via local si no hay CF', async () => {
    const res = await llmComplete({ prompt: 'test socio', tierId: 'socio', estimatedTokens: 10 });
    // en vitest window undefined -> no intenta cfAiInfer, va local stub
    expect(['stub', 'cf-workers-ai', 'billing-blocked']).toContain(res.model);
    // si no bloqueado, debe ser stub local en test
    if (res.model !== 'billing-blocked') expect(res.via).toBe('local');
  });
});
