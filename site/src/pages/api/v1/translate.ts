import { getCollection } from 'astro:content'
import type { APIRoute } from 'astro'
import { buildCatalog, translateEntity } from '../../../lib/translateService'

export const GET: APIRoute = async ({ url }) => {
  const entity =
    url.searchParams.get('entity') || url.searchParams.get('q') || undefined
  const locale =
    url.searchParams.get('locale') || url.searchParams.get('lang') || undefined
  const type = url.searchParams.get('type') || undefined

  const [dishes, ingredients, substances] = await Promise.all([
    getCollection('dishes'),
    getCollection('ingredients'),
    getCollection('substances'),
  ])
  const catalog = buildCatalog({
    dishes: dishes.map((d) => ({
      id: d.id,
      data: d.data as Record<string, unknown>,
    })),
    ingredients: ingredients.map((i) => ({
      id: i.id,
      data: i.data as Record<string, unknown>,
    })),
    substances: substances.map((s) => ({
      id: s.id,
      data: s.data as Record<string, unknown>,
    })),
  })
  const result = translateEntity({ entity, locale, type }, catalog)

  const status = 'error' in result ? 400 : 200

  return new Response(JSON.stringify(result, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
