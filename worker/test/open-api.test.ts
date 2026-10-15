// La API abierta de GOS: los endpoints de datos responden SIN key, el mapa de
// rutas lista solo lo que existe, y /api/ai/infer (inferencia de pago) ya no
// existe. Cada caso falla si alguien reintroduce cobro o autenticacion.

import { describe, expect, it, vi } from 'vitest'
import worker from '../src/index'
import { createFakeD1 } from './d1-fake'

const GW = 'https://gos-api-gateway.test'

const ORIGIN_JSON = JSON.stringify({ recipes: [], count: 0 })

/**
 * Limiter de rafaga permisivo: el gateway es fail-closed, asi que sin binding
 * RL_FREE_BURST toda peticion seria 503. Estos tests no miden la rafaga.
 */
function permissiveRL(limit = 1000) {
  const m = new Map<string, number>()
  return {
    async limit({ key }: { key: string }) {
      const n = (m.get(key) ?? 0) + 1
      m.set(key, n)
      return { success: n <= limit }
    },
  }
}

function env(overrides: Record<string, unknown> = {}) {
  return {
    ORIGIN_URL: 'https://origin.test',
    DB: createFakeD1({ applySchema: true }).db,
    RL_FREE_BURST: permissiveRL(),
    ...overrides,
  }
}

/** Ejecuta el worker interceptando el proxy al origen. */
async function call(
  path: string,
  init: RequestInit = {},
  e: Record<string, unknown> = env(),
) {
  const f = vi.fn(
    async () =>
      new Response(ORIGIN_JSON, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  )
  vi.stubGlobal('fetch', f)
  const res = await worker.fetch(new Request(`${GW}${path}`, init), e as never)
  vi.unstubAllGlobals()
  return { res, originCalls: f.mock.calls.length }
}

const ROUTES = [
  '/api/all.json',
  '/api/by-country/catalog.json',
  '/api/by-country/mexico.json',
  '/api/with-metadata.json',
  '/graph-data.json',
  '/llms.txt',
  '/llms-full.txt',
]

describe('endpoints de datos abiertos: responden sin ninguna key', () => {
  it.each(ROUTES)('%s responde 200 sin credencial', async (path) => {
    const { res, originCalls } = await call(path)
    expect(res.status).toBe(200)
    expect(originCalls).toBe(1)
  })

  it('todos exponen CORS abierto (*) y content-type del origen', async () => {
    for (const path of ROUTES) {
      const { res } = await call(path)
      expect(res.headers.get('access-control-allow-origin')).toBe('*')
      expect(res.headers.get('content-type')).toBe('application/json')
    }
  })

  it('el preflight OPTIONS sigue respondiendo 204 sin tocar el origen', async () => {
    const { res, originCalls } = await call('/api/all.json', {
      method: 'OPTIONS',
    })
    expect(res.status).toBe(204)
    expect(originCalls).toBe(0)
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('una key en la cabecera no cambia la respuesta ni habilita nada', async () => {
    for (const headers of [
      { 'x-api-key': 'socio' },
      { Authorization: 'Bearer socio' },
    ]) {
      const { res, originCalls } = await call('/api/all.json', { headers })
      expect(res.status).toBe(200)
      expect(originCalls).toBe(1)
      // No hay cabecera de tier: no existen tiers.
      expect(res.headers.get('x-ratelimit-tier')).toBeNull()
    }
  })

  it('el rate limit anonimo se anuncia en cabeceras, sin mencion a tiers', async () => {
    const { res } = await call('/api/all.json')
    expect(res.headers.get('x-ratelimit-limit')).toBe('100')
    expect(res.headers.get('x-ratelimit-tier')).toBeNull()
  })
})

describe('/api/routes lista solo lo que existe', () => {
  it.each(['/api', '/api/', '/api/routes'])(
    '%s responde el mapa',
    async (path) => {
      const { res, originCalls } = await call(path)
      expect(res.status).toBe(200)
      expect(originCalls).toBe(0)
      const body = (await res.json()) as Record<string, unknown>
      expect(body.name).toBe('GOS Open Data API')
      expect(body.authentication).toMatch(/none/i)
      const routes = body.routes as Record<string, string>
      expect(routes.allRecipes).toBe('/api/all.json')
      expect(routes.catalog).toBe('/api/by-country/catalog.json')
      expect(routes.graphData).toBe('/graph-data.json')
      expect(routes.llmsFull).toBe('/llms-full.txt')
    },
  )

  it('no anuncia keys, ni paywall, ni inferencia, ni tiers', async () => {
    const { res } = await call('/api/routes')
    const raw = JSON.stringify(await res.json())
    expect(raw).not.toMatch(/x-api-key|Bearer|paid|tier|plan|credit|price/i)
  })

  it('no lista la ruta de inferencia eliminada', async () => {
    const { res } = await call('/api/routes')
    const body = (await res.json()) as { routes: Record<string, string> }
    expect(Object.values(body.routes)).not.toContain('/api/ai/infer')
    expect(JSON.stringify(body)).not.toMatch(/infer/)
  })
})

describe('/api/ai/infer fue eliminado', () => {
  it.each(['GET', 'POST'])(
    '%s responde 404 y no toca el origen',
    async (method) => {
      const { res, originCalls } = await call('/api/ai/infer', {
        method,
        body:
          method === 'POST' ? JSON.stringify({ prompt: 'hola' }) : undefined,
      })
      expect(res.status).toBe(404)
      expect(originCalls).toBe(0)
      const body = (await res.json()) as Record<string, unknown>
      expect(String(body.error)).toMatch(/removed/i)
    },
  )

  it('no hay binding AI ni ledger: nada que devolver aunque se pida un prompt', async () => {
    const { res } = await call('/api/ai/infer', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': 'socio' },
      body: JSON.stringify({ prompt: 'x'.repeat(10_000) }),
    })
    expect(res.status).toBe(404)
  })
})
