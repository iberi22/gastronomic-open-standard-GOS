// Hardening del gateway ABIERTO de GOS.
//
// El gateway no tiene base de datos (decision del owner, 2026-10-21). El unico
// limite anonimo es la rafaga por IP del Rate Limiting binding RL_FREE_BURST
// (30/60 s). Lo que queda blindado: la rafaga no se salta, responde 429 con
// Retry-After, la cache no consulta nada mas, las mutaciones no llegan al
// origen y no queda ningun rastro de D1 ni de cuota diaria.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import worker from '../src/index'

const HERE = dirname(fileURLToPath(import.meta.url))
const GW = 'https://gos-api-gateway.test'

/** Mock del Rate Limiting binding: ventana fija sin reloj, N por clave. */
function fakeRL(limit: number) {
  const m = new Map<string, number>()
  const calls: string[] = []
  return {
    m,
    calls,
    async limit({ key }: { key: string }) {
      calls.push(key)
      const n = (m.get(key) ?? 0) + 1
      m.set(key, n)
      return { success: n <= limit }
    },
  }
}

function setup(limit = 1000) {
  return { ORIGIN_URL: 'https://origin.test', RL_FREE_BURST: fakeRL(limit) }
}

const origin = () =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{"ok":true}', { status: 200 })),
  )

const get = (path: string, env: unknown, ip = '5.5.5.5') =>
  worker.fetch(
    new Request(`${GW}${path}`, { headers: { 'cf-connecting-ip': ip } }),
    env as never,
  )

describe('limite anonimo: solo la rafaga por IP (RL_FREE_BURST)', () => {
  it('rutas estaticas: la cache responde y el origen no se vuelve a llamar', async () => {
    const store = new Map<string, Response>()
    vi.stubGlobal('caches', {
      default: {
        match: async (r: Request) => store.get(r.url)?.clone(),
        put: async (r: Request, res: Response) => {
          store.set(r.url, res)
        },
      },
    })
    origin()
    const rl = fakeRL(1000)
    const e = { ...setup(), RL_FREE_BURST: rl }
    for (const p of [
      '/api/all.json',
      '/api/by-country/mx.json',
      '/api/v1/recipes',
      '/graph-data.json',
    ]) {
      expect((await get(p, e)).status).toBe(200)
    }
    const f = globalThis.fetch as ReturnType<typeof vi.fn>
    const calls = f.mock.calls.length
    expect((await get('/api/all.json', e)).status).toBe(200)
    expect(f.mock.calls.length).toBe(calls)
    vi.unstubAllGlobals()
    // La rafaga cubre cada peticion, incluida la servida desde cache.
    expect(rl.calls.length).toBe(5)
  })

  it('rutas no estaticas funcionan sin ninguna base de datos (200 bajo el cupo)', async () => {
    origin()
    const r = await get('/api/entities/recipe', setup())
    vi.unstubAllGlobals()
    expect(r.status).toBe(200)
  })

  it('superado el cupo de rafaga: 429 con Retry-After 60 y el origen no se llama', async () => {
    origin()
    const e = setup(2)
    const st: number[] = []
    let last: Response | undefined
    for (let i = 0; i < 4; i++) {
      last = await get('/api/entities/recipe', e)
      st.push(last.status)
    }
    const f = globalThis.fetch as ReturnType<typeof vi.fn>
    const originCalls = f.mock.calls.length
    vi.unstubAllGlobals()
    expect(st).toEqual([200, 200, 429, 429])
    expect(last?.headers.get('retry-after')).toBe('60')
    expect(await last?.json()).toMatchObject({
      error: expect.stringMatching(/rate limit/i),
    })
    expect(originCalls).toBe(2)
  })

  it('la rafaga cubre TODOS los datos abiertos (OPEN_ROUTES), tambien las estaticas', async () => {
    origin()
    const e = setup(2)
    const st: number[] = []
    for (const p of [
      '/api/all.json',
      '/api/by-country/mx.json',
      '/graph-data.json',
    ]) {
      st.push((await get(p, e)).status)
    }
    const f = globalThis.fetch as ReturnType<typeof vi.fn>
    const originCalls = f.mock.calls.length
    vi.unstubAllGlobals()
    expect(st).toEqual([200, 200, 429])
    // La tercera no llego al origen: la rafaga corto antes de la cache/proxy.
    expect(originCalls).toBe(2)
  })

  it('fail-closed: sin RL_FREE_BURST responde 503 y no toca el origen', async () => {
    origin()
    const e: Record<string, unknown> = setup()
    delete e.RL_FREE_BURST
    for (const p of ['/api/all.json', '/api/entities/recipe']) {
      const r = await get(p, e)
      expect(r.status).toBe(503)
      expect(await r.json()).toEqual({ error: 'rate limiter unavailable' })
      expect(r.headers.get('retry-after')).toBe('60')
    }
    const f = globalThis.fetch as ReturnType<typeof vi.fn>
    const originCalls = f.mock.calls.length
    vi.unstubAllGlobals()
    expect(originCalls).toBe(0)
  })

  it('fail-closed: RL_FREE_BURST que lanza responde 503 (no fail-open)', async () => {
    origin()
    const boom = {
      async limit(): Promise<{ success: boolean }> {
        throw new Error('RL_ERROR: injected failure (test)')
      },
    }
    const r = await get('/api/all.json', { ...setup(), RL_FREE_BURST: boom })
    const f = globalThis.fetch as ReturnType<typeof vi.fn>
    const originCalls = f.mock.calls.length
    vi.unstubAllGlobals()
    expect(r.status).toBe(503)
    expect(await r.json()).toEqual({ error: 'rate limiter unavailable' })
    expect(r.headers.get('retry-after')).toBe('60')
    expect(originCalls).toBe(0)
  })

  it('rafaga: es por IP y no por credencial (todos son anonimos)', async () => {
    origin()
    const e = setup(1)
    expect((await get('/api/all.json', e, '1.1.1.1')).status).toBe(200)
    expect((await get('/api/all.json', e, '1.1.1.1')).status).toBe(429)
    expect((await get('/api/all.json', e, '2.2.2.2')).status).toBe(200)
    vi.unstubAllGlobals()
  })

  it('una cabecera x-api-key no cambia NADA: misma rafaga, mismo 200', async () => {
    origin()
    const e = setup(1)
    const withKey = await worker.fetch(
      new Request(`${GW}/api/all.json`, { headers: { 'x-api-key': 'socio' } }),
      e as never,
    )
    const anonymous = await worker.fetch(
      new Request(`${GW}/api/all.json`),
      e as never,
    )
    vi.unstubAllGlobals()
    expect(withKey.status).toBe(200)
    expect(anonymous.status).toBe(429)
  })
})

describe('identidad del limite: solo CF-Connecting-IP', () => {
  it('sin CF-Connecting-IP, rotar X-Forwarded-For NO renueva el cubo', async () => {
    origin()
    const rl = fakeRL(2)
    const e = { ...setup(), RL_FREE_BURST: rl }
    const call = (xff: string) =>
      worker.fetch(
        new Request(`${GW}/api/all.json`, {
          headers: { 'x-forwarded-for': xff },
        }),
        e as never,
      )
    const st = [
      (await call('1.1.1.1')).status,
      (await call('2.2.2.2')).status,
      (await call('3.3.3.3')).status,
    ]
    vi.unstubAllGlobals()
    expect(st).toEqual([200, 200, 429])
    expect(new Set(rl.calls)).toEqual(new Set(['anon:no-ip']))
  })

  it('con CF-Connecting-IP presente, X-Forwarded-For se ignora', async () => {
    origin()
    const rl = fakeRL(1)
    const e = { ...setup(), RL_FREE_BURST: rl }
    const call = (ip: string, xff: string) =>
      worker.fetch(
        new Request(`${GW}/api/all.json`, {
          headers: { 'cf-connecting-ip': ip, 'x-forwarded-for': xff },
        }),
        e as never,
      )
    expect((await call('9.9.9.9', '1.1.1.1')).status).toBe(200)
    expect((await call('9.9.9.9', '2.2.2.2')).status).toBe(429)
    expect((await call('8.8.8.8', '2.2.2.2')).status).toBe(200)
    vi.unstubAllGlobals()
    expect(rl.calls).toEqual(['ip:9.9.9.9', 'ip:9.9.9.9', 'ip:8.8.8.8'])
  })
})

describe('solo lectura: ninguna mutacion llega al origen', () => {
  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    '%s se rechaza con 405 y el origen no se llama',
    async (method) => {
      const f = vi.fn(async () => new Response('{}', { status: 200 }))
      vi.stubGlobal('fetch', f)
      const res = await worker.fetch(
        new Request(`${GW}/api/entities/recipe?id=1`, {
          method,
          body: method === 'DELETE' ? undefined : '{}',
        }),
        setup() as never,
      )
      vi.unstubAllGlobals()
      expect(res.status).toBe(405)
      expect(res.headers.get('allow')).toBe('GET, HEAD, OPTIONS')
      expect(f).not.toHaveBeenCalled()
    },
  )
})

describe('?key= heredado', () => {
  it('?key= no se reenvia al origen ni cambia el tratamiento', async () => {
    const f = vi.fn(async (_u: string) => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', f)
    const res = await worker.fetch(
      new Request(`${GW}/api/all.json?key=gs_key_alpha&x=1`),
      setup() as never,
    )
    vi.unstubAllGlobals()
    expect(res.status).toBe(200)
    expect(f).toHaveBeenCalledTimes(1)
    const url = String(f.mock.calls[0][0])
    expect(url).not.toContain('key=')
    expect(url).toContain('x=1')
  })
})

describe('el gateway no tiene base de datos', () => {
  const wrangler = readFileSync(resolve(HERE, '../wrangler.toml'), 'utf8')
  const indexSrc = readFileSync(resolve(HERE, '../src/index.ts'), 'utf8')

  it('wrangler.toml no declara ningun binding D1 ni la variable de cupo diario', () => {
    expect(wrangler).not.toMatch(/d1_databases/)
    expect(wrangler).not.toMatch(/FREE_DAILY_LIMIT/)
  })

  it('src/index.ts no usa env.DB, D1 ni la cuota diaria', () => {
    expect(indexSrc).not.toMatch(/env\.DB\b/)
    expect(indexSrc).not.toMatch(/D1Database/)
    expect(indexSrc).not.toMatch(/free_quota/)
    expect(indexSrc).not.toMatch(/FREE_DAILY_LIMIT/)
  })
})
