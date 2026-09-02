// fleetStore.ts — Svelte store reactivo sobre Yjs fleet (03.02)
// Patron: cores/swal-agent-runner/src/services/mesh/crdt-sync.ts
// Uso: const fleet = createFleetStore('vehicle'); $fleet en Svelte, fleet.subscribe() en JS.

import { domainConfig } from './domain.config';
import { writable } from 'svelte/store';

export function createFleetStore<T extends Record<string, unknown>>(entity: string, instanceId = domainConfig.instanceId as string) {
  const store = writable<Array<T & { id: string; instance_id: string }>>([]);

  let doc: any = null;
  let ymap: any = null;
  let webrtc: any = null;
  let indexeddb: any = null;

  async function init() {
    if (typeof window === 'undefined') return;
    const { createFleetDoc, fleetEntityMap } = await import('./yjsFleet');
    const room = `swal/${domainConfig.appId}/${instanceId}` as any;
    const res = await createFleetDoc(room);
    doc = res.doc; webrtc = res.webrtc; indexeddb = res.indexeddb;
    ymap = await fleetEntityMap(doc, entity);

    const refresh = () => {
      const vals = [...ymap.values()].filter((r: any) => r.instance_id === instanceId) as any;
      store.set(vals);
    };
    ymap.observe(refresh);
    refresh();
  }

  init();

  return {
    subscribe: store.subscribe,
    async add(data: T) {
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const rec: any = { ...data, id, instance_id: instanceId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      ymap?.set(id, rec);
      const { createEntity } = await import('./domain');
      await createEntity(entity as any, data as any, instanceId);
      return rec as T & { id: string };
    },
    destroy() {
      try { webrtc?.destroy(); } catch {}
      try { indexeddb?.destroy(); } catch {}
    },
  };
}
