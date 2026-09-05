import { describe, expect, it, vi } from 'vitest'
import worker, { type Env } from '../../workers/ai'

// Mock env for worker (sin Cloudflare real)
function mockEnv(overrides: Partial<Env> = {}): {
  env: Env
  credits: Map<string, number>
} {
  const store = new Map<string, string>()
  const credits = new Map<string, number>()
  const env: Env = {
    AI: { run: vi.fn(async () => ({ response: 'hola mundo' })) },
    SWAL_D1: {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => ({
          first: async () => {
            if (sql.includes('SELECT used'))
              return { used: credits.get(String(args[0])) ?? 0 }
            return null
          },
          run: async () => {
            if (sql.includes('INSERT OR REPLACE INTO credits'))
              credits.set(String(args[0]), Number(args[1]))
            return {}
          },
          all: async () => ({ results: [] }),
        }),
      }),
    },
    SWAL_KV: {
      get: async (k: string) => store.get(k) ?? null,
      put: async (k: string, v: string) => {
        store.set(k, v)
      },
    },
    SWAL_R2: {},
    ...overrides,
  }
  return { env, credits }
}

interface InferJson {
  text: string
  credit: { remaining: number }
  breakdown: { total: number }
}

describe('workers/ai.ts billing', () => {
  it('200 con credito socio', async () => {
    const { env } = mockEnv()
    const req = new Request('http://localhost/api/ai/infer', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'hola',
        tierId: 'socio',
        appId: 'my-app',
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await worker.fetch(req, env)
    expect(res.status).toBe(200)
    const j = (await res.json()) as InferJson
    expect(j.text).toContain('hola')
    expect(j.credit.remaining).toBeLessThan(50000)
    expect(j.breakdown.total).toBeGreaterThan(0)
  })

  it('402 si credito agotado', async () => {
    // pre-fill used = 50000
    const { env, credits } = mockEnv()
    credits.set('my-app', 50000)
    // Simular via direct D1 mock: inyectamos used via KV
    await env.SWAL_KV.put('credits:my-app', '50000')
    const req = new Request('http://localhost/api/ai/infer', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'hola',
        tierId: 'socio',
        appId: 'my-app',
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await worker.fetch(req, env)
    expect(res.status).toBe(402)
  })

  it('402 free sin credito', async () => {
    const { env } = mockEnv()
    const req = new Request('http://localhost/api/ai/infer', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'hola', tierId: 'free', appId: 'my-app' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await worker.fetch(req, env)
    expect(res.status).toBe(402)
  })

  it('self-managed requiere header si no hay env', async () => {
    const { env } = mockEnv()
    const req = new Request('http://localhost/api/ai/infer', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'hola',
        tierId: 'socio',
        mode: 'self-managed',
        appId: 'my-app',
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await worker.fetch(req, env)
    expect(res.status).toBe(400)
  })
})
