export function getStaticPaths() {
  return ALLOWED.map((entity) => ({ params: { entity } }))
}

import type { APIRoute } from 'astro'
import { agentCreate, agentDelete, agentUpdate } from '../../../lib/agentDomain'
import type { EntityName } from '../../../lib/domain'
import {
  createEntity,
  deleteEntity,
  getEntity,
  listEntities,
  updateEntity,
} from '../../../lib/domain'

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

export const POST: APIRoute = async ({ params, request }) => {
  const entity = params.entity as string
  if (!ALLOWED.includes(entity)) {
    return json({ error: `Unknown entity '${entity}'` }, 400)
  }
  try {
    const body = await request.json()
    const inst = instanceId()
    const record = await createEntity(entity as EntityName, body, inst)
    // Sync to Xavier memory (best-effort, non-blocking)
    try {
      await agentCreate(entity as EntityName, body, inst)
    } catch (xavierErr) {
      console.warn('[xavier] sync failed (non-fatal):', xavierErr)
    }
    return json(record, 201)
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
}

export const PUT: APIRoute = async ({ params, url, request }) => {
  const entity = params.entity as string
  if (!ALLOWED.includes(entity)) {
    return json({ error: `Unknown entity '${entity}'` }, 400)
  }
  const id = url.searchParams.get('id')
  if (!id) return json({ error: 'Missing id param' }, 400)
  try {
    const patch = await request.json()
    const inst = instanceId()
    const record = await updateEntity(entity as EntityName, id, patch, inst)
    if (!record) return json({ error: 'Not found' }, 404)
    try {
      await agentUpdate(entity as EntityName, id, patch, inst)
    } catch (xavierErr) {
      console.warn('[xavier] sync failed (non-fatal):', xavierErr)
    }
    return json(record)
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
}

export const DELETE: APIRoute = async ({ params, url }) => {
  const entity = params.entity as string
  if (!ALLOWED.includes(entity)) {
    return json({ error: `Unknown entity '${entity}'` }, 400)
  }
  const id = url.searchParams.get('id')
  if (!id) return json({ error: 'Missing id param' }, 400)
  const inst = instanceId()
  const ok = await deleteEntity(entity as EntityName, id, inst)
  if (!ok) return json({ error: 'Not found' }, 404)
  try {
    await agentDelete(entity as EntityName, id, inst)
  } catch (xavierErr) {
    console.warn('[xavier] sync failed (non-fatal):', xavierErr)
  }
  return json({ deleted: true, entity, id })
}
