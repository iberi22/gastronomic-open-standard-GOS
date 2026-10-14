import initSqlJs from 'sql.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DomainRecord } from './domain'
import {
  parseVaultExport,
  serializeVaultExport,
  VAULT_EXPORT_FORMAT,
  VAULT_INSTANCE,
} from './recipe-vault'
import { buildVaultSqlDump } from './recipe-vault-sql'

// Same valid recipe structure used in recipe-vault tests
const validRecipe: DomainRecord = {
  id: 'vault-1',
  instance_id: VAULT_INSTANCE,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  title: "Arepas de choclo's and more",
  main_ingredients: ['Maíz dulce', 'Queso fresco'],
  instructions: ['Licuar', 'Cocinar en sartén\nCon mantequilla'],
  slug: 'arepas-de-choclos-and-more',
}

let netCalls: string[] = []

function trapNetwork(): void {
  netCalls = []
  const boom =
    (who: string) =>
    (..._args: unknown[]) => {
      netCalls.push(who)
      throw new Error(`RED BLOQUEADA: intentó usar ${who}`)
    }
  vi.stubGlobal('fetch', boom('fetch'))
  vi.stubGlobal('XMLHttpRequest', boom('XMLHttpRequest'))
  vi.stubGlobal('WebSocket', boom('WebSocket'))
  vi.stubGlobal('EventSource', boom('EventSource'))
  vi.stubGlobal('sendBeacon', boom('sendBeacon'))
}

describe('recipe-vault-sql', () => {
  beforeEach(() => {
    trapNetwork()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('JSON round-trip: serializeVaultExport and parseVaultExport', () => {
    const exportedAt = '2026-01-01T00:00:00.000Z'
    const jsonStr = serializeVaultExport([validRecipe], exportedAt)
    const result = parseVaultExport(jsonStr)

    expect(result.ok).toBe(true)
    expect(result.drafts.length).toBe(1)
    expect(result.drafts[0].title).toBe("Arepas de choclo's and more")
  })

  it('SQL restore using sql.js', async () => {
    const exportedAt = '2026-01-01T00:00:00.000Z'
    const sqlDump = buildVaultSqlDump([validRecipe], exportedAt)

    // In-memory SQLite DB
    const SQL = await initSqlJs()
    const db = new SQL.Database()

    // Execute the dump
    db.run(sqlDump)

    // Check _export_meta
    const metaRes = db.exec('SELECT key, value FROM _export_meta')
    expect(metaRes[0].values).toContainEqual(['format', VAULT_EXPORT_FORMAT])
    expect(metaRes[0].values).toContainEqual([
      'app_id',
      'gastronomic-open-standard-GOS',
    ])
    expect(metaRes[0].values).toContainEqual(['exported_at', exportedAt])

    // Check recipe table
    const recipeRes = db.exec('SELECT count(*) as cnt FROM recipe')
    expect(recipeRes[0].values[0][0]).toBe(1)

    const recipeDataRes = db.exec('SELECT id, data FROM recipe')
    expect(recipeDataRes[0].values[0][0]).toBe('vault-1')

    const dataStr = recipeDataRes[0].values[0][1] as string
    const dataJson = JSON.parse(dataStr)
    expect(dataJson.title).toBe("Arepas de choclo's and more")
    expect(dataJson.instructions[1]).toBe('Cocinar en sartén\nCon mantequilla')
  })

  it('no-network usage: no fetch or similar is used during SQL building', () => {
    buildVaultSqlDump([validRecipe])
    expect(netCalls.length).toBe(0)
  })
})
