// llm.ts — capa agentica LLM SWAL
// Reusa ProviderRouter + Clavis + xavier-gpud de cores/swal-agent-runner/src/services/llm/
// Router local con memoria RAG. La cuota de inferencia la gestiona la plataforma
// SWAL: esta app no lleva tiers, creditos ni peaje propio (decision 2026-10-15).

import { xavierSearch } from './xavier'

export type LLMRequest = {
  prompt: string
  system?: string
  model?: string
  useMemory?: boolean
}
export type LLMResponse = {
  text: string
  model: string
  fromCache?: boolean
  via?: 'local' | 'cf'
}

export async function llmComplete(req: LLMRequest): Promise<LLMResponse> {
  // RAG opcional + stub local (xavier-gpud / opencode en prod). Sin peaje de
  // creditos: la cuota de IA la aplica la plataforma SWAL, no esta app.
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

export type GroundedStatus = 'answered' | 'ungrounded' | 'no-sources'

export interface GroundedAnswer {
  status: GroundedStatus
  /** Texto publicable. En 'ungrounded' es la explicacion. */
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
}

/** Marcador de cita que el modelo debe emitir: [recipe:colombian/xxx]. */
const CITATION_RE =
  /\[(recipe|ingredient|substance|vitamin|condition|diet|mixture):([^\]\s]+)\]/gi

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
  // Regex propio por llamada en vez de resetear CITATION_RE.lastIndex: el
  // flag `g` hace que lastIndex viva entre llamadas, y resetearlo a mano
  // depende del orden en que se llame a la función. Con una instancia local
  // no hay estado compartido.
  for (const m of text.matchAll(CITATION_RE)) {
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
export function buildGroundedPrompt(
  question: string,
  sources: GosSource[],
): string {
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
  'que',
  'qué',
  'como',
  'cuanto',
  'cuanta',
  'cuantos',
  'cuantas',
  'de',
  'del',
  'la',
  'las',
  'el',
  'los',
  'un',
  'una',
  'y',
  'o',
  'en',
  'para',
  'por',
  'con',
  'sin',
  'me',
  'mi',
  'es',
  'son',
  'tiene',
  'tienen',
  'hay',
  'dime',
  'sabes',
  'quiero',
  'cual',
  'cuales',
  'a',
  'al',
  'sobre',
  'dame',
  'explica',
  'sirve',
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

/** Una entrada del repo tal como viaja del build a la isla del navegador. */
export interface CatalogEntry extends GosSource {
  /**
   * Texto plano donde se busca la pregunta. Viaja con la entrada para que el
   * matching en el navegador no necesite volver a cargar el contenido.
   */
  haystack: string
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
  maxSources?: number
}

/**
 * Punto de entrada unico de la consulta con grounding.
 *
 * Devuelve el texto literal del repo, citado al 100% (recuperacion pura, sin
 * inferencia ni gasto). La cuota de IA la aplica la plataforma SWAL, no esta app.
 */
export async function askGrounded(
  opts: GroundedAskOptions,
): Promise<GroundedAnswer> {
  const question = (opts.question ?? '').trim()
  const sources = (opts.sources ?? []).slice(0, opts.maxSources ?? 6)

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
  return retrievalOnlyAnswer(question, sources)
}

export type GroundedAskResponse =
  | { ok: true; data: GroundedAnswer }
  | { ok: false; reason: 'endpoint-down'; detail: string }

export async function fetchGroundedAnswer(
  question: string,
  opts: {
    endpoint?: string
    signal?: AbortSignal
    fetchImpl?: typeof fetch
  } = {},
): Promise<GroundedAskResponse> {
  const doFetch = opts.fetchImpl ?? globalThis.fetch
  try {
    const res = await doFetch(opts.endpoint ?? '/api/ai/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
      signal: opts.signal,
    })
    const body = (await res.json().catch(() => null)) as {
      data?: GroundedAnswer
    } | null
    if (!body || typeof body !== 'object' || !body.data) {
      return {
        ok: false,
        reason: 'endpoint-down',
        detail: `HTTP ${res.status}`,
      }
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
