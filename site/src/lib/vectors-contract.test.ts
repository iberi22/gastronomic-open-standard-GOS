// @vitest-environment node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
)

const vectorsDir = path.join(repoRoot, 'site/public/api/vectors')
const indexFile = path.join(vectorsDir, 'index.json')
const indexContent = fs.readFileSync(indexFile, 'utf8')
const index = JSON.parse(indexContent)

let allEntries: any[] = []
for (const shard of index.shards) {
  const shardContent = fs.readFileSync(path.join(vectorsDir, shard.file), 'utf8')
  allEntries = allEntries.concat(JSON.parse(shardContent))
}

describe('Vector embeddings contract test', () => {
  it('parses the index and version matches semver', () => {
    expect(index.version).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it("model === 'Xenova/all-MiniLM-L6-v2' and dim === 384", () => {
    expect(index.model).toBe('Xenova/all-MiniLM-L6-v2')
    expect(index.dim).toBe(384)
  })

  it('count.total === count.ingredients + count.dishes + count.substances', () => {
    const { total, ingredients, dishes, substances } = index.count
    expect(total).toBe(ingredients + dishes + substances)
  })

  it('sum(shards[].count) === count.total', () => {
    const shardsCount = index.shards.reduce((sum: number, shard: any) => sum + shard.count, 0)
    expect(shardsCount).toBe(index.count.total)
  })

  it('every shards[].file exists and statSync(file).size === shards[].size_bytes', () => {
    for (const shard of index.shards) {
      const shardFile = path.join(vectorsDir, shard.file)
      expect(fs.existsSync(shardFile)).toBe(true)
      expect(fs.statSync(shardFile).size).toBe(shard.size_bytes)
    }
  })

  it('loading every shard yields exactly count.total entries', () => {
    expect(allEntries.length).toBe(index.count.total)
  })

  it('every id across all shards is a unique non-empty string', () => {
    const ids = allEntries.map(e => e.id)
    const idSet = new Set(ids)
    expect(idSet.size).toBe(index.count.total)
    for (const id of idSet) {
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(0)
    }
  })

  it('per-type counts of loaded entries equal count.ingredients / count.dishes / count.substances', () => {
    let ingredients = 0
    let dishes = 0
    let substances = 0
    for (const entry of allEntries) {
      if (entry.type === 'ingredient') ingredients++
      else if (entry.type === 'dish') dishes++
      else if (entry.type === 'substance') substances++
    }
    expect(ingredients).toBe(index.count.ingredients)
    expect(dishes).toBe(index.count.dishes)
    expect(substances).toBe(index.count.substances)
  })

  it('every entry has embedding.length === dim, is finite, and text is a non-empty string', () => {
    for (const entry of allEntries) {
      expect(entry.embedding.length).toBe(index.dim)
      for (const val of entry.embedding) {
        expect(Number.isFinite(val)).toBe(true)
      }
      expect(typeof entry.text).toBe('string')
      expect(entry.text.length).toBeGreaterThan(0)
    }
  })

  it('the artifact set under site/public/api/vectors contains exactly 4 files', () => {
    const files = fs.readdirSync(vectorsDir)
    expect(files.length).toBe(4)
    expect(files).toContain('index.json')
    for (const shard of index.shards) {
      expect(files).toContain(shard.file)
    }
  })
})
