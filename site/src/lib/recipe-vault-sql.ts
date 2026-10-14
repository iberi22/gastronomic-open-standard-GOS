import { VAULT_EXPORT_FORMAT, VAULT_EXPORT_VERSION, serializeVaultExport } from './recipe-vault'
import type { DomainRecord } from './domain'

/** Nombre de archivo con marca de tiempo (SQL). */
export function vaultSqlFilename(now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '-')
  return `gos-vault-${stamp}.sql`
}

/** Genera el SQL dump de exportación completo (offline). */
export function buildVaultSqlDump(
  records: DomainRecord[],
  exportedAt: string = new Date().toISOString(),
  extraStores: Record<string, DomainRecord[]> = {}
): string {
  const lines: string[] = []
  lines.push('PRAGMA foreign_keys=OFF;')
  lines.push('BEGIN;')

  // _export_meta table
  lines.push(
    'CREATE TABLE IF NOT EXISTS "_export_meta" (key TEXT PRIMARY KEY, value TEXT NOT NULL);'
  )
  lines.push(
    `INSERT INTO "_export_meta" (key, value) VALUES ('format', '${escapeSql(VAULT_EXPORT_FORMAT)}');`
  )
  lines.push(
    `INSERT INTO "_export_meta" (key, value) VALUES ('app_id', 'gos');`
  )
  lines.push(
    `INSERT INTO "_export_meta" (key, value) VALUES ('exported_at', '${escapeSql(exportedAt)}');`
  )
  lines.push(
    `INSERT INTO "_export_meta" (key, value) VALUES ('schema_version', '${VAULT_EXPORT_VERSION}');`
  )

  // Entity tables
  const entities = [{ name: 'recipe', records }, ...Object.entries(extraStores).map(([name, records]) => ({ name, records }))]

  for (const entity of entities) {
    if (!/^[A-Za-z0-9_]+$/.test(entity.name)) {
      throw new Error(`Invalid entity name for SQL dump: ${entity.name}`)
    }
    const table = entity.name
    lines.push(
      `CREATE TABLE IF NOT EXISTS "${table}" (id TEXT PRIMARY KEY, instance_id TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT, data TEXT NOT NULL);`
    )

    for (const record of entity.records) {
      const id = escapeSql(record.id)
      const instanceId = escapeSql(record.instance_id)
      const createdAt = escapeSql(record.created_at)
      const updatedAt = escapeSql(record.updated_at)
      // Any record in DomainRecord does not have deleted_at unless specified. Assuming null if missing.
      const deletedAt = 'deleted_at' in record && typeof record.deleted_at === 'string' ? `'${escapeSql(record.deleted_at)}'` : 'NULL'
      const data = escapeSql(JSON.stringify(record))

      lines.push(
        `INSERT INTO "${table}" (id, instance_id, created_at, updated_at, deleted_at, data) VALUES ('${id}', '${instanceId}', '${createdAt}', '${updatedAt}', ${deletedAt}, '${data}');`
      )
    }
  }

  lines.push('COMMIT;')
  lines.push('') // Trailing newline
  return lines.join('\n')
}

/** Wrapper of JSON export for multiple stores if needed. */
export function buildAllDataJson(
  records: DomainRecord[],
  exportedAt: string = new Date().toISOString(),
  extraStores: Record<string, DomainRecord[]> = {}
): string {
  if (Object.keys(extraStores).length === 0) {
    return serializeVaultExport(records, exportedAt)
  }

  const payload = {
    format: VAULT_EXPORT_FORMAT,
    version: VAULT_EXPORT_VERSION,
    exported_at: exportedAt,
    recipes: records,
    ...extraStores
  }

  return JSON.stringify(payload, null, 2)
}

function escapeSql(str: string): string {
  return str.replace(/'/g, "''")
}
