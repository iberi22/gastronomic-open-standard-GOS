import type { APIRoute } from 'astro'
import { translateEntity } from '../../../lib/translateService'

export const GET: APIRoute = async ({ url }) => {
  const entity =
    url.searchParams.get('entity') || url.searchParams.get('q') || undefined
  const locale =
    url.searchParams.get('locale') || url.searchParams.get('lang') || undefined
  const type = url.searchParams.get('type') || undefined

  const result = await translateEntity({ entity, locale, type })

  const status = 'error' in result ? 400 : 200

  return new Response(JSON.stringify(result, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
