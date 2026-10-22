import { describe, expect, it } from 'vitest'
import { buildShards } from './export-vectors.mjs'

const vectorsFixture = [
  { id: '1', type: 'ingredient', text: 't1', embedding: [0.1, 0.2] },
  { id: '2', type: 'dish', text: 't2', embedding: [0.3, 0.4] },
  { id: '3', type: 'substance', text: 't3', embedding: [0.5, 0.6] },
  { id: '4', type: 'ingredient', text: 't4', embedding: [0.7, 0.8] },
  { id: '5', type: 'dish', text: 't5', embedding: [0.9, 0.1] },
]

describe('export-vectors sharding logic', () => {
  it('respects the maxItemsPerShard parameter', () => {
    const shards = buildShards(vectorsFixture, 2)

    expect(shards.length).toBe(3)
    expect(shards[0].length).toBe(2)
    expect(shards[1].length).toBe(2)
    expect(shards[2].length).toBe(1)
  })

  it('preserves all items and keeps documented fields intact', () => {
    const shards = buildShards(vectorsFixture, 3)
    const allItems = shards.flat()

    expect(allItems.length).toBe(vectorsFixture.length)

    allItems.forEach((item) => {
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('type')
      expect(item).toHaveProperty('text')
      expect(item).toHaveProperty('embedding')
      expect(Array.isArray(item.embedding)).toBe(true)
    })
  })

  it('preserves constant vector length across all processed items', () => {
    const shards = buildShards(vectorsFixture, 5)
    const allItems = shards.flat()

    const expectedLength = allItems[0].embedding.length
    allItems.forEach((item) => {
      expect(item.embedding.length).toBe(expectedLength)
    })
  })

  it('handles empty input gracefully', () => {
    const shards = buildShards([], 2)
    expect(shards.length).toBe(0)
  })
})
