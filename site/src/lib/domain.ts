// domain.ts — helpers CRUD genericos para entities de domain.config.ts
// instance_id isolation GOAL #4/5: toda fila lleva instance_id, todo query filtra por el.
// Storage adapters: Memory (tests) -> IndexedDB (PWA offline) -> SurrealDB via edge-hive (prod).
// El modelo de negocio no habla a Surreal directo — pasa por estos helpers.

import { domainConfig } from './domain.config';

// Tipado generico por entity name
export type EntityName = (typeof domainConfig.entities)[number]['name'];
export type EntityDef = (typeof domainConfig.entities)[number];

// Record base que siempre lleva SurrealDB id + instance isolation
export type DomainRecord<T = Record<string, unknown>> = T & {
  id: string;
  instance_id: string;
  created_at: string;
  updated_at: string;
};

// --- Adapter interface ---

export interface StorageAdapter {
  create(entity: string, record: DomainRecord): Promise<DomainRecord>;
  list(entity: string, instanceId: string): Promise<DomainRecord[]>;
  get(entity: string, id: string, instanceId: string): Promise<DomainRecord | null>;
  update(entity: string, id: string, patch: Record<string, unknown>, instanceId: string): Promise<DomainRecord | null>;
  del(entity: string, id: string, instanceId: string): Promise<boolean>;
}

// Memory adapter — usado en tests y como fallback si no hay edge-hive ni IndexedDB
class MemoryAdapter implements StorageAdapter {
  private store = new Map<string, Map<string, DomainRecord>>(); // entity -> id -> record

  private key(entity: string): Map<string, DomainRecord> {
    if (!this.store.has(entity)) this.store.set(entity, new Map());
    return this.store.get(entity)!;
  }

  async create(entity: string, record: DomainRecord): Promise<DomainRecord> {
    this.key(entity).set(record.id, record);
    return record;
  }
  async list(entity: string, instanceId: string): Promise<DomainRecord[]> {
    return [...this.key(entity).values()].filter((r) => r.instance_id === instanceId);
  }
  async get(entity: string, id: string, instanceId: string): Promise<DomainRecord | null> {
    const r = this.key(entity).get(id) ?? null;
    if (r && r.instance_id !== instanceId) return null;
    return r;
  }
  async update(entity: string, id: string, patch: Record<string, unknown>, instanceId: string): Promise<DomainRecord | null> {
    const cur = await this.get(entity, id, instanceId);
    if (!cur) return null;
    const next = { ...cur, ...patch, updated_at: new Date().toISOString() } as DomainRecord;
    this.key(entity).set(id, next);
    return next;
  }
  async del(entity: string, id: string, instanceId: string): Promise<boolean> {
    const cur = await this.get(entity, id, instanceId);
    if (!cur) return false;
    this.key(entity).delete(id);
    return true;
  }
  // para tests: clear
  clear() {
    this.store.clear();
  }
}

// Singleton memory — cada instancia de app tiene su propio adapter en memoria (aislado por instance_id de todos modos)
const memory = new MemoryAdapter();

// Selector: en prod PWA intentara IndexedDB, si hay env EDGE_HIVE_URL usara Surreal (ver surreal.ts)
// Por ahora template usa memory para build verde; en browser se puede swap a indexedDB adapter sin cambiar API.
let adapter: StorageAdapter = memory;

export function setStorageAdapter(a: StorageAdapter) {
  adapter = a;
}
export function getStorageAdapter(): StorageAdapter {
  return adapter;
}
export function getMemoryAdapter(): MemoryAdapter {
  return memory;
}

// --- Helpers genericos ---

function resolveInstanceId(instanceId?: string): string {
  return (instanceId ?? (domainConfig.instanceId as string)) as string;
}

function assertEntity(entity: string) {
  const ok = domainConfig.entities.some((e) => e.name === entity);
  if (!ok) throw new Error(`Entity no whitelisteada en domain.config: ${entity}. Define entities[] primero.`);
}

function genId(): string {
  // nanoid-like simple (no dep extra) — en prod usar nanoid de edge-hive
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Genera DEFINE TABLE SurrealDB para docs/migraciones (no ejecuta, solo string)
export function surrealDefineTable(entity: string): string {
  assertEntity(entity);
  const def = domainConfig.entities.find((e) => e.name === entity)!;
  const fields = def.fields.map((f) => `DEFINE FIELD ${f} ON ${entity} TYPE string;`).join('\n');
  return [
    `DEFINE TABLE ${entity} SCHEMAFULL;`,
    `DEFINE FIELD instance_id ON ${entity} TYPE string;`,
    `DEFINE FIELD created_at ON ${entity} TYPE datetime;`,
    `DEFINE FIELD updated_at ON ${entity} TYPE datetime;`,
    `DEFINE INDEX ${entity}_instance_idx ON ${entity} FIELDS instance_id;`,
    fields,
  ].join('\n');
}

export async function createEntity<T extends Record<string, unknown>>(
  entity: EntityName,
  data: T,
  instanceId?: string,
): Promise<DomainRecord<T>> {
  assertEntity(entity as string);
  const iid = resolveInstanceId(instanceId);
  const now = new Date().toISOString();
  const record = { ...data, id: genId(), instance_id: iid, created_at: now, updated_at: now } as DomainRecord<T>;
  return (await adapter.create(entity as string, record as unknown as DomainRecord)) as DomainRecord<T>;
}

export async function listEntities<T = Record<string, unknown>>(
  entity: EntityName,
  instanceId?: string,
): Promise<DomainRecord<T>[]> {
  assertEntity(entity as string);
  const iid = resolveInstanceId(instanceId);
  return (await adapter.list(entity as string, iid)) as DomainRecord<T>[];
}

export async function getEntity<T = Record<string, unknown>>(
  entity: EntityName,
  id: string,
  instanceId?: string,
): Promise<DomainRecord<T> | null> {
  assertEntity(entity as string);
  const iid = resolveInstanceId(instanceId);
  return (await adapter.get(entity as string, id, iid)) as DomainRecord<T> | null;
}

export async function updateEntity<T = Record<string, unknown>>(
  entity: EntityName,
  id: string,
  patch: Partial<T>,
  instanceId?: string,
): Promise<DomainRecord<T> | null> {
  assertEntity(entity as string);
  const iid = resolveInstanceId(instanceId);
  return (await adapter.update(entity as string, id, patch as Record<string, unknown>, iid)) as DomainRecord<T> | null;
}

export async function deleteEntity(entity: EntityName, id: string, instanceId?: string): Promise<boolean> {
  assertEntity(entity as string);
  const iid = resolveInstanceId(instanceId);
  return adapter.del(entity as string, id, iid);
}
