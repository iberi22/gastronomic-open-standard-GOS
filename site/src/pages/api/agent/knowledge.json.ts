import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const authHeader = request.headers.get('Authorization');

  // Check paywall header / token
  const hasToken = authHeader && authHeader.startsWith('Bearer jwt_gos_socio');

  return new Response(
    JSON.stringify({
      appId: 'gos',
      paywallRequired: !hasToken,
      endpoints: {
        graph: '/graph-data.json',
        catalog: '/api/countries/catalog.json',
        ingredients: '/api/ingredients/variants.json',
        substances: '/api/substances.json'
      },
      billing: {
        tier: 'socio',
        handling: '20% SWAL managed via site/src/lib/billing.ts',
        paywallUrl: '/api/agent/pay'
      }
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-GOS-Paywall': 'D1/KV',
        'Cache-Control': 'public, max-age=3600'
      }
    }
  );
};
