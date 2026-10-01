import { getCollection } from 'astro:content'
import type { APIRoute } from 'astro'

/**
 * GET /api/evidence.json
 *
 * Índice de la evidencia científica con DOI de la plataforma, para que un agente
 * pueda citar sin tener que abrir 90 fichas una por una.
 *
 * Por qué existe: `graph-data.json` expone condiciones, vitaminas y dietas pero
 * sin ninguna referencia — un agente ve "Anemia Ferropenica" y no tiene por
 * dónde verificar la afirmación. Este endpoint junta en una sola petición lo que
 * ya está en el contenido, sin duplicarlo ni inventarlo.
 *
 * Cada estudio incluido lleva un `doi` que resuelve en Crossref. Los que solo
 * tienen cita clínica sin DOI se omiten en `verified` pero se listan en
 * `unverified_count`, para no dar una falsa sensación de cobertura total.
 */

type Study = {
  title: string
  source?: string
  journal?: string
  year?: number
  doi?: string
  pmid?: string
  url?: string
  // Solo para las entradas de health_registry en sustancias.
  condition?: string
  evidence_level?: string
  // false cuando el DOI está marcado como no verificado en la ficha: se
  // publica en `studies` pero no cuenta para `studies_with_doi`.
  verified?: boolean
}

function pickStudies(d: Record<string, unknown>): Study[] {
  const raw = d.studies
  if (!Array.isArray(raw)) return []
  const out: Study[] = []
  for (const s of raw) {
    if (!s || typeof s !== 'object') continue
    const r = s as Record<string, unknown>
    const doi = typeof r.doi === 'string' ? r.doi.trim() : ''
    out.push({
      title: String(r.title ?? ''),
      source:
        typeof r.source === 'string'
          ? r.source
          : typeof r.journal === 'string'
            ? r.journal
            : undefined,
      journal: typeof r.journal === 'string' ? r.journal : undefined,
      year: typeof r.year === 'number' ? r.year : undefined,
      doi: doi || undefined,
      pmid: typeof r.pmid === 'string' ? r.pmid : undefined,
      url:
        typeof r.url === 'string'
          ? r.url
          : doi
            ? `https://doi.org/${doi}`
            : undefined,
    })
    // Un DOI marcado `doi_status: unverified` se conserva en la ficha, pero no
    // se cuenta como verificado: no resolvería en doi.org y publicarlo daría
    // falsa confianza. Ver scripts/verify_dois.py, que es quien lo marca.
    if (
      r.doi_status === 'unverified' ||
      r.doi_status === 'unverified_verified'
    ) {
      out[out.length - 1].verified = false
    }
  }
  return out
}

export const GET: APIRoute = async () => {
  const [vitamins, conditions, diets, substances] = await Promise.all([
    getCollection('vitamins'),
    getCollection('conditions'),
    getCollection('diets'),
    getCollection('substances'),
  ])

  const items: Array<Record<string, unknown>> = []
  let unverified = 0

  const push = (kind: string, id: string, name: string, studies: Study[]) => {
    if (!studies.length) return
    const verified = studies.filter((s) => s.doi && s.verified !== false)
    // Si tras filtrar no queda ninguno verificado, la entrada no se publica:
    // un agente veria "Cafeina: studies: []" y concluiria que no hay
    // literatura, cuando en realidad sus DOI no resuelven. La ficha sigue
    // viva en el sitio, pero no se anuncia como evidencia.
    if (!verified.length) {
      unverified += studies.length
      return
    }
    unverified += studies.length - verified.length
    items.push({
      kind,
      id,
      name,
      studies: verified,
      verified_count: verified.length,
    })
  }

  for (const e of vitamins) {
    const d = e.data as Record<string, unknown>
    push('vitamin', e.id, String(d.name ?? e.id), pickStudies(d))
  }
  for (const e of diets) {
    const d = e.data as Record<string, unknown>
    push('diet', e.id, String(d.name ?? e.id), pickStudies(d))
  }
  for (const e of conditions) {
    const d = e.data as Record<string, unknown>
    push('condition', e.id, String(d.name ?? e.id), pickStudies(d))
  }
  for (const e of substances) {
    const d = e.data as Record<string, unknown>
    const hr = d.health_registry
    if (!Array.isArray(hr)) continue
    const studies: Study[] = []
    for (const entry of hr) {
      if (!entry || typeof entry !== 'object') continue
      const st = (entry as Record<string, unknown>).studies
      if (Array.isArray(st)) {
        for (const s of st) {
          if (!s || typeof s !== 'object') continue
          const r = s as Record<string, unknown>
          const doi = typeof r.doi === 'string' ? r.doi.trim() : ''
          studies.push({
            title: String(r.title ?? ''),
            journal: typeof r.source === 'string' ? r.source : undefined,
            year: typeof r.year === 'number' ? r.year : undefined,
            doi: doi || undefined,
            condition: String(
              (entry as Record<string, unknown>).condition ?? '',
            ),
            evidence_level: String(
              (entry as Record<string, unknown>).evidence_level ?? '',
            ),
            // Igual que en pickStudies: un DOI marcado como no verificado no
            // cuenta para studies_with_doi.
            verified: r.doi_status !== 'unverified',
          })
        }
      }
    }
    push('substance', e.id, String(d.name ?? e.id), studies)
  }

  const byKind: Record<string, number> = {}
  let doiCount = 0
  for (const it of items) {
    const k = String(it.kind)
    byKind[k] = (byKind[k] ?? 0) + 1
    const list = it.studies
    if (Array.isArray(list)) {
      // `list` ya viene filtrado por `push`, asi que solo hace falta contar
      // los que ademas tienen DOI.
      doiCount += list.filter((s) => Boolean((s as Study).doi)).length
    }
  }

  const body = {
    desc: 'Evidencia científica con DOI verificado. Cada doi resuelve en Crossref.',
    generated_from: [
      'site/src/content/vitamins',
      'site/src/content/diets',
      'site/src/content/conditions',
      'site/src/content/substances',
    ],
    entries_with_studies: items.length,
    entries_by_kind: byKind,
    studies_with_doi: doiCount,
    studies_without_doi: unverified,
    items: items.sort(
      (a, b) =>
        String(a.kind).localeCompare(String(b.kind)) ||
        String(a.name).localeCompare(String(b.name)),
    ),
  }

  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
      'X-GOS-Evidence-Entries': String(items.length),
      'X-GOS-Evidence-DOI': String(doiCount),
    },
  })
}
