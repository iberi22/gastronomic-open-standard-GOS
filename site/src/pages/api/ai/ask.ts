import { getCollection } from 'astro:content'
import type { APIRoute } from 'astro'
import { creditStatus, isTierId, type SocioTier } from '../../../lib/billing'
import {
  askGrounded,
  type GosSource,
  queryTerms,
  rankEntries,
} from '../../../lib/llm'

// POST /api/ai/ask — consulta al agente de GOS, con fuentes verificables.
//
// Por qué no un endpoint "pregunta -> texto libre": este es el que impide que
// el modelo diga una cifra nutricional o un claim de salud que no sale del
// contenido. Las fuentes se arman del contenido real del repo (astro:content,
// la misma fuente que las fichas) y la respuesta solo se publica si cita una
// de ellas. Sin fuentes no hay respuesta: hay un "no lo sé".
//
// Sigue el patrón de api/entities/[entity].ts: mismo json(), mismo status de
// error. El 200 se reserva para cuando el agente pudo responder, e incluye
// los casos "no lo sé" y "crédito agotado": son respuestas, no fallos de red.
//
// OJO — estático: GOS despliega con output:'static' y sin adapter SSR, así que
// en Cloudflare Pages este POST devuelve 405 salvo que se añada el adapter o
// una Function. Está escrito y probado, pero la página no depende de que
// exista: trae las fuentes en el propio HTML y resuelve en el navegador. Este
// endpoint sirve cuando sí hay runtime de servidor.

const MAX_QUESTION = 500
const MAX_SOURCES = 6

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}

function normalizeTier(raw: unknown): SocioTier['id'] {
  return isTierId(raw) ? raw : 'free'
}

function asArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x))
  if (typeof v === 'string') return [v]
  return []
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

/** Texto corto y literal para citar. Recorta por palabra, sin cortar a medias. */
function clip(text: unknown, max = 320): string {
  const clean = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max).replace(/\s+\S*$/, '')}…`
}

interface Candidate {
  src: GosSource
  haystack: string
}

/**
 * Arma las fuentes desde las colecciones de astro:content.
 *
 * El snippet y los `fields` salen literales del archivo del repo. El modelo
 * solo puede repetir lo que hay aquí, y el usuario puede contrastarlo con la
 * ficha enlazada.
 */
export async function collectSources(question: string): Promise<GosSource[]> {
  const terms = queryTerms(question)
  if (!terms.length) return []
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const out: Candidate[] = []

  const [
    dishes,
    ingredients,
    substances,
    vitamins,
    conditions,
    diets,
    mixtures,
  ] = await Promise.all([
    getCollection('dishes'),
    getCollection('ingredients'),
    getCollection('substances'),
    getCollection('vitamins'),
    getCollection('conditions'),
    getCollection('diets'),
    getCollection('mixtures'),
  ])

  for (const e of dishes) {
    const d = e.data as Record<string, unknown>
    const label = str(d.title) || e.id
    out.push({
      haystack: [
        label,
        str(d.region),
        asArray(d.categories).join(' '),
        asArray(d.main_ingredients).join(' '),
        str(d.description),
      ].join(' '),
      src: {
        kind: 'recipe',
        id: e.id,
        label,
        url: `${base}/recipes/${e.id}`,
        snippet: clip(d.description),
        fields: {
          region: str(d.region),
          dificultad: str(d.difficulty),
          preparacion: str(d.prep_time),
          coccion: str(d.cook_time),
          ingredientes: asArray(d.main_ingredients).join(', '),
          categorias: asArray(d.categories).join(', '),
        },
      },
    })
  }

  for (const e of ingredients) {
    const d = e.data as Record<string, unknown>
    const label = str(d.name) || e.id
    out.push({
      haystack: [
        label,
        str(d.scientific_name),
        str(d.group),
        asArray(d.tags).join(' '),
      ].join(' '),
      src: {
        kind: 'ingredient',
        id: e.id,
        label,
        url: `${base}/ingredients/${e.id}`,
        snippet: clip(d.description),
        fields: {
          nombre_cientifico: str(d.scientific_name),
          grupo: str(d.group),
        },
      },
    })
  }

  for (const e of substances) {
    const d = e.data as Record<string, unknown>
    const label = str(d.name) || e.id
    out.push({
      haystack: [
        label,
        str(d.formula),
        str(d.source_ingredient),
        asArray(d.tags).join(' '),
      ].join(' '),
      src: {
        kind: 'substance',
        id: e.id,
        label,
        url: `${base}/substances/${e.id}`,
        snippet: clip(d.benefit || d.description),
        fields: {
          formula: str(d.formula),
          ano_descubrimiento: str(d.discovery_year),
          ingrediente_origen: str(d.source_ingredient),
          beneficio: str(d.benefit),
          sazon: str(d.sazon),
          sabor: str(d.sabor),
          textura: str(d.textura),
        },
      },
    })
  }

  for (const e of vitamins) {
    const d = e.data as Record<string, unknown>
    const label = str(d.name) || e.id
    out.push({
      haystack: [label, str(d.code), str(d.group), str(d.function)].join(' '),
      src: {
        kind: 'vitamin',
        id: e.id,
        label,
        url: `${base}/scientific#${e.id}`,
        snippet: clip(d.function),
        fields: {
          codigo: str(d.code),
          unidad: str(d.unit),
          rda: str(d.rda),
          funcion: str(d.function),
          deficiencia: clip(d.deficiency, 160),
        },
      },
    })
  }

  for (const e of conditions) {
    const d = e.data as Record<string, unknown>
    const label = str(d.name) || e.id
    out.push({
      haystack: [
        label,
        str(d.category),
        str(d.mechanism),
        str(d.description),
      ].join(' '),
      src: {
        kind: 'condition',
        id: e.id,
        label,
        url: `${base}/scientific#${e.id}`,
        snippet: clip(d.description),
        fields: {
          categoria: str(d.category),
          nivel_evidencia: str(d.evidence_level),
          mecanismo: clip(d.mechanism, 200),
        },
      },
    })
  }

  for (const e of diets) {
    const d = e.data as Record<string, unknown>
    const label = str(d.name) || e.id
    out.push({
      haystack: [label, str(d.description), asArray(d.rules).join(' ')].join(
        ' ',
      ),
      src: {
        kind: 'diet',
        id: e.id,
        label,
        url: `${base}/scientific#${e.id}`,
        snippet: clip(d.description),
        fields: {
          reglas: asArray(d.rules).join(' · '),
          permitidos: asArray(d.allowed_ingredients).join(', '),
          prohibidos: asArray(d.forbidden_ingredients).join(', '),
        },
      },
    })
  }

  for (const e of mixtures) {
    const d = e.data as Record<string, unknown>
    const label = str(d.name) || e.id
    out.push({
      haystack: [
        label,
        asArray(d.ingredients).join(' '),
        asArray(d.active_compounds).join(' '),
      ].join(' '),
      src: {
        kind: 'mixture',
        id: e.id,
        label,
        url: `${base}/scientific#${e.id}`,
        snippet: clip(d.synergy_mechanism || d.description),
        fields: {
          ingredientes: asArray(d.ingredients).join(', '),
          compuestos_activos: asArray(d.active_compounds).join(', '),
          contraindicaciones: asArray(d.contraindications).join(', '),
        },
      },
    })
  }

  const ranked = rankEntries(
    out.map((c) => ({ id: c.src.id, haystack: c.haystack })),
    terms,
  )
  const byId = new Map(out.map((c) => [c.src.id, c.src]))
  return ranked
    .slice(0, MAX_SOURCES)
    .map((r) => byId.get(r.id))
    .filter((s): s is GosSource => Boolean(s))
}

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json(
      { error: 'invalid json', detail: 'POST body must be JSON' },
      400,
    )
  }
  const question = str(body.question).slice(0, MAX_QUESTION)
  if (!question) return json({ error: 'question required' }, 400)

  const tierId = normalizeTier(body.tierId)
  // El crédito lo lee llm.ts de su ledger (localStorage → D1 en prod). Aquí no
  // se inventa: si no viene en el body, cero.
  const used = Number.isFinite(Number(body.used)) ? Number(body.used) : 0

  try {
    const sources = await collectSources(question)
    const data = await askGrounded({ question, sources, tierId, used })
    return json({
      ok: true,
      question,
      tierId,
      ledger: creditStatus(used, tierId),
      data,
    })
  } catch (err) {
    return json(
      {
        error: 'agent-failed',
        detail: err instanceof Error ? err.message : String(err),
      },
      500,
    )
  }
}

export const GET: APIRoute = async () =>
  json(
    {
      error: 'use POST',
      usage: {
        method: 'POST',
        body: {
          question: 'string (requerido)',
          tierId: 'free | socio | socio-managed',
        },
        notes: [
          'tier free: no llama al LLM, devuelve el texto literal de las fuentes.',
          'tier socio: llama a llmComplete y solo publica citas que existen en el repo.',
          'GOS es output:static sin adapter: sin runtime de servidor este POST da 405.',
        ],
      },
    },
    405,
  )
