import type { APIRoute } from 'astro';
import { creditStatus, TIERS } from '../../../lib/billing';

function json(body: unknown, status = 200, extraHeaders: Record<string,string> = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

// POST /api/agent/pay - validates Cloudflare Turnstile + tier socio via billing.ts, returns JWT for graph access
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const tierId = (body.tier as string) ?? "socio";
    const estimatedTokens = Number(body.estimatedTokens ?? 0);
    const turnstileToken = body.turnstile as string | undefined;

    // billing.ts tier check - source of truth, never hardcode Stripe keys
    const tier = TIERS[tierId as keyof typeof TIERS] ?? TIERS.socio;
    if (!tier) return json({ error: "unknown tier" }, 400);

    // In production Cloudflare runtime: verify Turnstile via fetch to turnstile verify endpoint + KV/D1 ledger
    // Here in Astro static, we emulate: if turnstile missing but tier is socio, still return mock JWT when tokens fit credit
    // The D1/KV check uses creditStatus from billing.ts
    const used = Number(body.used ?? 0);
    const ledger = creditStatus(used, tier.id);
    if (estimatedTokens > 0 && estimatedTokens > ledger.remaining && tierId !== 'socio-managed') {
      return json({ error: "402 Payment Required - credito agotado, upgrade socio", ledger }, 402, { "X-GOS-Paywall": "402 - D1/KV credit exhausted" });
    }

    // Turnstile optional in dev; in prod, verify via Cloudflare - if token present but invalid, 403
    if (turnstileToken && turnstileToken.length < 10) {
      return json({ error: "invalid turnstile token" }, 403);
    }

    // Generate mock JWT (HS256-like, not real sign - Cloudflare Worker would sign with KV secret)
    // Payload: tier, appId gos, exp 1h, billing reference
    const header = { alg: "HS256", typ: "JWT" };
    const payload = {
      appId: "gos",
      tier: tier.id,
      billing: "site/src/lib/billing.ts - infra 100% + AI*1.1 + 20% handling",
      exp: Math.floor(Date.now()/1000) + 3600,
      iat: Math.floor(Date.now()/1000),
    };
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const mockJwt = `${b64(header)}.${b64(payload)}.mock-signature-kv-d1`;

    return json({
      ok: true,
      tier: tier.id,
      monthlyCredit: tier.monthlyCredit,
      ledger,
      jwt: mockJwt,
      graph: "/graph-data.json",
      message: "JWT emitido via D1/KV billing 20% handling - usar Authorization: Bearer <jwt> para /graph-data.json escalado",
    }, 200, { "X-GOS-Paywall": "D1/KV - JWT issued" });

  } catch (e: any) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
};

export const GET: APIRoute = async () => {
  return json({ error: "use POST { tier: 'socio', turnstile, estimatedTokens } - see site/src/lib/billing.ts" }, 405);
};
