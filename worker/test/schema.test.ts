// schema.sql ya no participa en la autenticacion: el gateway es abierto y no lee
// keys (decision del owner, 2026-10-15). Estas pruebas blindan tres cosas:
//   1. Las tablas heredadas (api_keys, credit_ledger) NO se borran: pudieron
//      tener datos aplicados en produccion y borrarlas no es una migracion.
//   2. free_quota, la unica tabla que el gateway sigue usando, existe con las
//      columnas que el UPSERT necesita.
//   3. Ningun camino del gateway vuelve a consultar api_keys / credit_ledger ni
//      reintroduce /api/ai/infer.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const HERE = dirname(fileURLToPath(import.meta.url))
const SCHEMA_PATH = resolve(HERE, '../schema.sql')
const INDEX_PATH = resolve(HERE, '../src/index.ts')
const D1_FAKE_PATH = resolve(HERE, './d1-fake.ts')

const schemaSql = readFileSync(SCHEMA_PATH, 'utf8')
const indexSrc = readFileSync(INDEX_PATH, 'utf8')

describe('worker/schema.sql', () => {
  it('es idempotente (se puede aplicar dos veces sin error)', () => {
    const db = new DatabaseSync(':memory:')
    db.exec(schemaSql)
    expect(() => db.exec(schemaSql)).not.toThrow()
    db.close()
  })

  it('crea free_quota con las columnas que usa el UPSERT del gateway', () => {
    const db = new DatabaseSync(':memory:')
    db.exec(schemaSql)
    const cols = db.prepare('PRAGMA table_info(free_quota)').all() as Array<{
      name: string
    }>
    const names = cols.map((c) => c.name)
    for (const required of ['ip_key', 'day', 'n']) {
      expect(names, `falta la columna ${required}`).toContain(required)
    }
    db.close()
  })

  it('conserva las tablas heredadas api_keys y credit_ledger (migracion, no DROP)', () => {
    const db = new DatabaseSync(':memory:')
    db.exec(schemaSql)
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as Array<{ name: string }>
    const names = tables.map((t) => t.name)
    // No se borran: si tienen datos, un DROP perderia historial facturado.
    expect(names).toContain('api_keys')
    expect(names).toContain('credit_ledger')
    db.close()
  })

  it('documenta en el propio SQL que api_keys y credit_ledger ya no se usan', () => {
    expect(schemaSql).toMatch(/2026-10-15/)
    expect(schemaSql).toMatch(/unused|sin uso|NO se usan|ya no se usan/i)
  })

  it('NO contiene ninguna credencial sembrada ni seed con valor real', () => {
    const inserts = schemaSql.split('\n').filter((l) => /^\s*INSERT/i.test(l))
    for (const line of inserts) {
      expect(line, `schema.sql tiene un INSERT sembrado: ${line}`).not.toMatch(
        /INSERT\s+(OR\s+\w+\s+)?INTO\s+api_keys/i,
      )
    }
    expect(schemaSql).not.toMatch(/sk_live|pk_live|Bearer\s+[A-Za-z0-9]{16,}/)
  })
})

describe('el gateway no vuelve a leer keys ni a inferir', () => {
  it('ningun camino de src/index.ts consulta las tablas heredadas', () => {
    expect(indexSrc).not.toMatch(/api_keys/)
    expect(indexSrc).not.toMatch(/credit_ledger/)
  })

  it('/api/ai/infer solo existe como 404 explicito', () => {
    // Si alguien reintrodujera inferencia, aparecerian la llamada al binding AI
    // o el precio. El binding ya no esta declarado en wrangler.toml.
    expect(indexSrc).not.toMatch(/env\.AI/)
    expect(indexSrc).not.toMatch(/tokensUsed|monthlyCredit|credit_ledger/)
    expect(indexSrc).toMatch(/\/api\/ai\/infer/)
    expect(indexSrc).toMatch(/404/)
  })

  it('el gateway no lee ninguna credencial de la peticion', () => {
    expect(indexSrc).not.toMatch(/headers\.get\('x-api-key'\)/)
    expect(indexSrc).not.toMatch(/headers\.get\('Authorization'\)/)
  })

  it('el d1-fake de los tests replica las tablas reales de schema.sql', () => {
    const fakeSrc = readFileSync(D1_FAKE_PATH, 'utf8')
    for (const table of ['api_keys', 'credit_ledger', 'free_quota']) {
      expect(fakeSrc, `d1-fake no replica la tabla ${table}`).toContain(table)
      expect(schemaSql, `schema.sql no crea la tabla ${table}`).toContain(table)
    }
  })
})
