import type { APIRoute } from 'astro';
import { TIERS, calculatePrice, creditStatus } from '../../../lib/billing';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const tierId = body.tier || 'socio';
    const token = body.token || body.turnstileToken;

    // Check if token provided or valid request
    if (!token && !body.leaseId && body.tier !== 'socio') {
      return new Response(
        JSON.stringify({
          error: 'Payment Required',
          message: 'Agentes requieren suscripcion tier socio para acceso ilimitado a /graph-data.json',
          paywall: {
            tier: 'socio',
            basePriceUSD: TIERS.socio.basePrice,
            pricingBreakdown: calculatePrice(2.0, 1.0)
          }
        }),
        {
          status: 402,
          headers: {
            'Content-Type': 'application/json',
            'X-GOS-Paywall': 'D1/KV-Required'
          }
        }
      );
    }

    // Return active JWT lease for tier socio
    const now = Date.now();
    const expiresAt = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
    const ledger = creditStatus(1500, 'socio');

    return new Response(
      JSON.stringify({
        status: 'active',
        tier: tierId,
        token: `jwt_gos_socio_active_${now}`,
        expiresAt,
        credits: ledger,
        pricing: calculatePrice(2.0, 1.0)
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-GOS-Paywall': 'Active'
        }
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', message: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
