// aui.ts — Agent-generated UI (AUI) para SWAL App Template
// Genera interfaz via LLM y renderiza con @swal/ui whitelist (seguro, sin eval).
// Inspirado en MALOCA_UI_JSON_CANVAS.md (fase 2+): JSON parametrizable + canvas ligero.

import { domainConfig } from './domain.config';
import { llmComplete } from './llm';
import { xavierSearch } from './xavier';

// Whitelist de componentes permitidos — nunca se renderiza codigo arbitrario.
export const AUI_COMPONENTS = [
  'Card',
  'Button',
  'Badge',
  'Input',
  'Table',
  'Tabs',
  'Modal',
  'StatusBadge',
  'Skeleton',
  'GlobalTicker',
] as const;
export type AuiComponentType = (typeof AUI_COMPONENTS)[number];

// Spec JSON que el agente genera (validado por Zod-like en runtime)
export type AuiSpec = {
  version: 1;
  // theme/copy/layout opcionales (fase 1 MALOCA) — si vienen, se aplican como CSS vars
  theme?: { accent?: string; bg?: string; radius?: string };
  copy?: { title?: string; subtitle?: string };
  // lista de componentes a renderizar, ordenada
  components: Array<{
    id: string;
    type: AuiComponentType;
    region?: 'main' | 'sidebar' | 'header';
    props: Record<string, unknown>;
    // datos de negocio: el agente puede pedir datos de Xavier/mesh via tool
    data?: { kind: string; query: string };
  }>;
  // claves bloqueadas nunca mutables por LLM (seguridad GOAL)
  lockedKeys?: string[];
};

export const AUI_LOCKED_KEYS = ['manager_adds_vote_weight', 'synapse_unfrozen', 'token_public_sale_enabled'] as const;

// System prompt fijo para que el LLM genere SOLO JSON whitelisteado
const AUI_SYSTEM = `Eres un generador de UI SWAL. Responde SOLO con JSON valido AuiSpec version 1.
Reglas:
- Solo usa types: ${AUI_COMPONENTS.join(', ')}
- No inventes props fuera de @swal/ui (Button: variant, Input: placeholder, Card: variant/padding, etc.)
- No toques lockedKeys: ${AUI_LOCKED_KEYS.join(', ')}
- Usa domain entities: ${domainConfig.entities.map((e) => e.name).join(', ')}
- Si necesitas datos, usa "data": {"kind":"${domainConfig.entities[0]?.xavierKind ?? 'item'}","query":"..."}
- Devuelve {version:1, components:[{id,type,props}]}`;

export async function generateAui(prompt: string, useMemory = true): Promise<AuiSpec> {
  // RAG opcional: busca memoria relevante para contexto (ej: ordenes recientes, vehiculos)
  let rag = '';
  if (useMemory) {
    const mem = await xavierSearch(prompt, 3);
    rag = (mem.memories ?? []).map((m: any) => m.content).join('\n').slice(0, 800);
  }
  const fullPrompt = rag ? `Contexto:\n${rag}\n\nPedido UI: ${prompt}` : prompt;

  const res = await llmComplete({ prompt: fullPrompt, system: AUI_SYSTEM, useMemory: false });
  try {
    const parsed = JSON.parse(res.text);
    return validateAui(parsed);
  } catch {
    // fallback: si el LLM no devolvio JSON, retorna spec vacia segura
    const fallback: AuiSpec = { version: 1, components: [] };
    return fallback;
  }
}

export function validateAui(spec: any): AuiSpec {
  if (!spec || spec.version !== 1 || !Array.isArray(spec.components)) {
    throw new Error('AUI invalid version/components');
  }
  // whitelist + lockedKeys
  if (spec.lockedKeys?.some((k: string) => (AUI_LOCKED_KEYS as readonly string[]).includes(k))) {
    throw new Error('AUI lockedKeys violation');
  }
  for (const c of spec.components) {
    if (!AUI_COMPONENTS.includes(c.type)) throw new Error(`AUI component not whitelisted: ${c.type}`);
    if (!c.id || typeof c.id !== 'string') throw new Error('AUI missing id');
    if (typeof c.props !== 'object') throw new Error('AUI props must be object');
  }
  return spec as AuiSpec;
}

// Helper para guardar/recuperar spec en Xavier (memoria) y mesh (realtime)
export async function saveAuiSpec(spec: AuiSpec, instanceId?: string) {
  const { xavierAdd } = await import('./xavier');
  await xavierAdd(JSON.stringify(spec), 'aui', instanceId);
  const { meshPublish } = await import('./mesh');
  await meshPublish('aui:update', spec, instanceId);
}
