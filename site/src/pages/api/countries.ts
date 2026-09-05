// site/src/pages/api/countries.ts — aggregated country counts for the API.
// Reads the live dishes content collection (repo .md is the DB), groups by
// top-level directory (= country), returns JSON. Prerendered at build into
// dist/api/countries (extensionless, same pattern as health.ts).
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const dishes = await getCollection('dishes');
  const counts = new Map<string, number>();
  for (const d of dishes) {
    const country = (d.id.split('/')[0] || 'unknown').toLowerCase();
    counts.set(country, (counts.get(country) || 0) + 1);
  }
  const body = [...counts.entries()]
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count);
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
  });
};
