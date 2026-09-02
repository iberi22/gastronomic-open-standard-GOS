// xavierSync.ts — heartbeat 60s + queue offline (04.02)
// Patron: cores/swal-agent-runner/src/services/memory/edge-mesh-sync.ts + xavier-memory-node.ts
// Queue IndexedDB: xavier-queue (idb), sync cuando vuelve online, heartbeat cada 60s.

import { domainConfig } from './domain.config';
import { xavierAdd, xavierSearch } from './xavier';

const HEARTBEAT_MS = 60_000;
const QUEUE_KEY = `xavier-queue:${domainConfig.appId}`;

type Queued = { id: string; content: string; kind: string; instanceId: string; ts: number };

function loadQueue(): Queued[] {
  if (typeof localStorage === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]'); } catch { return []; }
}
function saveQueue(q: Queued[]) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export function queueXavierAdd(content: string, kind = 'episodic', instanceId = domainConfig.instanceId as string) {
  const q = loadQueue();
  q.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2,4)}`, content, kind, instanceId, ts: Date.now() });
  saveQueue(q);
}

export async function flushQueue(): Promise<number> {
  const q = loadQueue();
  if (q.length === 0) return 0;
  let ok = 0;
  const remain: Queued[] = [];
  for (const item of q) {
    try {
      const res = await xavierAdd(item.content, item.kind, item.instanceId);
      if (res) ok++; else remain.push(item);
    } catch { remain.push(item); }
  }
  saveQueue(remain);
  return ok;
}

export async function heartbeat(instanceId = domainConfig.instanceId as string): Promise<boolean> {
  try {
    // Xavier no tiene /health por app, usamos search vacio como ping + flush queue
    await xavierSearch('heartbeat', 1, instanceId);
    await flushQueue();
    return true;
  } catch { return false; }
}

let timer: number | null = null;

export function startXavierSync(instanceId = domainConfig.instanceId as string) {
  if (typeof window === 'undefined') return () => {};
  if (timer !== null) return () => {};
  // flush inmediato + heartbeat cada 60s + on online
  heartbeat(instanceId);
  timer = window.setInterval(() => heartbeat(instanceId), HEARTBEAT_MS) as unknown as number;
  const onOnline = () => heartbeat(instanceId);
  window.addEventListener('online', onOnline);
  return () => {
    if (timer !== null) { clearInterval(timer); timer = null; }
    window.removeEventListener('online', onOnline);
  };
}

// Auto-start en browser si se importa este modulo desde +layout.svelte
if (typeof window !== 'undefined') {
  // no auto-start para no romper SSR — la app debe llamar startXavierSync() en onMount
}
