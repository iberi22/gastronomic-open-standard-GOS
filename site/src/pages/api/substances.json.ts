import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const col = await getCollection('substances');
  const data = col.map(e => {
    const d = e.data as any;
    return {
      slug: e.id,
      name: d.name,
      formula: d.formula,
      discovery_year: d.discovery_year,
      source_ingredient: d.source_ingredient,
      benefit: d.benefit,
      sazon: d.sazon,
      sabor: d.sabor,
      textura: d.textura,
      vitaminas: d.vitaminas,
      compuestos: d.compuestos,
      tags: d.tags,
      image: d.image,
      health_registry: d.health_registry,
      url: `/substances/${e.id}`,
      graph: `/graph?filter=substance:${e.id}`,
    };
  }).sort((a,b) => a.name.localeCompare(b.name));

  return new Response(JSON.stringify({ count: data.length, substances: data }, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
  });
};
