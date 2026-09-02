// surreal.ts — edge-hive SurrealDB adapter stub
// Prod: connect a edge-hive (Rust VPS, SurrealDB embebida, WASM edge functions, MCP)
// Ver docs/SWAL/EDGE_HIVE_INTEGRATION.md — edge-hive hosts PWAs y expone SurrealDB WS.
//
// Este stub deja build verde sin Rust. En runtime PWA:
// 1) si hay env PUBLIC_EDGE_HIVE_URL (ej https://edge.swal.dev) -> usa fetch WS via surrealdb.js
// 2) sino fallback a MemoryAdapter (tests) o IndexedDB (offline).
// Para Fase 2 no se despliega edge-hive local — solo documenta patron y deja switch listo.

import type { StorageAdapter, DomainRecord } from './domain';
import { domainConfig } from './domain.config';

const EDGE_HIVE_URL = (import.meta as any).env?.PUBLIC_EDGE_HIVE_URL as string | undefined;

// Esqueleto Surreal adapter — no importa surrealdb.js para no romper build si no esta instalado.
// Cuando se quiera prod, `pnpm add surrealdb` y descomentar el import.
export class SurrealAdapter implements StorageAdapter {
  private url: string;
  constructor(url = EDGE_HIVE_URL) {
    if (!url) throw new Error('EDGE_HIVE_URL no configurado — usa MemoryAdapter o define PUBLIC_EDGE_HIVE_URL');
    this.url = url;
  }

  // Nota: estas implementaciones son fetch HTTP placeholder. En produccion usarias:
  // import { Surreal } from 'surrealdb'; await db.connect(this.url); await db.use({ns: 'swal', db: domainConfig.appId});
  // y luego `DEFINE TABLE` via surrealDefineTable() y queries `SELECT * FROM ${entity} WHERE instance_id = $iid`.

  async create(entity: string, record: DomainRecord): Promise<DomainRecord> {
    // ejemplo HTTP a edge-hive WASM handler (a implementar en edge-hive/src/api/domain.rs)
    const res = await fetch(`${this.url}/api/${domainConfig.appId}/${entity}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    if (!res.ok) throw new Error(`surreal create ${res.status}`);
    return (await res.json()) as DomainRecord;
  }

  async list(entity: string, instanceId: string): Promise<DomainRecord[]> {
    const res = await fetch(`${this.url}/api/${domainConfig.appId}/${entity}?instance_id=${encodeURIComponent(instanceId)}`);
    if (!res.ok) throw new Error(`surreal list ${res.status}`);
    return (await res.json()) as DomainRecord[];
  }

  async get(entity: string, id: string, instanceId: string): Promise<DomainRecord | null> {
    const res = await fetch(`${this.url}/api/${domainConfig.appId}/${entity}/${encodeURIComponent(id)}?instance_id=${encodeURIComponent(instanceId)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`surreal get ${res.status}`);
    return (await res.json()) as DomainRecord;
  }

  async update(entity: string, id: string, patch: Record<string, unknown>, instanceId: string): Promise<DomainRecord | null> {
    const res = await fetch(`${this.url}/api/${domainConfig.appId}/${entity}/${encodeURIComponent(id)}?instance_id=${encodeURIComponent(instanceId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`surreal update ${res.status}`);
    return (await res.json()) as DomainRecord;
  }

  async del(entity: string, id: string, instanceId: string): Promise<boolean> {
    const res = await fetch(`${this.url}/api/${domainConfig.appId}/${entity}/${encodeURIComponent(id)}?instance_id=${encodeURIComponent(instanceId)}`, {
      method: 'DELETE',
    });
    if (res.status === 404) return false;
    if (!res.ok) throw new Error(`surreal del ${res.status}`);
    return true;
  }
}

// Helper para activar Surreal desde la app (ej en +layout.svelte onMount):
// import { setStorageAdapter } from '../lib/domain'; import { SurrealAdapter } from '../lib/surreal';
// if (import.meta.env.PUBLIC_EDGE_HIVE_URL) setStorageAdapter(new SurrealAdapter());

// IndexedDB adapter placeholder (Fase 4 Yjs) — por ahora memory es suficiente para build verde.
// Ver cores/swal-agent-runner/src/services/mesh/crdt-sync.ts para patron IndexedDBStorage.
