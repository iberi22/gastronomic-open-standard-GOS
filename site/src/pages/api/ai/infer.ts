import type { APIRoute } from 'astro'
import worker, { type Env } from '../../../../workers/ai'

interface GlobalWithEnv {
  __env?: Partial<Env>
}

export const POST: APIRoute = async ({ request }) => {
  // Reusa el Worker real (env bindings vienen de Cloudflare runtime, no de Astro)
  // En dev, env puede no tener bindings — el Worker hace fallback a 402/200 con mocks
  const runtimeEnv = (globalThis as unknown as GlobalWithEnv).__env ?? {}
  const env: Partial<Env> =
    (request as unknown as { cf?: Partial<Env> }).cf ?? runtimeEnv
  // Intenta obtener env de Cloudflare via `locals` (Astro 7) — fallback a mock
  const mockEnv: Env = {
    AI: { run: async () => ({ response: 'mock' }) },
    SWAL_D1: {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
          run: async () => ({}),
          all: async () => ({ results: [] }),
        }),
      }),
    },
    SWAL_KV: { get: async () => null, put: async () => {} },
    SWAL_R2: {},
  }
  const effectiveEnv: Env = env?.AI ? (env as Env) : mockEnv
  // delega al Worker fetch
  const res = await worker.fetch(request, effectiveEnv)
  return res
}

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ error: 'use POST' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  })
}
