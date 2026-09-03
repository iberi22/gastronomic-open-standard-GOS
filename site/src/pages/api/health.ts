// site/src/pages/api/health.ts — health check for the API + DB connection
import type { APIRoute } from 'astro';
import { listEntities } from '../../lib/domain';

export const GET: APIRoute = async ({ locals }) => {
  const startedAt = Date.now();
  const env = (locals as any).env;
  const db = env?.DB;

  const checks: Record<string, { status: string; latency_ms?: number; error?: string }> = {};

  // Check D1 binding (production Cloudflare Pages)
  if (db) {
    try {
      const start = Date.now();
      const { results } = await db.prepare('SELECT 1 as ok').all();
      checks.d1 = {
        status: results?.[0]?.ok === 1 ? 'connected' : 'error',
        latency_ms: Date.now() - start,
      };
    } catch (err) {
      checks.d1 = { status: 'error', error: String(err) };
    }
  } else {
    checks.d1 = { status: 'not bound (using memory adapter)' };
  }

  // Check domain API (read entity list)
  try {
    const start = Date.now();
    await listEntities('recipe', 'health-check-instance');
    checks.domain = { status: 'ok', latency_ms: Date.now() - start };
  } catch (err) {
    checks.domain = { status: 'error', error: String(err) };
  }

  const allOk = Object.values(checks).every((c) => c.status === 'connected' || c.status === 'ok' || c.status.startsWith('not bound'));
  return new Response(
    JSON.stringify({
      status: allOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime_ms: Date.now() - startedAt,
      checks,
    }),
    {
      status: allOk ? 200 : 503,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    },
  );
};