// llm.ts — capa agentica LLM SWAL
// Reusa ProviderRouter + Clavis + xavier-gpud de cores/swal-agent-runner/src/services/llm/
// El modelo de negocio no habla directo a OpenAI — pasa por este router con memoria RAG + billing socio.

import { canAffordInference, creditStatus, type SocioTier } from './billing'
import { domainConfig } from './domain.config'
import { xavierSearch } from './xavier'

export type LLMRequest = {
  prompt: string
  system?: string
  model?: string
  useMemory?: boolean
  tierId?: 'free' | 'socio' | 'socio-managed'
  estimatedTokens?: number
}
export type LLMResponse = {
  text: string
  model: string
  fromCache?: boolean
  via?: 'local' | 'cf'
}

export async function llmComplete(req: LLMRequest): Promise<LLMResponse> {
  // 1. Billing: verifica credito socio antes de inferencia (100% agentico no gasta si no puede pagar)
  const tierId = (req.tierId ??
    domainConfig.billing?.tier ??
    'socio') as NonNullable<LLMRequest['tierId']>
  const estimated = req.estimatedTokens ?? Math.ceil(req.prompt.length / 4)
  // Lee used desde localStorage (mock D1) — en prod D1/KV via Worker
  let used = 0
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(
        `credits:${domainConfig.appId}:${tierId}`,
      )
      used = raw ? parseInt(raw, 10) : 0
    }
  } catch {}
  if (!canAffordInference(estimated, used, tierId)) {
    return {
      text: `[billing] credito socio agotado (${used}/${creditStatus(used, tierId).limit}). Upgrade a socio o espera reset.`,
      model: 'billing-blocked',
      via: 'local',
    }
  }

  // 2. Si hay tier socio y estamos en browser con Cloudflare, intenta Workers AI via cfAiInfer (20% handling)
  if (tierId !== 'free' && typeof window !== 'undefined') {
    try {
      const { cfAiInfer } = await import('./billing')
      const cf = await cfAiInfer(req.prompt, {
        tierId,
        mode: domainConfig.billing?.mode ?? 'swal-managed',
        estimatedTokens: estimated,
      })
      if (cf) {
        // actualiza used local para proximo canAfford
        try {
          if (typeof localStorage !== 'undefined')
            localStorage.setItem(
              `credits:${domainConfig.appId}:${tierId}`,
              String(used + cf.tokensUsed),
            )
        } catch {}
        return { text: cf.text, model: 'cf-workers-ai', via: 'cf' }
      }
    } catch {}
  }

  // 3. Fallback local: RAG + stub (xavier-gpud / opencode en prod)
  let context = ''
  if (req.useMemory) {
    const mem = await xavierSearch(req.prompt, 3)
    context = (mem.memories ?? []).map((m) => m.content).join('\n---\n')
  }
  const system = req.system ? `${req.system}\n` : ''
  const ctx = context ? `Context:\n${context}\n\n` : ''
  if (import.meta.env.DEV)
    console.log('[llm] complete', {
      model: req.model ?? 'auto',
      via: 'local',
      prompt: req.prompt.slice(0, 80),
    })
  return {
    text: `${system}${ctx}LLM local stub (sin CF): implementa ProviderRouter en src/lib/llm.ts (ver swal-agent-runner llm-provider-manager.ts)`,
    model: req.model ?? 'stub',
    via: 'local',
  }
}

// ---------------------------------------------------------------------------
// Capa grounded (FASE 2): el LLM no afirma nada de GOS sin fuente verificable.
//
// La regla que se implementa aqui es una sola: una afirmacion sobre GOS solo
// vale si cita una entrada real del repo (slug de receta, ingrediente,
// sustancia, vitamina, condicion o dieta) que se le haya pasado en el prompt
// y que exista de verdad. Si el modelo responde sin una cita valida, la
// respuesta NO se publica: se devuelve 'no lo se' con las fuentes que si se
///leyeron. Es preferible callar a inventar.
//
// Todo lo que sigue es aditivo: llmComplete() no cambia de comportamiento.
// ---------------------------------------------------------------------------

/** Tipos de entrada de GOS que un agente puede citar como fuente. */
export const GROUNDABLE_KINDS = [
  'recipe',
  'ingredient',
  'substance',
  'vitamin',
  'condition',
  'diet',
  'mixture',
] as const
export type GroundableKind = (typeof GROUNDABLE_KINDS)[number]

/** Una fuente verificable: una entrada real del repo, con su URL en el sitio. */
export interface GosSource {
  kind: GroundableKind
  id: string
  /** Nombre legible (titulo de la receta, nombre de la sustancia, ...). */
  label: string
  /** URL en el sitio, para que el usuario pueda abrir la fuente. */
  url?: string
  /**
   * Texto VERBATIM extraido del contenido, nunca redactado por el modelo.
   * En tier free es lo unico que se muestra: cita literal, sin inferencia.
   */
  snippet?: string
  /** Detalle del contenido (p.ej. años de descubrimiento, evidencia, DOI). */
  fields?: Record<string, string>
}

export type GroundedStatus =
  | 'answered'
  | 'ungrounded'
  | 'credit-exhausted'
  | 'no-sources'

export interface GroundedAnswer {
  status: GroundedStatus
  /** Texto publicable. En 'ungrounded' y 'credit-exhausted' es la explicacion. */
  answer: string
  /** Citas validas que respaldan la respuesta (subconjunto de `sources`). */
  citations: GosSource[]
  /** Fuentes que se leyeron y se le dieron al modelo. */
  consulted: GosSource[]
  model: string
  via?: 'local' | 'cf'
  /** Motivo del rechazo, para depurar y para explicarselo al usuario. */
  reason?: string
  /** Sentencias del modelo que afirmaban algo sin cita. Solo si hubo rechazo. */
  unsupported?: string[]
  credit?: { used: number; limit: number; remaining: number }
}

/** Marcador de cita que el modelo debe emitir: [recipe:colombian/xxx]. */
const CITATION_RE = /\[(recipe|ingredient|substance|vitamin|condition|diet|mixture):([^\]\s]+)\]/gi

/**
 * Palabras que convierten una frase en una afirmacion nutricional o de salud.
 * Si aparecen sin cita, la frase cae aunque no haya cifras: "previene el
 * cancer" es una afirmacion de salud tan fuerte como "40 mg por 100 g".
 */
const HEALTH_CLAIM_RE =
  /\b(cura|curan|trata|tratamiento|previene|previene|beneficia|mejora|empeora|daño|danio|t[oó]xic|toxicidad|salud|enfermedad|enfermedades|paciente|pacientes|diagn[oó]stic|riesgo|riesgos|efecto adverso|seguro para| contraindicad[ao]|kolesterol|vitamina|vitamins|minerales?|calorias?|gramos?|miligramos?|mg\b|kcal|obesidad|diabetes|cancer|insomnio|antibiotic)\w*/i

export function parseCitations(text: string): { kind: string; id: string }[] {
  const out: { kind: string; id: string }[] = []
  if (!text) return out
  CITATION_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = CITATION_RE.exec(text)) !== null) {
    out.push({ kind: m[1].toLowerCase(), id: m[2] })
  }
  return out
}

function sourceKey(kind: string, id: string): string {
  return `${kind.toLowerCase()}:${id.trim().toLowerCase()}`
}

/**
 * Resuelve las citas del modelo contra las fuentes reales.
 *
 * Una cita vale si su tipo es de GOS y su id corresponde exactamente a una
 * fuente que se le paso en el prompt. Una cita a un slug inexistente se
 * descarta: es exactamente el caso "se invento una fuente", que es el que
 * este archivo existe para Stop.
 */
export function resolveCitations(
  text: string,
  sources: GosSource[],
): { valid: GosSource[]; unknownKeys: string[] } {
  const index = new Map<string, GosSource>()
  for (const s of sources) index.set(sourceKey(s.kind, s.id), s)
  const valid: GosSource[] = []
  const unknownKeys: string[] = []
  const seen = new Set<string>()
  for (const c of parseCitations(text)) {
    const key = sourceKey(c.kind, c.id)
    const hit = index.get(key)
    if (!hit) {
      if (!unknownKeys.includes(key)) unknownKeys.push(key)
      continue
    }
    if (seen.has(key)) continue
    seen.add(key)
    valid.push(hit)
  }
  return { valid, unknownKeys }
}

/**
 * Detecta frases que afirman un dato de GOS (cifra o claim de salud) sin
 * llevar ninguna cita.
 *
 * Se evalua frase a frase, no sobre el texto entero: una cita valida en
 * cualquier parte del texto NO absuelve a las demas frases. Ese detalle es
 * justamente el que hace util la funcion — un modelo que dice una verdad
 * citada y dos cifras inventadas tiene que ver caidas las dos cifras.
 *
 * Se acepta la cita de la frase siguiente porque los modelos ponden la cita
 * al final del parrafo ("... 40 mg por 100 g. [ingredient:ajo]"), pero no una
 * cita lejana: dos frases despues ya no se considera respaldo.
 */
export function unsupportedClaims(text: string, validKeys: string[]): string[] {
  const sentences = text
    .split(/(?<=[.!?;])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const citedAt = sentences.map((s) =>
    parseCitations(s).some((c) => validKeys.includes(sourceKey(c.kind, c.id))),
  )
  const out: string[] = []
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i]
    const claims = /\d/.test(s) || HEALTH_CLAIM_RE.test(s)
    if (!claims) continue
    const covered = citedAt[i] || citedAt[i + 1] === true
    if (!covered) out.push(s)
  }
  return out
}

/** Instrucciones de sistema: el modelo es un lector de GOS, no un asesor. */
export const GROUNDED_SYSTEM = [
  'Eres el agente de consulta de GOS (Gastronomic Open Standard).',
  'Respondes SOLO con la informacion que aparece en los CONTEXTOS que se te dan.',
  'Cita obligatoriamente cada afirmacion con su marcador [tipo:slug], por ejemplo [recipe:colombian/amasijos/achiras/achiras] o [substance:alicina].',
  'Los marcadores deben ser exactamente los slugs de la lista de contextos. No inventes slugs, no cites URLs, no cites DOIs que no esten en el contexto.',
  'Si la respuesta no esta en los contextos, responde exactamente: NO_LO_SE.',
  'No des criterios medicos, cifras nutricionales, dosis ni recomendaciones de salud que no esten escritas en el contexto.',
].join(' ')

/** Monta el prompt con los contextos, cada uno con su marcador y su slug. */
export function buildGroundedPrompt(question: string, sources: GosSource[]): string {
  const blocks = sources.map((s) => {
    const lines: string[] = []
    lines.push(`### ${s.label}  [${s.kind}:${s.id}]`)
    if (s.fields) {
      for (const [k, v] of Object.entries(s.fields)) {
        if (v) lines.push(`- ${k}: ${v}`)
      }
    }
    if (s.snippet) lines.push(s.snippet)
    return lines.join('\n')
  })
  return [
    'CONTEXTOS (fuente unica y verificable de verdad):',
    blocks.join('\n\n'),
    '',
    `PREGUNTA: ${question}`,
    '',
    'Responde citando con los marcadores [tipo:slug]. Si no hay nada en los contextos que lo responda, responde NO_LO_SE.',
  ].join('\n')
}

const STOP_WORDS = new Set([
  'que', 'qué', 'como', 'cuanto', 'cuanta', 'cuantos', 'cuantas', 'de',
  'del', 'la', 'las', 'el', 'los', 'un', 'una', 'y', 'o', 'en', 'para',
  'por', 'con', 'sin', 'me', 'mi', 'es', 'son', 'tiene', 'tienen', 'hay',
  'dime', 'sabes', 'quiero', 'cual', 'cuales', 'a', 'al', 'sobre', 'dame',
  'explica', 'sirve',
])

/**
 * Trocea una pregunta en terminos de busqueda.
 *
 * Vive aqui y no en el endpoint porque el matching de las fuentes es la MISMA
 * operacion en el servidor y en el navegador: el sitio se despliega como
 * output:'static', asi que /api/ai/ask solo existe si hay un adapter SSR. Sin
 * duplicar el scoring, la pagina no podria responder en el caso real de
 * deploy y la ruta GET seria un camino de juguete.
 */
export function queryTerms(question: string): string[] {
  return (question ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t))
}

/**
 * Devuelve los ids de GOS que matchean la pregunta, puntuados.
 *
 * Se exporta para que el endpoint y la pagina usen el mismo criterio: si el
 * cliente y el servidor buscaran distinto, la respuesta de la pagina podria
 * citar fuentes que el endpoint nunca habria encontrado.
 */
export function rankEntries(
  entries: Array<{ id: string; haystack: string }>,
  terms: string[],
): Array<{ id: string; n: number }> {
  if (!terms.length) return []
  const out: Array<{ id: string; n: number }> = []
  for (const e of entries) {
    const hay = e.haystack.toLowerCase()
    let n = 0
    for (const t of terms) {
      if (!t) continue
      let from = 0
      // Cuenta ocurrencias, no solo presencia: una receta que repite el
      // ingrediente cinco veces es un match mas fuerte que una que lo nombra.
      for (;;) {
        const i = hay.indexOf(t, from)
        if (i < 0) break
        n++
        from = i + t.length
      }
    }
    if (n) out.push({ id: e.id, n })
  }
  // Desempate estable por id: dos consultas iguales devuelven las mismas
  // fuentes, en el mismo orden, en el navegador y en el servidor.
  return out.sort((a, b) => b.n - a.n || a.id.localeCompare(b.id))
}

/** Respuesta de tier free: recuperacion pura, sin inferencia, 100% citada. */
function retrievalOnlyAnswer(
  question: string,
  sources: GosSource[],
): GroundedAnswer {
  if (!sources.length) {
    return {
      status: 'no-sources',
      answer:
        'No hay ninguna entrada de GOS que coincida con esa consulta, asi que no tengo nada que afirmar. Prueba con el nombre de una receta, ingrediente o sustancia.',
      citations: [],
      consulted: [],
      model: 'retrieval-free',
      reason: 'zero-sources',
    }
  }
  const blocks = sources.map((s) => {
    const head = `**${s.label}** — \`${s.kind}:${s.id}\``
    const fields = s.fields
      ? Object.entries(s.fields)
          .filter(([, v]) => v)
          .map(([k, v]) => `- ${k}: ${v}`)
          .join('\n')
      : ''
    const quote = s.snippet ? `\n\n> ${s.snippet}` : ''
    return `${head}${fields ? `\n${fields}` : ''}${quote}`
  })
  return {
    status: 'answered',
    answer: [
      `Encontré ${sources.length} ${sources.length === 1 ? 'entrada' : 'entradas'} de GOS que coinciden con «${question}».`,
      'Lo que hay en el repo, citado literalmente (tier free: sin inferencia del modelo):',
      '',
      ...blocks,
    ].join('\n'),
    citations: sources,
    consulted: sources,
    model: 'retrieval-free',
    via: 'local',
  }
}

export interface GroundedAskOptions {
  question: string
  sources: GosSource[]
  /** 'free' nunca llama al LLM: responde con el texto literal del repo. */
  tierId?: SocioTier['id']
  model?: string
  /** Inyectable para tests. Por defecto la ruta real de este archivo. */
  llm?: typeof llmComplete
  used?: number
  maxSources?: number
}

/**
 * Punto de entrada unico de la consulta con grounding.
 *
 * - tier free: sin inferencia. Devuelve el texto literal de las fuentes.
 * - tier socio: llama a llmComplete y valida cada cita contra las fuentes.
 * - credito agotado: devuelve status 'credit-exhausted' con el ledger, para que
 *   la pagina lo explique en vez de romperse.
 */
export async function askGrounded(
  opts: GroundedAskOptions,
): Promise<GroundedAnswer> {
  const question = (opts.question ?? '').trim()
  const tierId = opts.tierId ?? 'free'
  const sources = (opts.sources ?? []).slice(0, opts.maxSources ?? 6)
  const used = opts.used ?? 0

  if (!question) {
    return {
      status: 'no-sources',
      answer: 'Falta la pregunta.',
      citations: [],
      consulted: [],
      model: 'none',
      reason: 'empty-question',
    }
  }
  if (!sources.length) return retrievalOnlyAnswer(question, sources)

  // Tier free: cero inferencia, cero gasto, respuesta citada al 100%.
  if (tierId === 'free') return retrievalOnlyAnswer(question, sources)

  const ledger = creditStatus(used, tierId)
  const run = opts.llm ?? llmComplete
  const res = await run({
    prompt: buildGroundedPrompt(question, sources),
    system: GROUNDED_SYSTEM,
    model: opts.model,
    tierId,
    estimatedTokens: Math.ceil(
      (question.length + sources.reduce((n, s) => n + (s.snippet?.length ?? 0), 0)) / 4,
    ),
  })

  if (res.model === 'billing-blocked') {
    return {
      status: 'credit-exhausted',
      answer:
        'Tu crédito de inferencia está agotado, así que el agente no ha generado nada. ' +
        `Llevas ${ledger.used} de ${ledger.limit} tokens. La consulta se puede volver a hacer en modo lectura (tier free), que devuelve el texto literal del repo sin gastar crédito.`,
      citations: [],
      consulted: sources,
      model: res.model,
      via: res.via,
      reason: 'billing-blocked',
      credit: ledger,
    }
  }

  const text = (res.text ?? '').trim()
  // El propio modelo puede declarar que no sabe: es una respuesta valida, no
  // un fallo. Se devuelve con las fuentes para que el usuario abra la ficha.
  if (/^NO_LO_SE\b/.test(text) || text.includes('NO_LO_SE')) {
    return {
      status: 'ungrounded',
      answer:
        'El agente no encontró esa respuesta en GOS y no la va a inventar. ' +
        `Leí ${sources.length} ${sources.length === 1 ? 'entrada' : 'entradas'} sin datos que respondieran a la pregunta.`,
      citations: [],
      consulted: sources,
      model: res.model,
      via: res.via,
      reason: 'model-declined',
    }
  }

  const { valid, unknownKeys } = resolveCitations(text, sources)
  const validKeys = valid.map((s) => sourceKey(s.kind, s.id))
  const unsupported = unsupportedClaims(text, validKeys)

  // Sin una sola cita valida no hay nada publicable: el modelo escribio texto
  // sin respaldo y GOS no permite afirmaciones sin fuente.
  if (!valid.length) {
    return {
      status: 'ungrounded',
      answer:
        'El agente respondió sin citar ninguna fuente de GOS, así que su respuesta no se publica. ' +
        'Un dato de GOS solo vale si apunta a una receta, ingrediente o sustancia real del repo.',
      citations: [],
      consulted: sources,
      model: res.model,
      via: res.via,
      reason: 'no-valid-citation',
      unsupported: unsupported.slice(0, 5),
    }
  }
  // Con citas pero con afirmaciones sueltas sin respaldo, se recorta el texto
  // a las frases que si estan citadas en vez de dejar pasar el resto.
  if (unsupported.length) {
    const keep = text
      .split(/(?<=[.!?;])\s+|\n+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .filter(
        (s) =>
          parseCitations(s).some((c) => validKeys.includes(sourceKey(c.kind, c.id))) ||
          (!/\d/.test(s) && !HEALTH_CLAIM_RE.test(s)),
      )
    return {
      status: 'answered',
      answer: [
        ...keep,
        '',
        `_${unsupported.length} afirmación(es) del modelo sin cita se descartaron: GOS solo publica lo que apunta a una fuente real._`,
      ].join('\n'),
      citations: valid,
      consulted: sources,
      model: res.model,
      via: res.via,
      reason: 'trimmed-unsupported-claims',
      unsupported: unsupported.slice(0, 5),
      credit: ledger,
    }
  }

  return {
    status: 'answered',
    answer: text,
    citations: valid,
    consulted: sources,
    model: res.model,
    via: res.via,
    credit: ledger,
    ...(unknownKeys.length ? { reason: `ignored-citations:${unknownKeys.join(',')}` } : {}),
  }
}

export type GroundedAskResponse =
  | { ok: true; data: GroundedAnswer }
  | { ok: false; reason: 'endpoint-down'; detail: string }

export async function fetchGroundedAnswer(
  question: string,
  opts: {
    endpoint?: string
    tierId?: SocioTier['id']
    signal?: AbortSignal
    fetchImpl?: typeof fetch
  } = {},
): Promise<GroundedAskResponse> {
  const doFetch = opts.fetchImpl ?? globalThis.fetch
  try {
    const res = await doFetch(opts.endpoint ?? '/api/ai/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, tierId: opts.tierId ?? 'free' }),
      signal: opts.signal,
    })
    const body = (await res.json().catch(() => null)) as {
      data?: GroundedAnswer
    } | null
    if (!body || typeof body !== 'object' || !body.data) {
      return { ok: false, reason: 'endpoint-down', detail: `HTTP ${res.status}` }
    }
    return { ok: true, data: body.data }
  } catch (e) {
    // La pagina no se rompe nunca por el endpoint: degrada a texto plano.
    return {
      ok: false,
      reason: 'endpoint-down',
      detail: e instanceof Error ? e.message : String(e),
    }
  }
}
