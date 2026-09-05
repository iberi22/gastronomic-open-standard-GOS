// site/src/lib/storage-d1.ts — D1 Cloudflare storage adapter for domain.ts
// Implements the same StorageAdapter interface as MemoryAdapter
// Graceful fallback: if DB is unavailable (SSR/local), throws so caller can swap.

import type { DomainRecord, StorageAdapter } from './domain'

interface D1DatabaseLike {
  prepare(query: string): {
    bind(...params: unknown[]): {
      all<T = unknown>(): Promise<{ results: T[] }>
      first<T = unknown>(): Promise<T | null>
      run(): Promise<{ success: boolean }>
    }
  }
}

export class D1StorageAdapter implements StorageAdapter {
  constructor(private db: D1DatabaseLike) {}

  async create(entity: string, record: DomainRecord): Promise<DomainRecord> {
    const cols = Object.keys(record)
    const placeholders = cols.map(() => '?').join(', ')
    const values = cols.map((k) =>
      serializeForD1(record[k as keyof DomainRecord]),
    )
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO ${entity} (${cols.join(', ')}) VALUES (${placeholders})`,
      )
      .bind(...values)
      .run()
    return record
  }

  async list(entity: string, instanceId: string): Promise<DomainRecord[]> {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM ${entity} WHERE instance_id = ? ORDER BY updated_at DESC`,
      )
      .bind(instanceId)
      .all<DomainRecord>()
    return results || []
  }

  async get(
    entity: string,
    id: string,
    instanceId: string,
  ): Promise<DomainRecord | null> {
    const result = await this.db
      .prepare(`SELECT * FROM ${entity} WHERE id = ? AND instance_id = ?`)
      .bind(id, instanceId)
      .first<DomainRecord>()
    return result || null
  }

  async update(
    entity: string,
    id: string,
    patch: Record<string, unknown>,
    instanceId: string,
  ): Promise<DomainRecord | null> {
    const cur = await this.get(entity, id, instanceId)
    if (!cur) return null
    const next = { ...cur, ...patch, updated_at: new Date().toISOString() }
    const cols = Object.keys(next)
    const setClause = cols.map((c) => `${c} = ?`).join(', ')
    const values = cols.map((k) =>
      serializeForD1((next as Record<string, unknown>)[k]),
    )
    await this.db
      .prepare(
        `UPDATE ${entity} SET ${setClause} WHERE id = ? AND instance_id = ?`,
      )
      .bind(...values, id, instanceId)
      .run()
    return next
  }

  async del(entity: string, id: string, instanceId: string): Promise<boolean> {
    const cur = await this.get(entity, id, instanceId)
    if (!cur) return false
    await this.db
      .prepare(`DELETE FROM ${entity} WHERE id = ? AND instance_id = ?`)
      .bind(id, instanceId)
      .run()
    return true
  }
}

function serializeForD1(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}
