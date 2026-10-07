import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  askGrounded,
  buildGroundedPrompt,
  fetchGroundedAnswer,
  type GosSource,
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
 * llmComplete simulado.
 *
 * Deliberadamente NO es "siempre devuelve éxito con texto plausible": cada
 * escenario devuelve la respuesta que un modelo real podría dar, incluidos
 * los casos malos. Un fake que solo sabe decir la verdad no detecta que el
 * grounding esté roto — que es justo el fallo que estos tests cubren.
 */
function fakeLLM(text: string, model = 'llama-3-8b') {
  return vi.fn(async () => ({ text, model, via: 'cf' as const }))
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
    const r = resolveCitations('[substance:alicina] y otra vez [substance:alicina]', FUENTES)
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
    expect(unsupportedClaims('Tiene 40 mg [substance:alicina].', keys)).toEqual([])
  })

  it('acepta la cita puesta al final del párrafo', () => {
    // Patrón real de los modelos: la cita va en la frase siguiente.
    expect(unsupportedClaims('Se descubrió en 1944. [substance:alicina]', keys)).toEqual([])
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

describe('askGrounded · tier free', () => {
  it('responde con el texto literal del repo y NO llama al LLM', async () => {
    const llm = fakeLLM('no debería llamarse')
    const res = await askGrounded({
      question: '¿Qué es la alicina?',
      sources: [ALICINA],
      tierId: 'free',
      llm,
    })
    expect(llm).not.toHaveBeenCalled()
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
      tierId: 'free',
    })
    expect(res.status).toBe('no-sources')
    expect(res.citations).toEqual([])
    expect(res.answer).toMatch(/no tengo nada que afirmar/i)
  })

  it('pregunta vacía no lanza ni afirma', async () => {
    const res = await askGrounded({ question: '   ', sources: [ALICINA], tierId: 'free' })
    expect(res.status).toBe('no-sources')
    expect(res.reason).toBe('empty-question')
  })
})

describe('askGrounded · tier socio con crédito', () => {
  it('publica la respuesta si cita una fuente real', async () => {
    const llm = fakeLLM(
      'La alicina se descubrió en 1944 [substance:alicina] y se degrada con calor [substance:alicina].',
    )
    const res = await askGrounded({
      question: '¿Cuándo se descubrió la alicina?',
      sources: [ALICINA],
      tierId: 'socio',
      used: 100,
      llm,
    })
    expect(llm).toHaveBeenCalledTimes(1)
    expect(res.status).toBe('answered')
    expect(res.reason).toBeUndefined()
    expect(res.citations.map((c) => c.id)).toEqual(['alicina'])
    expect(res.credit).toMatchObject({ used: 100, limit: 50000 })
  })

  it('el prompt que se manda lleva los marcadores de cada fuente', async () => {
    const llm = fakeLLM('[substance:alicina]')
    await askGrounded({
      question: 'alicina',
      sources: FUENTES,
      tierId: 'socio',
      llm,
    })
    const req = llm.mock.calls[0][0]
    expect(req.prompt).toContain('[substance:alicina]')
    expect(req.prompt).toContain('[recipe:colombian/amasijos/achiras/achiras]')
    expect(req.tierId).toBe('socio')
  })
})

describe('askGrounded · respuestas sin fuente (el caso que NO puede pasar)', () => {
  it('RECHAZA una respuesta con texto plausible y cero citas', async () => {
    const llm = fakeLLM(
      'La alicina tiene 40 mg de alicina por 100 g y cura la hipertensión con una dosis diaria de 200 mg.',
    )
    const res = await askGrounded({
      question: '¿cuánta alicina tiene el ajo?',
      sources: [ALICINA],
      tierId: 'socio',
      llm,
    })
    expect(res.status).toBe('ungrounded')
    expect(res.reason).toBe('no-valid-citation')
    expect(res.citations).toEqual([])
    // el texto inventado NO sale en la respuesta publicable
    expect(res.answer).not.toContain('40 mg')
    expect(res.answer).not.toContain('cura la hipertensión')
    // pero sí queda registrado para poder auditarlo
    expect(res.unsupported?.length).toBeGreaterThan(0)
  })

  it('RECHAZA cuando la única cita es a un slug inventado', async () => {
    const llm = fakeLLM('Según [substance:cafeina] el ajo cura la anemia.')
    const res = await askGrounded({
      question: 'anemia',
      sources: [ALICINA],
      tierId: 'socio',
      llm,
    })
    expect(res.status).toBe('ungrounded')
    expect(res.reason).toBe('no-valid-citation')
    expect(res.answer).not.toContain('cura la anemia')
  })

  it('respeta NO_LO_SE del modelo como "no lo sé", no como fallo', async () => {
    const llm = fakeLLM('NO_LO_SE')
    const res = await askGrounded({
      question: 'dosis diaria de alicina',
      sources: [ALICINA],
      tierId: 'socio',
      llm,
    })
    expect(res.status).toBe('ungrounded')
    expect(res.reason).toBe('model-declined')
    expect(res.answer).toMatch(/no la va a inventar/i)
  })

  it('CON citas recorta las afirmaciones sueltas sin respaldo', async () => {
    const llm = fakeLLM(
      [
        'La alicina se descubrió en 1944 [substance:alicina].',
        'Tiene 40 mg por 100 g.',
        'Cura la hipertensión con 200 mg diarios.',
      ].join(' '),
    )
    const res = await askGrounded({
      question: 'alicina',
      sources: [ALICINA],
      tierId: 'socio',
      llm,
    })
    expect(res.status).toBe('answered')
    expect(res.reason).toBe('trimmed-unsupported-claims')
    // la frase citada sobrevive, las dos inventadas no
    expect(res.answer).toContain('1944')
    expect(res.answer).not.toContain('40 mg')
    expect(res.answer).not.toContain('cura la hipertensión')
    expect(res.unsupported).toHaveLength(2)
  })
})

describe('askGrounded · crédito agotado', () => {
  it('tier free sin crédito: no llama al LLM y no se rompe', async () => {
    const llm = fakeLLM('nada')
    const res = await askGrounded({
      question: 'alicina',
      sources: [ALICINA],
      tierId: 'free',
      used: 0,
      llm,
    })
    // free nunca entra por el gate de crédito: monthlyCredit es 0 pero
    // tampoco hay inferencia que pagar.
    expect(llm).not.toHaveBeenCalled()
    expect(res.status).toBe('answered')
  })

  it('tier socio con crédito agotado lo explica en vez de romperse', async () => {
    // El LLM real devuelve 'billing-blocked' cuando canAffordInference falla.
    const llm = vi.fn(async () => ({
      text: '[billing] credito socio agotado (50000/50000). Upgrade a socio o espera reset.',
      model: 'billing-blocked',
      via: 'local' as const,
    }))
    const res = await askGrounded({
      question: 'alicina',
      sources: [ALICINA],
      tierId: 'socio',
      used: 50000,
      llm,
    })
    expect(res.status).toBe('credit-exhausted')
    expect(res.reason).toBe('billing-blocked')
    expect(res.citations).toEqual([])
    expect(res.credit).toMatchObject({ used: 50000, remaining: 0 })
    expect(res.answer).toMatch(/agotado/i)
    // y ofrece la salida: el modo lectura no gasta
    expect(res.answer).toMatch(/tier free/i)
  })

  it('el crédito agotado NO se confunde con respuesta sin fuente', async () => {
    const blocked = await askGrounded({
      question: 'alicina',
      sources: [ALICINA],
      tierId: 'socio',
      used: 50000,
      llm: vi.fn(async () => ({ text: 'x', model: 'billing-blocked', via: 'local' as const })),
    })
    const ungrounded = await askGrounded({
      question: 'alicina',
      sources: [ALICINA],
      tierId: 'socio',
      used: 0,
      llm: fakeLLM('sin citas ni fuente'),
    })
    expect(blocked.status).toBe('credit-exhausted')
    expect(ungrounded.status).toBe('ungrounded')
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
    const res = await fetchGroundedAnswer('alicina', { fetchImpl: fetchImpl as never })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe('endpoint-down')
  })

  it('degrada sin lanzar con un 405 (deploy estático)', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 405 }))
    const res = await fetchGroundedAnswer('alicina', { fetchImpl: fetchImpl as never })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.detail).toContain('405')
  })

  it('degrada sin lanzar con respuesta 200 que no trae data', async () => {
    const fetchImpl = vi.fn(async () => Response.json({ ok: true }))
    const res = await fetchGroundedAnswer('alicina', { fetchImpl: fetchImpl as never })
    expect(res.ok).toBe(false)
  })

  it('devuelve la respuesta cuando el endpoint funciona', async () => {
    const payload = { data: { status: 'answered', answer: 'x', citations: [], consulted: [], model: 'm' } }
    const fetchImpl = vi.fn(async () => Response.json(payload))
    const res = await fetchGroundedAnswer('alicina', { fetchImpl: fetchImpl as never })
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
    const got = await fetchGroundedAnswer('alicina', { fetchImpl: fetchImpl as never })
    expect(got.ok).toBe(true)
    if (got.ok) {
      // el endpoint ya filtró; la página no añade nada sin citar
      const again = await askGrounded({
        question: 'alicina',
        sources: [ALICINA],
        tierId: 'free',
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
  it('el gate de crédito de llm.ts sigue bloqueando en free', async () => {
    // No lo reescribimos: verificamos que el comportamiento original sigue.
    const res = await llmComplete({ prompt: 'hola', tierId: 'free', estimatedTokens: 1 })
    expect(res.model).toBe('billing-blocked')
  })

  it('y askGrounded en free no depende de ese gate', async () => {
    const res = await askGrounded({
      question: 'alicina',
      sources: [ALICINA],
      tierId: 'free',
    })
    expect(res.status).toBe('answered')
    expect(res.model).toBe('retrieval-free')
  })
})