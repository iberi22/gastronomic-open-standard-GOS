// Hardening del gateway (N-03, N-04, F-01, F-02, entities, ?key=, secretos).
// Cada caso falla contra la version anterior de src/index.ts.

import { describe, expect, it, vi } from 'vitest'
import worker from '../src/index'
import { createFakeD1, type FakeD1 } from './d1-fake'

const GW = 'https://gos-api-gateway.test'

function fakeKV() {
  const m = new Map<string, string>()
  return {
    m,
    async get(k: string) {
      return m.get(k) ?? null
    },
    async put(k: string, v: string) {
      m.set(k, v)
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
  const kv = fakeKV()
  const { db, c } = countingDb(fake)
  const env = {
    ORIGIN_URL: 'https://origin.test',
    DB: db,
    RATE_LIMIT_KV: kv,
    AI: {
      run: async () => ({ response: 'x'.repeat(opts.aiChars ?? 40) }),
    },
  }
  return { fake, kv, env, c }
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

  it('tras AUTH_FAIL_LIMIT fallos, la IP recibe 429 y D1 deja de consultarse', async () => {
    const { env, c } = setup()
    const e = { ...env, AUTH_FAIL_LIMIT: '3' }
    const hit = (key: string) =>
      worker.fetch(
        new Request(`${GW}/api/all.json`, {
          headers: { 'x-api-key': key, 'cf-connecting-ip': '9.9.9.9' },
        }),
        e as never,
      )
    for (let i = 0; i < 3; i++)
      expect((await hit(`bad_key_${i}x`)).status).toBe(401)
    const before = c.prepares
    expect(before).toBe(3)
    for (let i = 10; i < 20; i++)
      expect((await hit(`bad_key_${i}x`)).status).toBe(429)
    expect(c.prepares).toBe(before)
  })

  it('throttle por prefijo de key aunque cambie la IP', async () => {
    const { env, c } = setup()
    const e = { ...env, AUTH_FAIL_LIMIT: '2' }
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
                (init?.headers as Record<string, string>)['x-service-secret'],
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
