// site/src/pages/api/countries.ts — aggregated country counts for the API.
// Reads the live dishes content collection (repo .md is the DB), groups by
// top-level directory (= country), returns JSON. Prerendered at build into
// dist/api/countries (extensionless, same pattern as health.ts).

import { getCollection } from 'astro:content'
import type { APIRoute } from 'astro'
import { countryCounts } from '../../lib/countries'

export const GET: APIRoute = async () => {
  const dishes = await getCollection('dishes')
  const body = countryCounts(dishes.map((d) => d.id))
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
