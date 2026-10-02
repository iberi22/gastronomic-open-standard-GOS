// Adaptador D1 minimo para tests, respaldado por SQLite REAL (node:sqlite).
//
// Por que SQLite real y no un mock que devuelve filas fijas: el bug que
// motivó esta suite se Manifiesto en produccion justamente porque la tabla
// `api_keys` NO existia, de modo que la consulta lanzaba y el worker caia en
// su rama de error. Un doble de test que devuelve exito/filas a pedido
// reproducia justo el escenario que NO ocurre en produccion y habria dado
// verde con el bug presente. Aqui la consulta se ejecuta de verdad: si la
// tabla falta, `first()` lanza, que es el comportamiento de D1 real.

import { DatabaseSync } from 'node:sqlite'

export interface D1Result<T = Record<string, unknown>> {
  results?: T[]
  success: boolean
  meta: { changes?: number; rows_read?: number }
}

export interface D1Statement {
  bind(...values: unknown[]): D1Statement
  first<T = Record<string, unknown>>(): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>
  run(): Promise<D1Result>
}

/** Estado de la DB simulada. 'throws' reproduce una D1 caída. */
export type DbMode = 'normal' | 'throws'

export interface FakeD1 {
  db: D1DatabaseLike
  mode: DbMode
  /** Ultimo SQL ejecutado, para aserciones sobre la consulta. */
  lastSql: string | null
  lastBound: unknown[]
  /** Crea el esquema real de schema.sql (tabla api_keys e indices). */
  applySchema(): void
  /** Inserta una fila de api_keys. */
  seed(row: {
    key: string
    tier?: string
    status?: string
    expires_at?: string | null
  }): void
  /** Inserta SQL arbitrario (para simular estado corrupto / ausente). */
  execRaw(sql: string): void
}

interface D1DatabaseLike {
  prepare(sql: string): D1Statement
}

/**
 * Crea una DB en memoria. Por defecto SIN esquema: este es el estado real de
 * la DB de produccion cuando el bug estaba vivo, y obliga a que cada test
 * declare explicitamente que esquema esta aplicado.
 */
export function createFakeD1(
  opts: { mode?: DbMode; applySchema?: boolean } = {},
): FakeD1 {
  const sqlite = new DatabaseSync(':memory:')
  const fake: FakeD1 = {
    mode: opts.mode ?? 'normal',
    lastSql: null,
    lastBound: [],
    applySchema() {
      sqlite.exec(SCHEMA_SQL)
    },
    seed(row) {
      sqlite
        .prepare(
          'INSERT OR REPLACE INTO api_keys (key, tier, status, expires_at) VALUES (?, ?, ?, ?)',
        )
        .run(
          row.key,
          row.tier ?? 'tiersocio',
          row.status ?? 'active',
          row.expires_at ?? null,
        )
    },
    execRaw(sql) {
      sqlite.exec(sql)
    },
    db: null as unknown as D1DatabaseLike,
  }

  fake.db = {
    prepare(sql: string): D1Statement {
      fake.lastSql = sql
      let stmt: ReturnType<DatabaseSync['prepare']>
      try {
        stmt = sqlite.prepare(sql)
      } catch (err) {
        // D1 real lanza al preparear si la tabla no existe. Se propaga igual.
        return makeBrokenStatement(err)
      }
      let bound: unknown[] = []
      const self: D1Statement = {
        bind(...values: unknown[]) {
          bound = values
          fake.lastBound = values
          return self
        },
        async first<T>(): Promise<T | null> {
          if (fake.mode === 'throws') {
            throw new Error('D1_ERROR: injected failure (test)')
          }
          const row = stmt.get(...(bound as never[]))
          return (row as T) ?? null
        },
        async all<T>(): Promise<D1Result<T>> {
          if (fake.mode === 'throws') {
            throw new Error('D1_ERROR: injected failure (test)')
          }
          return {
            results: stmt.all(...(bound as never[])) as T[],
            success: true,
            meta: {},
          }
        },
        async run(): Promise<D1Result> {
          if (fake.mode === 'throws') {
            throw new Error('D1_ERROR: injected failure (test)')
          }
          const info = stmt.run(...(bound as never[]))
          return { success: true, meta: { changes: Number(info.changes) } }
        },
      }
      return self
    },
  }

  if (opts.applySchema) fake.applySchema()
  return fake
}

/** Statement que lanza en cada operacion (prepare fallo / D1 caida). */
function makeBrokenStatement(err: unknown): D1Statement {
  const boom = () => {
    throw err instanceof Error ? err : new Error(String(err))
  }
  const s: D1Statement = {
    bind() {
      return s
    },
    async first() {
      return boom()
    },
    async all() {
      return boom()
    },
    async run() {
      return boom()
    },
  }
  return s
}

// Esquema espejo de worker/schema.sql. Debe mantenerse en sync con ese archivo;
// el test `schema.sql` de este repo verifica que las columnas claves existan.
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS api_keys (
  key        TEXT PRIMARY KEY NOT NULL,
  tier       TEXT NOT NULL DEFAULT 'free',
  status     TEXT NOT NULL DEFAULT 'active',
  owner      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);
CREATE TABLE IF NOT EXISTS credit_ledger (
  key_id TEXT NOT NULL,
  period TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key_id, period)
);
CREATE TABLE IF NOT EXISTS free_quota (
  ip_key TEXT NOT NULL,
  day TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_key, day)
);
`
