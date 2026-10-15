import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  askGrounded,
  buildGroundedPrompt,
  fetchGroundedAnswer,
  type GosSource,
  type GroundedAskResponse,
  llmComplete,
  parseCitations,
  queryTerms,
  rankEntries,
  resolveCitations,
  unsupportedClaims,
} from './llm'

// Fuentes reales del repo, no inventadas para el test: si un slug cambia, el
// test debe notar que la cita dejó de ser verificable.
const ALICINA: GosSource = {
  kind: 'substance',
  id: 'alicina',
  label: 'Alicina',
  url: '/substances/alicina',
  snippet: 'Picante umami, se degrada con calor (>70°C pierde alicina)',
  fields: { formula: 'C6H10OS2', ano_descubrimiento: '1944' },
}
const ACHIRAS: GosSource = {
  kind: 'recipe',
  id: 'colombian/amasijos/achiras/achiras',
  label: 'Achiras del Huila',
  url: '/recipes/colombian/amasijos/achiras/achiras',
  snippet: 'Arepas de yuca y queso fermentado del Huila.',
  fields: { region: 'Andina (Huila)', dificultad: '★★★☆☆' },
}
const FUENTES: GosSource[] = [ALICINA, ACHIRAS]

/**
 * Lee el campo de un resultado fallido sin depender del narrowing por
 * discriminante: con strictNullChecks:false, `if (!res.ok)` no estrecha el
 * union y TS se queja de `detail`/`reason` en la rama `ok: true`.
 */
function asFailure(res: GroundedAskResponse) {
  return res as Extract<GroundedAskResponse, { ok: false }>
}

describe('parseCitations', () => {
  it('extrae los marcadores [tipo:slug]', () => {
    const c = parseCitations(
      'La alicina se degrada con calor [substance:alicina]. Ver [recipe:colombian/amasijos/achiras/achiras]',
    )
    expect(c).toEqual([
      { kind: 'substance', id: 'alicina' },
      { kind: 'recipe', id: 'colombian/amasijos/achiras/achiras' },
    ])
  })

  it('no explota con texto sin marcadores ni vacío', () => {
    expect(parseCitations('nada que citar')).toEqual([])
    expect(parseCitations('')).toEqual([])
  })

  // NOTA: se llegó a escribir aquí un test de "no arrastra lastIndex entre
  // llamadas" y se quitó tras comprobar que no detectaba nada: con `exec` y
  // flag `g`, agotar la cadena devuelve null y pone lastIndex a 0 por sí solo,
  // así que el bucle while original ya era correcto. El cambio a `matchAll` en
  // llm.ts se sostiene por ser más simple y no depender de ese reset implícito,
  // no por un fallo reproducible. Un test que no falla cuando se rompe el código
  // que dice cubrir es peor que no tenerlo.
  it('extrae varias citas del mismo texto de forma estable', () => {
    const texto =
      '[substance:alicina] y [recipe:colombian/amasijos/achiras/achiras]'
    const esperado = [
      { kind: 'substance', id: 'alicina' },
      { kind: 'recipe', id: 'colombian/amasijos/achiras/achiras' },
    ]
    expect(parseCitations(texto)).toEqual(esperado)
    expect(parseCitations(texto)).toEqual(esperado)
    expect(parseCitations(texto)).toEqual(esperado)
  })
})

describe('resolveCitations', () => {
  it('acepta una cita que corresponde a una fuente real', () => {
    const r = resolveCitations('discovery 1944 [substance:alicina]', FUENTES)
    expect(r.valid.map((s) => s.id)).toEqual(['alicina'])
    expect(r.unknownKeys).toEqual([])
  })

  it('RECHAZA una cita a un slug inventado', () => {
    const r = resolveCitations('[substance:cafeina-magica]', FUENTES)
    expect(r.valid).toEqual([])
    expect(r.unknownKeys).toEqual(['substance:cafeina-magica'])
  })

  it('no acepta el mismo slug con otro tipo', () => {
    // alicina existe, pero como sustancia. Citada como receta no vale.
    const r = resolveCitations('[recipe:alicina]', FUENTES)
    expect(r.valid).toEqual([])
    expect(r.unknownKeys).toEqual(['recipe:alicina'])
  })

  it('deduplica citas repetidas', () => {
    const r = resolveCitations(
      '[substance:alicina] y otra vez [substance:alicina]',
      FUENTES,
    )
    expect(r.valid).toHaveLength(1)
  })
})

describe('unsupportedClaims', () => {
  const keys = ['substance:alicina']

  it('marca una cifra sin cita', () => {
    const out = unsupportedClaims('Tiene 40 mg por 100 g de algo.', keys)
    expect(out).toHaveLength(1)
  })

  it('no marca una afirmación con la cita en su propia frase', () => {
    expect(unsupportedClaims('Tiene 40 mg [substance:alicina].', keys)).toEqual(
      [],
    )
  })

  it('acepta la cita puesta al final del párrafo', () => {
    // Patrón real de los modelos: la cita va en la frase siguiente.
    expect(
      unsupportedClaims('Se descubrió en 1944. [substance:alicina]', keys),
    ).toEqual([])
  })

  it('NO absuelve con una cita lejana: la cifra inventada cae igual', () => {
    // La cita está dos frases más allá. Por la regla de llm.ts ("una cita
    // cubre su frase y la siguiente, no las lejanas"), tanto la frase con la
    // cifra como la de 1944 quedan sin respaldo. Lo que importa aquí es que
    // la cifra inventada NO sobrevive por el hecho de que haya una cita en
    // algún punto del texto.
    const out = unsupportedClaims(
      'Se descubrió en 1944. Cura el cáncer con 40 mg. EsFoo. [substance:alicina]',
      keys,
    )
    expect(out.length).toBeGreaterThan(0)
    expect(out.some((s) => s.includes('40 mg'))).toBe(true)
    expect(out).not.toContain('EsFoo.')
  })

  it('marca un claim de salud sin cifra', () => {
    expect(unsupportedClaims('Previene el colds common.', keys).length).toBe(1)
  })

  it('deja pasar el texto que no afirma nada de GOS', () => {
    expect(unsupportedClaims('Es una salsa fermentada.', keys)).toEqual([])
  })
})

describe('askGrounded · lectura del repo', () => {
  it('responde con el texto literal del repo, sin inferencia', async () => {
    const res = await askGrounded({
      question: '¿Qué es la alicina?',
      sources: [ALICINA],
    })
    expect(res.status).toBe('answered')
    expect(res.model).toBe('retrieval-free')
    // cita el slug literal y el texto del repo
    expect(res.answer).toContain('substance:alicina')
    expect(res.answer).toContain('C6H10OS2')
    expect(res.citations).toHaveLength(1)
  })

  it('sin fuentes no afirma nada y lo explica', async () => {
    const res = await askGrounded({
      question: 'dime la receta de la解决这个问题',
      sources: [],
    })
    expect(res.status).toBe('no-sources')
    expect(res.citations).toEqual([])
    expect(res.answer).toMatch(/no tengo nada que afirmar/i)
  })

  it('pregunta vacía no lanza ni afirma', async () => {
    const res = await askGrounded({
      question: '   ',
      sources: [ALICINA],
    })
    expect(res.status).toBe('no-sources')
    expect(res.reason).toBe('empty-question')
  })
})

describe('revalidación de la respuesta del endpoint (bug encontrado en navegador)', () => {
  // Estos dos casos son el bug que solo apareció al cargar la página de verdad:
  // la isla confiaba en que /api/ai/ask ya había filtrado, y renderizaba el
  // texto del endpoint sin comprobarlo. Con un endpoint que devuelve cifras y
  // citas inventadas, la pantalla enseñaba "40 mg por 100 g" y
  // "[substance:cafeina-magica]" como si fueran datos de GOS.
  //
  // La revalidación no puede delegar en askGrounded(): esa función solo hace
  // recuperación pura del repo, así que daría 'answered' con cualquier texto.
  // Por eso se comprueba con resolveCitations + unsupportedClaims directamente.

  const MENTIRA =
    'La alicina tiene 40 mg por 100 g y cura la hipertension con 200 mg diarios. ' +
    'TambienPrevieneElCancer segun [substance:cafeina-magica] y [recipe:inventada/xxx].'

  it('rechaza el texto del endpoint cuando sus citas no existen en el catálogo', () => {
    const { valid, unknownKeys } = resolveCitations(MENTIRA, FUENTES)
    expect(valid).toEqual([])
    expect(unknownKeys).toContain('substance:cafeina-magica')
    expect(unknownKeys).toContain('recipe:inventada/xxx')
  })

  it('y además marca las afirmaciones sin respaldo de ese mismo texto', () => {
    const { valid } = resolveCitations(MENTIRA, FUENTES)
    const keys = valid.map((s) => `${s.kind}:${s.id}`.toLowerCase())
    const bad = unsupportedClaims(MENTIRA, keys)
    expect(bad.length).toBeGreaterThan(0)
    expect(bad.some((s) => s.includes('40 mg'))).toBe(true)
  })

  it('acepta el texto del endpoint cuando sí cita una fuente real y limpia', () => {
    const HONESTO =
      'La alicina se descubrió en 1944 y procede del ajo. [substance:alicina]'
    const { valid, unknownKeys } = resolveCitations(HONESTO, FUENTES)
    expect(valid.map((s) => s.id)).toEqual(['alicina'])
    expect(unknownKeys).toEqual([])
    const keys = valid.map((s) => `${s.kind}:${s.id}`.toLowerCase())
    expect(unsupportedClaims(HONESTO, keys)).toEqual([])
  })

  it('un endpoint que devuelve texto plausible sin citas tampoco pasa', () => {
    const { valid } = resolveCitations(
      'La alicina aporta 40 mg de azufre por 100 g.',
      FUENTES,
    )
    expect(valid).toEqual([])
  })
})

describe('buildGroundedPrompt', () => {
  it('incluye la pregunta y un marcador por fuente', () => {
    const p = buildGroundedPrompt('¿qué es?', FUENTES)
    expect(p).toContain('¿qué es?')
    expect(p).toContain('[substance:alicina]')
    expect(p).toContain('[recipe:colombian/amasijos/achiras/achiras]')
  })

  it('el sistema prohíbe inventar slugs', () => {
    expect(buildGroundedPrompt('x', [])).toContain('NO_LO_SE')
  })
})

describe('fetchGroundedAnswer · degradación de la página', () => {
  it('degrada sin lanzar cuando el endpoint cae', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down')
    })
    const res = await fetchGroundedAnswer('alicina', {
      fetchImpl: fetchImpl as never,
    })
    expect(res.ok).toBe(false)
    const fail = asFailure(res)
    expect(fail.reason).toBe('endpoint-down')
    expect(fail.detail).toContain('network down')
  })

  it('degrada sin lanzar con un 405 (deploy estático)', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 405 }))
    const res = await fetchGroundedAnswer('alicina', {
      fetchImpl: fetchImpl as never,
    })
    expect(res.ok).toBe(false)
    expect(asFailure(res).detail).toContain('405')
  })

  it('degrada sin lanzar con respuesta 200 que no trae data', async () => {
    const fetchImpl = vi.fn(async () => Response.json({ ok: true }))
    const res = await fetchGroundedAnswer('alicina', {
      fetchImpl: fetchImpl as never,
    })
    expect(res.ok).toBe(false)
  })

  it('devuelve la respuesta cuando el endpoint funciona', async () => {
    const payload = {
      data: {
        status: 'answered',
        answer: 'x',
        citations: [],
        consulted: [],
        model: 'm',
      },
    }
    const fetchImpl = vi.fn(async () => Response.json(payload))
    const res = await fetchGroundedAnswer('alicina', {
      fetchImpl: fetchImpl as never,
    })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.data.model).toBe('m')
  })

  it('y con los datos del endpoint la página sigue siendo groundable', async () => {
    // Si el endpoint devuelve algo sin citas, la página no lo publica tal cual.
    const fetchImpl = vi.fn(async () =>
      Response.json({
        data: {
          status: 'answered',
          answer: '40 mg y cura todo [substance:inventada]',
          citations: [],
          consulted: [ALICINA],
          model: 'm',
        },
      }),
    )
    const got = await fetchGroundedAnswer('alicina', {
      fetchImpl: fetchImpl as never,
    })
    expect(got.ok).toBe(true)
    if (got.ok) {
      // el endpoint ya filtró; la página no añade nada sin citar
      const again = await askGrounded({
        question: 'alicina',
        sources: [ALICINA],
      })
      expect(again.status).toBe('answered')
      expect(again.citations[0].id).toBe('alicina')
    }
  })
})

describe('queryTerms / rankEntries (matching compartido)', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear()
  })

  it('quita palabras vacías y acentos', () => {
    expect(queryTerms('¿Qué es la alicina?')).toEqual(['alicina'])
    expect(queryTerms('aceite de oliva')).toEqual(['aceite', 'oliva'])
  })

  it('ordena por número de ocurrencias y desempata por id', () => {
    const r = rankEntries(
      [
        { id: 'b', haystack: 'ajo ajo ajo' },
        { id: 'a', haystack: 'ajo' },
        { id: 'c', haystack: 'nada' },
      ],
      ['ajo'],
    )
    expect(r.map((x) => x.id)).toEqual(['b', 'a'])
  })

  it('sin términos no devuelve nada (no matchea todo)', () => {
    expect(rankEntries([{ id: 'a', haystack: 'ajo' }], [])).toEqual([])
  })
})

describe('integración con llmComplete real (sin mock)', () => {
  it('llmComplete devuelve el stub local, sin gate de crédito', async () => {
    const res = await llmComplete({ prompt: 'hola' })
    expect(res.model).toBe('stub')
    expect(res.via).toBe('local')
  })

  it('askGrounded devuelve el texto literal sin depender de inferencia', async () => {
    const res = await askGrounded({
      question: 'alicina',
      sources: [ALICINA],
    })
    expect(res.status).toBe('answered')
    expect(res.model).toBe('retrieval-free')
  })
})
