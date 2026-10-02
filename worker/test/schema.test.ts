// El esquema de schema.sql es la garantia de que la validacion de keys tiene
// donde apoyarse. Si el archivo y la consulta del gateway divergen, el
// gateway responde 503 a todo el mundo (fail-closed) o, peor, se reintroduce
// un camino que no consulta la tabla. Este test blinda esa correspondencia.

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
  it('crea la tabla api_keys con las columnas que consulta el gateway', () => {
    const db = new DatabaseSync(':memory:')
    db.exec(schemaSql)

    const cols = db.prepare('PRAGMA table_info(api_keys)').all() as Array<{
      name: string
    }>
    const names = cols.map((c) => c.name)
    for (const required of [
      'key',
      'tier',
      'status',
      'created_at',
      'expires_at',
    ]) {
      expect(names, `falta la columna ${required}`).toContain(required)
    }
    db.close()
  })

  it('crea el indice por key que exige la especificacion', () => {
    const db = new DatabaseSync(':memory:')
    db.exec(schemaSql)
    const idx = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='api_keys'",
      )
      .all() as Array<{ name: string }>
    expect(idx.map((i) => i.name)).toContain('idx_api_keys_key')
    db.close()
  })

  it('es idempotente (se puede aplicar dos veces sin error)', () => {
    const db = new DatabaseSync(':memory:')
    db.exec(schemaSql)
    expect(() => db.exec(schemaSql)).not.toThrow()
    db.close()
  })

  it('permite insertar una key activa sin expires_at (NULL = sin vencimiento)', () => {
    const db = new DatabaseSync(':memory:')
    db.exec(schemaSql)
    db.prepare('INSERT INTO api_keys (key, tier, status) VALUES (?, ?, ?)').run(
      'k_test_placeholder',
      'tiersocio',
      'active',
    )
    const row = db
      .prepare(
        'SELECT key, tier, status, expires_at FROM api_keys WHERE key = ?',
      )
      .get('k_test_placeholder') as Record<string, unknown>
    expect(row.expires_at).toBeNull()
    expect(row.status).toBe('active')
    db.close()
  })

  it('NO contiene ninguna credencial sembrada ni seed con valor real', () => {
    // Prohibido: literales tipo key sembrada en un INSERT. Solo placeholders
    // claramente marcados o el marcador [REDACTED].
    const inserts = schemaSql.split('\n').filter((l) => /^\s*INSERT/i.test(l))
    for (const line of inserts) {
      expect(line, `schema.sql tiene un INSERT sembrado: ${line}`).not.toMatch(
        /INSERT\s+(OR\s+\w+\s+)?INTO\s+api_keys/i,
      )
    }
    // Y ningun literal con pinta de secreto de pago.
    expect(schemaSql).not.toMatch(/sk_live|pk_live|Bearer\s+[A-Za-z0-9]{16,}/)
  })
})

describe('coherencia entre schema.sql y la consulta del gateway', () => {
  it('el d1-fake de los tests declara las mismas columnas que el schema real', () => {
    const fakeSrc = readFileSync(D1_FAKE_PATH, 'utf8')
    for (const col of ['key', 'tier', 'status', 'expires_at']) {
      expect(fakeSrc, `d1-fake no replica la columna ${col}`).toContain(col)
    }
    // Si el gateway consultase una columna que schema.sql no crea, D1 real
    // lanzaria en produccion y el gateway caeria a 503 para todos.
    expect(indexSrc).toContain('expires_at')
    expect(schemaSql).toContain('expires_at')
  })

  it('el gateway consulta exactamente las columnas que schema.sql define', () => {
    const db = new DatabaseSync(':memory:')
    db.exec(schemaSql)
    // La MISMA DB donde se aplica el esquema: una ':memory:' distinta es otra
    // base vacia y la consulta devolveria undefined sin que nada este roto.
    db.prepare('INSERT INTO api_keys (key, tier, status) VALUES (?, ?, ?)').run(
      'k_test_placeholder',
      'tiersocio',
      'active',
    )
    // La misma consulta que ejecuta el gateway, con la tabla real del schema.
    const row = db
      .prepare(
        'SELECT key, tier, status, expires_at FROM api_keys ' +
          'WHERE key = ? AND status = ? ' +
          "AND (expires_at IS NULL OR datetime(expires_at) > datetime('now'))",
      )
      .get('k_test_placeholder', 'active') as
      | Record<string, unknown>
      | undefined
    expect(row).toBeTruthy()
    expect(row?.tier).toBe('tiersocio')
    db.close()
  })

  it('no quedan restos del bypass por substring en el codigo del gateway', () => {
    // La guarda dura: la combinacion includes('socio')/includes('paid') dentro
    // de la ruta de autenticacion es exactamente lo que se elimino.
    const authPath = indexSrc.slice(
      indexSrc.indexOf('// 2. Authentication check'),
      indexSrc.indexOf('// 3. Rate Limiting'),
    )
    expect(
      authPath,
      'sigue habiendo un match por contenido en la ruta de auth',
    ).not.toMatch(/includes\(['"]socio['"]\)|includes\(['"]paid['"]\)/)
  })
})
