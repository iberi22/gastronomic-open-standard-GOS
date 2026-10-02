export function getStaticPaths() {
  return ALLOWED.map((entity) => ({ params: { entity } }))
}

import type { APIRoute } from 'astro'
import type { EntityName } from '../../../lib/domain'
import { getEntity, listEntities } from '../../../lib/domain'

const ALLOWED = [
  'recipe',
  'ingredient',
  'vitamin',
  'condition',
  'diet',
  'substance',

  'technique',
]

function instanceId(): string {
  // In real prod: derive from session/JWT. For PWA local: use a stable per-instance UUID.
  if (
    typeof globalThis !== 'undefined' &&
    (globalThis as unknown as { __GOS_INSTANCE_ID__?: string })
      .__GOS_INSTANCE_ID__
  ) {
    return (globalThis as unknown as { __GOS_INSTANCE_ID__?: string })
      .__GOS_INSTANCE_ID__
  }
  return 'default-instance'
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const GET: APIRoute = async ({ params, url }) => {
  const entity = params.entity as string
  if (!ALLOWED.includes(entity)) {
    return json(
      { error: `Unknown entity '${entity}'. Allowed: ${ALLOWED.join(', ')}` },
      400,
    )
  }
  const id = url.searchParams.get('id')
  const inst = instanceId()
  if (id) {
    const record = await getEntity(entity as EntityName, id, inst)
    if (!record) return json({ error: 'Not found' }, 404)
    return json(record)
  }
  const records = await listEntities(entity as EntityName, inst)
  return json({ entity, count: records.length, records })
}

// POST/PUT/DELETE retirados (2026-10-02): sin autenticacion, sin callers en el
// sitio, y GOS despliega estatico. Las mutaciones solo existen, si hacen falta,
// detras del gateway y con key de pago (worker/src/index.ts, seccion 2c).
