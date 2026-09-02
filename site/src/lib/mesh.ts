// mesh.ts — data plane P2P CRDT SWAL (GOAL #4) — Yjs Y.Array bus (04.03)
// Room: swal/{appId}/{instanceId} via y-webrtc + Yjs (04.01 bridge TS)
// Patron: cores/swal-agent-runner/src/services/mesh/crdt-event-bus.ts + edge-mesh

import { domainConfig } from './domain.config';

export function meshRoom(instanceId?: string) {
  const id = instanceId ?? (domainConfig.instanceId as string);
  return `swal/${domainConfig.appId}/${id}`;
}

// Lazy Yjs bus — singleton por room
let doc: any = null;
let bus: any = null; // Y.Array
let webrtc: any = null;
let indexeddb: any = null;
let listeners = new Set<(data: any) => void>();

async function ensureBus(room = meshRoom()) {
  if (bus) return bus;
  const [{ Doc }, { WebrtcProvider }, { IndexeddbPersistence }] = await Promise.all([
    import('yjs'),
    import('y-webrtc'),
    import('y-indexeddb'),
  ]);
  doc = new Doc();
  webrtc = new WebrtcProvider(room, doc, { maxConns: 20 });
  try {
    if (typeof indexedDB !== 'undefined') {
      indexeddb = new IndexeddbPersistence(`swal-mesh-${room}`, doc);
      await new Promise<void>((resolve) => {
        indexeddb.on('synced', () => resolve());
        setTimeout(() => resolve(), 1000);
      });
    }
  } catch (e) {
    console.warn('[mesh] indexedDB fallback', e);
  }
  // marca como usados para astro check (evita hint 6133)
  void webrtc; void indexeddb; void doc;
  bus = doc.getArray('bus:events');
  bus.observe((e: any) => {
    for (const delta of e.changes.delta) {
      if (delta.insert) {
        for (const item of delta.insert as any[]) {
          for (const cb of listeners) { try { cb(item); } catch {} }
        }
      }
    }
  });
  return bus;
}

export async function meshPublish(topic: string, payload: unknown, instanceId?: string) {
  if (typeof window === 'undefined') {
    console.log(`[mesh stub SSR] ${meshRoom(instanceId)}/${topic}`, payload);
    return;
  }
  const room = meshRoom(instanceId);
  try {
    const b = await ensureBus(room);
    b.push([{ topic, payload, ts: Date.now(), appId: domainConfig.appId }]);
  } catch (e) {
    console.warn('[mesh] publish fallback', e);
    console.log(`[mesh fallback] ${room}/${topic}`, payload);
  }
}

export async function meshSubscribe(topic: string, handler: (data: unknown) => void, instanceId?: string) {
  const room = meshRoom(instanceId);
  try {
    await ensureBus(room);
  } catch (e) {
    console.warn('[mesh] subscribe fallback', e);
    return () => {};
  }
  const wrapped = (ev: any) => { if (ev.topic === topic) handler(ev.payload); };
  listeners.add(wrapped);
  return () => { listeners.delete(wrapped); };
}

// Compat: mantiene API previa (publish sin Yjs) si Yjs no esta disponible
export async function meshPublishFallback(topic: string, payload: unknown, instanceId?: string) {
  const room = meshRoom(instanceId);
  console.log(`[mesh] publish ${room}/${topic}`, payload);
}
