import type { DomainRecord } from './domain'
import { VAULT_EXPORT_FORMAT, VAULT_EXPORT_VERSION } from './recipe-vault'

export function vaultSqlFilename(now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '-')
  return `gos-vault-${stamp}.sql`
}

function escapeSqlString(val: string): string {
  return val.replace(/'/g, "''")
}

export function buildVaultSqlDump(
  records: DomainRecord[],
  exportedAt: string = new Date().toISOString()
): string {
  const lines: string[] = []

  lines.push('PRAGMA foreign_keys=OFF;')
  lines.push('BEGIN;')

  // _export_meta table
  lines.push(
    'CREATE TABLE IF NOT EXISTS "_export_meta" (key TEXT PRIMARY KEY, value TEXT NOT NULL);'
  )
  lines.push(
    `INSERT INTO "_export_meta" (key, value) VALUES ('format', '${escapeSqlString(
      VAULT_EXPORT_FORMAT
    )}');`
  )
  lines.push(
    `INSERT INTO "_export_meta" (key, value) VALUES ('app_id', '${escapeSqlString(
      'gastronomic-open-standard-GOS'
    )}');`
  )
  lines.push(
    `INSERT INTO "_export_meta" (key, value) VALUES ('exported_at', '${escapeSqlString(
      exportedAt
    )}');`
  )
  lines.push(
    `INSERT INTO "_export_meta" (key, value) VALUES ('schema_version', '${VAULT_EXPORT_VERSION}');`
  )

  // recipe table
  const recipeTable = 'recipe'
  lines.push(
    `CREATE TABLE IF NOT EXISTS "${recipeTable}" (id TEXT PRIMARY KEY, instance_id TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, data TEXT NOT NULL);`
  )

  for (const record of records) {
    const dataJson = JSON.stringify(record)
    const idEscaped = escapeSqlString(record.id)
    const instanceIdEscaped = escapeSqlString(record.instance_id)
    const createdAtEscaped = escapeSqlString(record.created_at)
    const updatedAtEscaped = escapeSqlString(record.updated_at)

    // There is no deleted_at in DomainRecord yet by default, but we should handle it if present
    const deletedAt = (record as any).deleted_at
    const deletedAtSql = deletedAt ? `'${escapeSqlString(deletedAt)}'` : 'NULL'

    lines.push(
      `INSERT INTO "${recipeTable}" (id, instance_id, created_at, updated_at, deleted_at, data) VALUES ('${idEscaped}', '${instanceIdEscaped}', '${createdAtEscaped}', '${updatedAtEscaped}', ${deletedAtSql}, '${escapeSqlString(dataJson)}');`
    )
  }

  lines.push('COMMIT;')

  return lines.join('\n')
}
