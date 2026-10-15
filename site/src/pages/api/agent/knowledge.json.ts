import type { APIRoute } from 'astro'

export const GET: APIRoute = async () => {
  const payload = {
    graph: '/graph-data.json',
    catalog: '/api/by-country/catalog.json',
    ingredients: '/api/ingredients/variants.json',
    substances: '/api/substances.json',
    evidence: '/api/evidence.json',
    seo: {
      jsonld:
        'site/src/lib/seo.ts — recipeJsonLd / ingredientJsonLd / substanceJsonLd',
      sitemap: '/sitemap.xml',
      robots: '/robots.txt',
      llms: '/llms.txt',
    },
  }

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60',
    },
  })
}
