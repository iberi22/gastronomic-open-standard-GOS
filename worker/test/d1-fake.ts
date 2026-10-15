// Adaptador D1 minimo para tests, respaldado por SQLite REAL (node:sqlite).
//
// Por que SQLite real y no un mock que devuelve filas fijas: el gateway delega
// en D1 el contador de cuota anonima (free_quota), y un doble que simulara la
// fila en vez de ejecutar el UPSERT escondería un ON CONFLICT mal escrito o una
// columna que no existe. Aqui la consulta se ejecuta de verdad: si el esquema no
// esta aplicado, `first()`/`run()` lanzan, que es el comportamiento de D1 real.

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
  /** Crea el esquema real de schema.sql (free_quota + tablas heredadas). */
  applySchema(): void
  /** Inserta SQL arbitrario (para simular estado corrupto / ausente). */
  execRaw(sql: string): void
}

interface D1DatabaseLike {
  prepare(sql: string): D1Statement
}

/**
 * Crea una DB en memoria. Por defecto SIN esquema: obliga a que cada test
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
// test/schema.test.ts verifica que las tablas y columnas existan.
//
// api_keys y credit_ledger se conservan SOLO por historia de migraciones (no se
// borran tablas que pudieron tener datos). El gateway ya no las usa.
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
