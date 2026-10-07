import { getCollection } from 'astro:content'
import type { APIRoute } from 'astro'
import type { CatalogEntry, GosSource } from '../../../lib/llm'

// GET /api/agent/catalog.json — el catálogo que indexa el agente de GOS.
//
// Por qué existe: el agente necesita poder buscar en todas las entradas del
// repo desde el navegador, pero meter las ~1200 entradas como props del isla
// convertía /agent en un HTML de 900 KB que se descargaba entero antes de
// poder escribir una palabra. Splitteado aquí, la página pesa lo que pese y el
// catálogo llega una sola vez, cacheado por el service worker.
//
// Es GET a propósito: en output:'static' esto se prerenderiza a un archivo
// JSON y existe en el deploy real, a diferencia de los POST.

function str(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}
function arr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x))
  if (typeof v === 'string') return [v]
  return []
}
function clip(t: unknown, max = 300): string {
  const clean = String(t ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max).replace(/\s+\S*$/, '')}…`
}

type Row = Record<string, unknown>
type Kind = GosSource['kind']

export const GET: APIRoute = async () => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
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

  const entries: CatalogEntry[] = []

  for (const e of dishes) {
    const d = e.data as Row
    const label = str(d.title) || e.id
    entries.push({
      kind: 'recipe' as Kind,
      id: e.id,
      label,
      url: `${base}/recipes/${e.id}`,
      snippet: clip(d.description),
      // Solo lo que hace falta para que una pregunta encuentre la entrada. El
      // texto largo va en `snippet`, no duplicado aquí.
      haystack: [
        label,
        str(d.region),
        arr(d.categories),
        arr(d.main_ingredients),
      ].join(' '),
      fields: {
        region: str(d.region),
        dificultad: str(d.difficulty),
        preparacion: str(d.prep_time),
        coccion: str(d.cook_time),
        ingredientes: arr(d.main_ingredients).join(', '),
      },
    })
  }
  for (const e of ingredients) {
    const d = e.data as Row
    const label = str(d.name) || e.id
    entries.push({
      kind: 'ingredient' as Kind,
      id: e.id,
      label,
      url: `${base}/ingredients/${e.id}`,
      snippet: clip(d.description),
      haystack: [label, str(d.scientific_name), str(d.group), arr(d.tags)].join(
        ' ',
      ),
      fields: {
        nombre_cientifico: str(d.scientific_name),
        grupo: str(d.group),
      },
    })
  }
  for (const e of substances) {
    const d = e.data as Row
    const label = str(d.name) || e.id
    entries.push({
      kind: 'substance' as Kind,
      id: e.id,
      label,
      url: `${base}/substances/${e.id}`,
      snippet: clip(d.benefit || d.description),
      haystack: [
        label,
        str(d.formula),
        str(d.source_ingredient),
        arr(d.tags),
      ].join(' '),
      fields: {
        formula: str(d.formula),
        ano: str(d.discovery_year),
        origen: str(d.source_ingredient),
        beneficio: str(d.benefit),
        sazon: str(d.sazon),
        sabor: str(d.sabor),
        textura: str(d.textura),
      },
    })
  }
  for (const e of vitamins) {
    const d = e.data as Row
    const label = str(d.name) || e.id
    entries.push({
      kind: 'vitamin' as Kind,
      id: e.id,
      label,
      url: `${base}/scientific`,
      snippet: clip(d.function),
      haystack: [label, str(d.code), str(d.group), str(d.function)].join(' '),
      fields: { codigo: str(d.code), unidad: str(d.unit), rda: str(d.rda) },
    })
  }
  for (const e of conditions) {
    const d = e.data as Row
    const label = str(d.name) || e.id
    entries.push({
      kind: 'condition' as Kind,
      id: e.id,
      label,
      url: `${base}/scientific`,
      snippet: clip(d.description),
      haystack: [label, str(d.category), str(d.mechanism)].join(' '),
      fields: { categoria: str(d.category), evidencia: str(d.evidence_level) },
    })
  }
  for (const e of diets) {
    const d = e.data as Row
    const label = str(d.name) || e.id
    entries.push({
      kind: 'diet' as Kind,
      id: e.id,
      label,
      url: `${base}/scientific`,
      snippet: clip(d.description),
      haystack: [label, arr(d.rules)].join(' '),
      fields: { reglas: arr(d.rules).join(' · ') },
    })
  }
  for (const e of mixtures) {
    const d = e.data as Row
    const label = str(d.name) || e.id
    entries.push({
      kind: 'mixture' as Kind,
      id: e.id,
      label,
      url: `${base}/scientific`,
      snippet: clip(d.synergy_mechanism || d.description),
      haystack: [label, arr(d.ingredients), arr(d.active_compounds)].join(' '),
      fields: {
        ingredientes: arr(d.ingredients).join(', '),
        compuestos: arr(d.active_compounds).join(', '),
        contraindicaciones: arr(d.contraindications).join(', '),
      },
    })
  }

  const body = {
    desc: 'Catálogo indexable del agente GOS. Cada entrada lleva su slug: sin slug no hay cita válida.',
    count: entries.length,
    entries,
  }

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      // Inmutable entre builds: el SW lo cachea y el catálogo no se invalida
      // en cada visita.
      'Cache-Control': 'public, max-age=3600',
      'X-GOS-Catalog-Entries': String(entries.length),
    },
  })
}
