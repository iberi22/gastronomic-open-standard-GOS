import { describe, expect, it, vi } from 'vitest'
import { buildShards } from './export-vectors.mjs'

const validVectorsFixture = [
  { id: '1', type: 'ingredient', text: 't1', embedding: [0.1, 0.2] },
  { id: '2', type: 'dish', text: 't2', embedding: [0.3, 0.4] },
  { id: '3', type: 'substance', text: 't3', embedding: [0.5, 0.6] },
]

const invalidVectorsFixture = [
  { id: '1', type: 'ingredient', text: 't1', embedding: [0.1, 0.2] },
  { type: 'dish', text: 't2', embedding: [0.3, 0.4] }, // Missing id
  { id: '3', type: 'substance', text: 't3', embedding: [0.5] }, // Mismatched length
  { id: '4', type: 'ingredient', text: 't4', embedding: [] }, // Empty embedding
  { id: '5', type: 'dish', text: 't5', embedding: [0.7, 0.8] }, // Valid
]

describe('export-vectors sharding logic', () => {
  it('verifies documented fields for valid items', () => {
    const shards = buildShards(validVectorsFixture, 2)

    // Check it respects maxItemsPerShard
    expect(shards.length).toBe(2)
    expect(shards[0].length).toBe(2)
    expect(shards[1].length).toBe(1)

    // Check properties and constant lengths
    const allItems = shards.flat()
    allItems.forEach((item) => {
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('type')
      expect(item).toHaveProperty('text')
      expect(item).toHaveProperty('embedding')
      expect(Array.isArray(item.embedding)).toBe(true)
    })
  })

  it('verifies constant vector length for valid items', () => {
    const shards = buildShards(validVectorsFixture, 2)
    const allItems = shards.flat()

    allItems.forEach((item) => {
      expect(item.embedding.length).toBe(2) // based on first valid item
    })
  })

  it('keeps every entry and splits them into shards of maxItemsPerShard', () => {
    const shards = buildShards(invalidVectorsFixture, 2)
    expect(shards.map((s) => s.length)).toEqual([2, 2, 1])
    expect(shards.flat().map((v) => v.id)).toEqual(['1', undefined, '3', '4', '5'])
  })
})
