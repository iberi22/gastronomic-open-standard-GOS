// Hardening del gateway (N-03, N-04, F-01, F-02, entities, ?key=, secretos).
// Cada caso falla contra la version anterior de src/index.ts.

import { describe, expect, it, vi } from 'vitest'
import worker from '../src/index'
import { createFakeD1, type FakeD1 } from './d1-fake'

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

function countingDb(fake: FakeD1) {
  const c = { prepares: 0, sqls: [] as string[] }
  const db = {
    prepare(sql: string) {
      c.prepares++
      c.sqls.push(sql)
      return fake.db.prepare(sql)
    },
  }
  return { db, c }
}

function setup(opts: { aiChars?: number } = {}) {
  const fake = createFakeD1({ applySchema: true })
  fake.seed({ key: 'gs_key_alpha', tier: 'socio' })
  fake.seed({ key: 'gs_key_beta', tier: 'socio' })
  const { db, c } = countingDb(fake)
  const env = {
    ORIGIN_URL: 'https://origin.test',
    DB: db,
    AI: {
      run: async () => ({ response: 'x'.repeat(opts.aiChars ?? 40) }),
    },
  }
  return { fake, env, c }
}

function infer(
  key: string,
  prompt: string,
  extra: Record<string, unknown> = {},
) {
  return new Request(`${GW}/api/ai/infer`, {
    method: 'POST',
    headers: { 'x-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, ...extra }),
  })
}

async function ledger(fake: FakeD1) {
  const r = await fake.db
    .prepare('SELECT key_id, used FROM credit_ledger')
    .all<{
      key_id: string
      used: number
    }>()
  return r.results ?? []
}

describe('N-03: ledger por key autenticada, no por appId del cliente', () => {
  it('cambiar appId en el body NO abre un ledger nuevo', async () => {
    const { fake, env } = setup()
    const prompt = 'a'.repeat(4000) // 1000 tokens estimados
    for (const appId of ['a1', 'a2', 'a3']) {
      const res = await worker.fetch(
        infer('gs_key_alpha', prompt, { appId }),
        env as never,
      )
      expect(res.status).toBe(200)
    }
    const rows = await ledger(fake)
    expect(rows).toHaveLength(1)
    expect(rows[0].key_id).toMatch(/^key:[0-9a-f]{32}$/)
    expect(rows[0].key_id).not.toContain('gs_key_alpha')
    expect(rows[0].used).toBe(30) // 3 x 10 tokens reales, acumulados en UN ledger
  })

  it('dos keys distintas tienen ledgers independientes', async () => {
    const { fake, env } = setup()
    await worker.fetch(infer('gs_key_alpha', 'hola'), env as never)
    await worker.fetch(infer('gs_key_beta', 'hola'), env as never)
    expect(await ledger(fake)).toHaveLength(2)
  })

  it('sin D1 el ledger falla cerrado (503), no concede credito', async () => {
    const { env } = setup()
    const res = await worker.fetch(infer('gs_key_alpha', 'hola'), {
      ...env,
      DB: undefined,
      GOS_DEV_KEY: 'gs_key_alpha',
    } as never)
    expect(res.status).toBe(503)
  })
})

describe('atomicidad del contador', () => {
  it('5 peticiones concurrentes de 20000 tokens: caben exactamente 2 (cuota 50000)', async () => {
    const { fake, env } = setup({ aiChars: 80000 })
    const prompt = 'p'.repeat(80000) // 20000 tokens
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        worker.fetch(infer('gs_key_alpha', prompt), env as never),
      ),
    )
    const statuses = results.map((r) => r.status).sort()
    expect(statuses).toEqual([200, 200, 402, 402, 402])
    const rows = await ledger(fake)
    expect(rows[0].used).toBeLessThanOrEqual(50000)
  })
})

describe('N-04: throttle antes de D1', () => {
  it('key malformada: 401 sin tocar D1', async () => {
    const { env, c } = setup()
    for (const bad of ['a b', "x'; DROP--", 'k'.repeat(500), 'ñandú']) {
      const res = await worker.fetch(
        new Request(`${GW}/api/all.json`, { headers: { 'x-api-key': bad } }),
        env as never,
      )
      expect(res.status).toBe(401)
    }
    expect(c.prepares).toBe(0)
  })

  it('tras agotar el binding RL_AUTH, la IP recibe 429 y D1 deja de consultarse', async () => {
    const { env, c } = setup()
    const e = { ...env, RL_AUTH: fakeRL(3) }
    const hit = (key: string) =>
      worker.fetch(
        new Request(`${GW}/api/all.json`, {
          headers: { 'x-api-key': key, 'cf-connecting-ip': '9.9.9.9' },
        }),
        e as never,
      )
    // El gate cuenta ip y prefijo; claves con prefijo distinto aislan la IP.
    for (let i = 0; i < 3; i++)
      expect((await hit(`bad${i}_key_x`)).status).toBe(401)
    const before = c.prepares
    expect(before).toBe(3)
    for (let i = 10; i < 20; i++)
      expect((await hit(`bad${i}_key_x`)).status).toBe(429)
    expect(c.prepares).toBe(before)
  })

  it('throttle por prefijo de key aunque cambie la IP', async () => {
    const { env, c } = setup()
    const e = { ...env, RL_AUTH: fakeRL(2) }
    const hit = (ip: string) =>
      worker.fetch(
        new Request(`${GW}/api/all.json`, {
          headers: { 'x-api-key': 'prefixAA_guess', 'cf-connecting-ip': ip },
        }),
        e as never,
      )
    await hit('1.1.1.1')
    await hit('2.2.2.2')
    const before = c.prepares
    expect((await hit('3.3.3.3')).status).toBe(429)
    expect(c.prepares).toBe(before)
  })

  it('sin binding RL_AUTH falla abierto (no tumba el servicio)', async () => {
    const { env } = setup()
    const res = await worker.fetch(
      new Request(`${GW}/api/all.json`, {
        headers: { 'x-api-key': 'nope_key1' },
      }),
      env as never,
    )
    expect(res.status).toBe(401)
  })
})

describe('rate limit free: binding + D1, sin KV', () => {
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

  it('rutas estaticas nunca tocan D1 (ni KV): cache primero, sin prepare()', async () => {
    const { env, c } = setup()
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
    const kv = { get: vi.fn(), put: vi.fn() }
    const e = { ...env, RATE_LIMIT_KV: kv, RL_FREE_BURST: fakeRL(1000) }
    for (const p of [
      '/api/all.json',
      '/api/by-country/mx.json',
      '/api/v1/recipes',
      '/graph-data.json',
    ]) {
      expect((await get(p, e)).status).toBe(200)
    }
    // segunda lectura: viene de cache, el origen no se vuelve a llamar
    const f = globalThis.fetch as ReturnType<typeof vi.fn>
    const calls = f.mock.calls.length
    expect((await get('/api/all.json', e)).status).toBe(200)
    expect(f.mock.calls.length).toBe(calls)
    vi.unstubAllGlobals()
    expect(c.prepares).toBe(0)
    expect(kv.get).not.toHaveBeenCalled()
    expect(kv.put).not.toHaveBeenCalled()
  })

  it('rafaga: superado el limite del binding responde 429 sin D1 ni origen', async () => {
    const { env, c } = setup()
    origin()
    const e = { ...env, RL_FREE_BURST: fakeRL(3) }
    const st: number[] = []
    for (let i = 0; i < 5; i++) st.push((await get('/api/all.json', e)).status)
    const f = globalThis.fetch as ReturnType<typeof vi.fn>
    expect(f.mock.calls.length).toBe(3)
    vi.unstubAllGlobals()
    expect(st).toEqual([200, 200, 200, 429, 429])
    expect(c.prepares).toBe(0)
  })

  it('rafaga: es por IP', async () => {
    const { env } = setup()
    origin()
    const e = { ...env, RL_FREE_BURST: fakeRL(1) }
    expect((await get('/api/all.json', e, '1.1.1.1')).status).toBe(200)
    expect((await get('/api/all.json', e, '1.1.1.1')).status).toBe(429)
    expect((await get('/api/all.json', e, '2.2.2.2')).status).toBe(200)
    vi.unstubAllGlobals()
  })

  it('cuota diaria en D1: un UPSERT por peticion no estatica y 429 al agotarse', async () => {
    const { fake, env, c } = setup()
    origin()
    const e = { ...env, FREE_DAILY_LIMIT: '3' }
    const st: number[] = []
    let last: Response | undefined
    for (let i = 0; i < 5; i++) {
      last = await get('/api/entities/recipe', e)
      st.push(last.status)
    }
    vi.unstubAllGlobals()
    expect(st).toEqual([200, 200, 200, 429, 429])
    expect(last?.headers.get('retry-after')).toBe('86400')
    expect(c.sqls.filter((q) => q.includes('free_quota'))).toHaveLength(5)
    const row = await fake.db
      .prepare('SELECT ip_key, n FROM free_quota')
      .all<{ ip_key: string; n: number }>()
    expect(row.results).toHaveLength(1)
    expect(row.results?.[0].n).toBe(3)
    expect(row.results?.[0].ip_key).not.toContain('5.5.5.5')
  })

  it('cuota diaria: concurrencia atomica, caben exactamente 4 de 10', async () => {
    const { env } = setup()
    origin()
    const e = { ...env, FREE_DAILY_LIMIT: '4' }
    const rs = await Promise.all(
      Array.from({ length: 10 }, () => get('/api/entities/x', e)),
    )
    vi.unstubAllGlobals()
    expect(rs.filter((r) => r.status === 200)).toHaveLength(4)
  })

  it('una key de pago no cuenta cuota ni rafaga free', async () => {
    const { env, c } = setup()
    origin()
    const rl = fakeRL(0)
    const e = { ...env, RL_FREE_BURST: rl, FREE_DAILY_LIMIT: '1' }
    const r = await worker.fetch(
      new Request(`${GW}/api/entities/recipe`, {
        headers: { 'x-api-key': 'gs_key_alpha' },
      }),
      e as never,
    )
    vi.unstubAllGlobals()
    expect(r.status).toBe(200)
    expect(rl.calls).toHaveLength(0)
    expect(c.sqls.some((q) => q.includes('free_quota'))).toBe(false)
  })

  it('D1 caida en la cuota free: falla abierto, la rafaga sigue protegiendo', async () => {
    const { env } = setup()
    origin()
    const bad = createFakeD1({ mode: 'throws', applySchema: true })
    const r = await get('/api/entities/recipe', { ...env, DB: bad.db })
    vi.unstubAllGlobals()
    expect(r.status).toBe(200)
  })
})

describe('/api/entities/*: mutaciones solo con key de pago', () => {
  it('POST sin key -> 403, no llega al origen', async () => {
    const { env } = setup()
    const f = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', f)
    const res = await worker.fetch(
      new Request(`${GW}/api/entities/recipe`, { method: 'POST', body: '{}' }),
      env as never,
    )
    vi.unstubAllGlobals()
    expect(res.status).toBe(403)
    expect(f).not.toHaveBeenCalled()
  })

  it('DELETE con key de pago valida se reenvia; GET libre sigue igual', async () => {
    const { env } = setup()
    const f = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', f)
    const del = await worker.fetch(
      new Request(`${GW}/api/entities/recipe?id=1`, {
        method: 'DELETE',
        headers: { 'x-api-key': 'gs_key_alpha' },
      }),
      env as never,
    )
    const get = await worker.fetch(
      new Request(`${GW}/api/entities/recipe`),
      env as never,
    )
    vi.unstubAllGlobals()
    expect(del.status).toBe(200)
    expect(get.status).toBe(200)
  })
})

describe('?key= y secretos', () => {
  it('?key= no se reenvia al origen ni autentica', async () => {
    const { env } = setup()
    const f = vi.fn(async (_u: string) => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', f)
    const res = await worker.fetch(
      new Request(`${GW}/api/all.json?key=gs_key_alpha&x=1`),
      env as never,
    )
    vi.unstubAllGlobals()
    expect(res.headers.get('x-ratelimit-tier')).toBe('free')
    const url = String(f.mock.calls[0][0])
    expect(url).not.toContain('key=')
    expect(url).toContain('x=1')
  })

  it('acepta SERVICE_SHARED_SECRET y el nombre antiguo BILLING_SERVICE_SECRET', async () => {
    for (const name of ['SERVICE_SHARED_SECRET', 'BILLING_SERVICE_SECRET']) {
      const seen: string[] = []
      vi.stubGlobal(
        'fetch',
        vi.fn(async (u: string, init?: RequestInit) => {
          if (String(u).includes('billing.test')) {
            seen.push(
              String(
                (init?.headers as Record<string, string> | undefined)?.[
                  'x-service-secret'
                ],
              ),
            )
            return new Response(
              JSON.stringify({
                active: true,
                plan: 'socio',
                quota: 1,
                used: 0,
                remaining: 1,
              }),
              { status: 200 },
            )
          }
          return new Response('{}', { status: 200 })
        }),
      )
      const res = await worker.fetch(
        new Request(`${GW}/api/all.json`, {
          headers: { 'x-api-key': 'swal_abcdef12' },
        }),
        {
          ORIGIN_URL: 'https://origin.test',
          BILLING_URL: 'https://billing.test',
          [name]: 's3',
        } as never,
      )
      vi.unstubAllGlobals()
      expect(res.status).toBe(200)
      expect(seen).toEqual(['s3'])
    }
  })
})
