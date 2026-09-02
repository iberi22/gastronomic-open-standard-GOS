import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const payload = {
    graph: "/graph-data.json",
    catalog: "/api/countries/catalog.json",
    ingredients: "/api/ingredients/variants.json",
    substances: "/api/substances.json",
    // paywall metadata via D1/KV billing
    paywall: {
      endpoint: "/api/agent/pay",
      tier: "socio",
      handling: "20% sobre infra 100% + AI*1.1 (Cloudflare Workers AI)",
      billing_lib: "site/src/lib/billing.ts",
    },
    seo: {
      jsonld: "site/src/lib/seo.ts — recipeJsonLd / ingredientJsonLd / substanceJsonLd",
      sitemap: "/sitemap.xml",
      robots: "/robots.txt",
      llms: "/llms.txt",
    },
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "X-GOS-Paywall": "D1/KV - tier socio, 20% handling SWAL, JWT required when scale",
      "Cache-Control": "public, max-age=60",
    },
  });
};
