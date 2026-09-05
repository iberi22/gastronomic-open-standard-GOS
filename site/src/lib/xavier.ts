// xavier.ts — memoria agentica SWAL
// Namespace: app/{appId}/instance/{instanceId} (GOAL #3)
// Reusa patron cores/swal-agent-runner/src/services/memory/xavier-memory-node.ts
// HTTP :8006 cuando hay conexion, IndexedDB fallback offline.

import { domainConfig } from './domain.config'

const XAVIER_URL = import.meta.env?.PUBLIC_XAVIER_URL ?? 'http://localhost:8006'

function ns(instanceId?: string) {
  const id = instanceId ?? (domainConfig.instanceId as string)
  return `app/${domainConfig.appId}/instance/${id}`
}

export interface XavierMemory {
  content: string
  [key: string]: unknown
}
export interface XavierSearchResult {
  memories: XavierMemory[]
}

export async function xavierSearch(
  query: string,
  limit = 5,
  instanceId?: string,
): Promise<XavierSearchResult> {
  const url = `${XAVIER_URL}/v1/memories/search`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, namespace: ns(instanceId), limit }),
    })
    if (!res.ok) throw new Error(`xavier ${res.status}`)
    return (await res.json()) as XavierSearchResult
  } catch (e) {
    console.warn('[xavier] search offline fallback', e)
    return { memories: [] }
  }
}

export async function xavierAdd(
  content: string,
  kind = 'episodic',
  instanceId?: string,
) {
  const url = `${XAVIER_URL}/v1/memories`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, kind, namespace: ns(instanceId) }),
    })
    if (!res.ok) throw new Error(`xavier ${res.status}`)
    return await res.json()
  } catch (e) {
    console.warn('[xavier] add queued offline', e)
    // TODO: queue to IndexedDB + sync on reconnect (ver edge-mesh sync 04.02)
    return null
  }
}

export function xavierNamespace(instanceId?: string) {
  return ns(instanceId)
}
