import type { APIRoute } from 'astro';
import worker from '../../../../workers/ai';

export const POST: APIRoute = async ({ request }) => {
  // Reusa el Worker real (env bindings vienen de Cloudflare runtime, no de Astro)
  // En dev, env puede no tener bindings — el Worker hace fallback a 402/200 con mocks
  const env: any = (globalThis as any).__env ?? (request as any).cf ?? {};
  // Intenta obtener env de Cloudflare via `locals` (Astro 7) — fallback a mock
  const mockEnv = {
    AI: { run: async () => ({ response: 'mock' }) },
    SWAL_D1: { prepare: () => ({ bind: () => ({ first: async () => null, run: async () => ({}), all: async () => ({ results: [] }) }) }) },
    SWAL_KV: { get: async () => null, put: async () => {} },
    SWAL_R2: {},
  };
  const effectiveEnv = (env && env.AI) ? env : mockEnv;
  // delega al Worker fetch
  const res = await (worker as any).fetch(request, effectiveEnv);
  return res;
};

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ error: 'use POST' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
};
