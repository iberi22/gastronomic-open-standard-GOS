// @vitest-environment node

import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { countryCounts } from './countries'

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
)

describe('countryCounts', () => {
  it('groups and lowercases ids from nested paths', () => {
    const ids = ['dishes/Colombian/Caribe/x.md']
    const result = countryCounts(ids)
    expect(result).toEqual([{ country: 'dishes', count: 1 }])
  })

  it('groups and lowercases ids from nested paths (country root)', () => {
    const ids = ['Colombian/Caribe/x.md']
    const result = countryCounts(ids)
    expect(result).toEqual([{ country: 'colombian', count: 1 }])
  })

  it('becomes unknown if an id has no segment', () => {
    const ids = ['/x.md']
    const result = countryCounts(ids)
    expect(result).toEqual([{ country: 'unknown', count: 1 }])
  })

  it('sorts by descending count', () => {
    const ids = ['colombian/1.md', 'colombian/2.md', 'mexican/1.md']
    const result = countryCounts(ids)
    expect(result).toEqual([
      { country: 'colombian', count: 2 },
      { country: 'mexican', count: 1 },
    ])
  })

  it('keeps first-appearance order for ties', () => {
    // Both 'a' and 'b' will have count 2. 'a' appears first.
    const ids = ['a/1', 'b/1', 'a/2', 'b/2']
    const result = countryCounts(ids)
    expect(result).toEqual([
      { country: 'a', count: 2 },
      { country: 'b', count: 2 },
    ])

    // Both 'b' and 'a' will have count 2. 'b' appears first.
    const ids2 = ['b/1', 'a/1', 'b/2', 'a/2']
    const result2 = countryCounts(ids2)
    expect(result2).toEqual([
      { country: 'b', count: 2 },
      { country: 'a', count: 2 },
    ])
  })

  it('returns an empty array for empty input', () => {
    const result = countryCounts([])
    expect(result).toEqual([])
  })

  it('returns one entry with count 1 for a single id', () => {
    const ids = ['japanese/sushi.md']
    const result = countryCounts(ids)
    expect(result).toEqual([{ country: 'japanese', count: 1 }])
  })

  it('counts duplicate ids, does not deduplicate', () => {
    const ids = ['mexican/taco.md', 'mexican/taco.md']
    const result = countryCounts(ids)
    expect(result).toEqual([{ country: 'mexican', count: 2 }])
  })

  it('processes the real corpus from the dishes directory', () => {
    // There are 122 total MD files in the colombian folder on disk including READMEs and other files not tracked by git ls-tree.
    // Since we are reading directly from the fs, let's execute `git ls-tree` to match exactly what is in version control,
    // which gives 114.
    const gitLs = execSync('git ls-tree -r HEAD --name-only dishes', {
      cwd: repoRoot,
    }).toString()
    const gitIds = gitLs
      .split('\n')
      .filter((line: string) => line.endsWith('.md'))
      .map((line: string) => line.replace('dishes/', ''))

    const result = countryCounts(gitIds)

    // Exactly 20 top-level country directories based on current state
    expect(result.length).toBe(20)
    // The largest is colombian with 114 files
    expect(result[0]).toEqual({ country: 'colombian', count: 114 })
  })
})
