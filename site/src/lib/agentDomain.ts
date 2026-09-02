// agentDomain.ts — capa 100% agentica: tabla <-> agente <-> memoria
// Cada CRUD de dominio genera: 1) fila Surreal (domain.ts) 2) memoria Xavier (xavierAdd) 3) evento mesh (meshPublish)
// Asi el agente siempre ve las tablas via Xavier search y via mesh realtime, y la UI AUI puede pedir datos de negocio.
// Uso: import { agentCreate, agentList } from './agentDomain' en vez de domain.ts directo.

import { domainConfig } from './domain.config';
import { createEntity, listEntities, getEntity, updateEntity, deleteEntity, type EntityName, type DomainRecord } from './domain';
import { xavierAdd, xavierSearch } from './xavier';
import { meshPublish } from './mesh';

function xavierKindFor(entity: string): string {
  const def = domainConfig.entities.find((e) => e.name === entity);
  return def?.xavierKind ?? entity;
}

function toMemoryContent(entity: string, record: DomainRecord, action: 'create' | 'update' | 'delete'): string {
  const kind = xavierKindFor(entity);
  const base = `[${kind}:${action}] ${entity}#${record.id} instance=${record.instance_id}`;
  if (action === 'delete') return `${base} deleted`;
  // resume campos relevantes para RAG (sin instance_id/created_at duplicado)
  const data = { ...record } as any;
  delete data.instance_id; delete data.created_at; delete data.updated_at;
  return `${base} ${JSON.stringify(data)}`;
}

export async function agentCreate<T extends Record<string, unknown>>(entity: EntityName, data: T, instanceId?: string): Promise<DomainRecord<T>> {
  const rec = await createEntity(entity, data, instanceId);
  const iid = (instanceId ?? (domainConfig.instanceId as string)) as string;
  // 100% agentico: memoria + mesh (no bloquea si fallan)
  try { await xavierAdd(toMemoryContent(entity as string, rec as any, 'create'), xavierKindFor(entity as string), iid); } catch {}
  try { await meshPublish(`${entity}:created`, rec, iid); } catch {}
  // tambien AUI update via mesh
  try { await meshPublish('aui:update', { entity, id: rec.id, action: 'create' }, iid); } catch {}
  return rec;
}

export async function agentList<T = Record<string, unknown>>(entity: EntityName, instanceId?: string): Promise<DomainRecord<T>[]> {
  // Intenta memoria primero para RAG, pero fuente verdad es domain
  // Si hay Xavier con datos mas ricos, el agente puede usar xavierSearch directamente
  return listEntities(entity, instanceId);
}

export async function agentGet<T = Record<string, unknown>>(entity: EntityName, id: string, instanceId?: string): Promise<DomainRecord<T> | null> {
  return getEntity(entity, id, instanceId);
}

export async function agentUpdate<T extends Record<string, unknown>>(entity: EntityName, id: string, patch: Partial<T>, instanceId?: string): Promise<DomainRecord<T> | null> {
  const rec = await updateEntity<T>(entity, id, patch, instanceId);
  if (!rec) return null;
  const iid = (instanceId ?? (domainConfig.instanceId as string)) as string;
  try { await xavierAdd(toMemoryContent(entity as string, rec as any, 'update'), xavierKindFor(entity as string), iid); } catch {}
  try { await meshPublish(`${entity}:updated`, rec, iid); } catch {}
  return rec;
}

export async function agentDelete(entity: EntityName, id: string, instanceId?: string): Promise<boolean> {
  const iid = (instanceId ?? (domainConfig.instanceId as string)) as string;
  // obtenemos antes de borrar para memoria
  const cur = await getEntity(entity, id, iid);
  const ok = await deleteEntity(entity, id, iid);
  if (ok && cur) {
    try { await xavierAdd(toMemoryContent(entity as string, cur as any, 'delete'), xavierKindFor(entity as string), iid); } catch {}
    try { await meshPublish(`${entity}:deleted`, { id, instance_id: iid }, iid); } catch {}
  }
  return ok;
}

// Busqueda agentica: combina Xavier RAG + filtro dominio
export async function agentSearch<T = Record<string, unknown>>(entity: EntityName, query: string, instanceId?: string, limit = 5): Promise<{ memories: any[]; records: DomainRecord<T>[] }> {
  const iid = (instanceId ?? (domainConfig.instanceId as string)) as string;
  const kind = xavierKindFor(entity as string);
  // Xavier search con kind como prefijo para filtrar
  const mem = await xavierSearch(`${kind} ${query}`, limit, iid);
  // Tambien lista dominio y filtra localmente (para offline)
  const all = await listEntities<T>(entity, iid);
  const q = query.toLowerCase();
  const records = all.filter((r) => JSON.stringify(r).toLowerCase().includes(q)).slice(0, limit);
  return { memories: mem.memories ?? [], records };
}
