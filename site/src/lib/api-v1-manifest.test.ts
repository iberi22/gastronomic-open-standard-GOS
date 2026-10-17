// @vitest-environment node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, beforeAll } from 'vitest'
import { buildDataset } from '../../../scripts/export-v1.mjs'

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
)

describe('v1 manifest drift gate', () => {
  let manifestPath: string
  let manifestContent: string
  // biome-ignore lint/suspicious/noExplicitAny: simple object schema
  let trackedManifest: any
  // biome-ignore lint/suspicious/noExplicitAny: dataset is dynamically typed
  let freshManifest: any

  beforeAll(() => {
    manifestPath = path.join(repoRoot, 'site/public/api/v1/manifest.json')
    manifestContent = fs.readFileSync(manifestPath, 'utf8')
    trackedManifest = JSON.parse(manifestContent)

    const freshDataset = buildDataset({
      generatedAt: trackedManifest.generatedAt,
    })
    freshManifest = freshDataset.manifest
  })

  it('has a trailing newline and parses as JSON', () => {
    expect(manifestContent.endsWith('\n')).toBe(true)
    expect(() => JSON.parse(manifestContent)).not.toThrow()
  })

  it('matches schemaVersion and version of a fresh build', () => {
    expect(trackedManifest.schemaVersion).toBe(freshManifest.schemaVersion)
    expect(trackedManifest.version).toBe(freshManifest.version)
  })

  it('matches the license of a fresh build', () => {
    expect(trackedManifest.license).toBe(freshManifest.license)
  })

  it('matches counts of a fresh build', () => {
    expect(trackedManifest.counts).toEqual(freshManifest.counts)
  })

  it('matches the contentHash of a fresh build', () => {
    expect(trackedManifest.contentHash).toBe(freshManifest.contentHash)
  })

  it('declares existing and non-empty data files', () => {
    const v1Dir = path.dirname(manifestPath)
    for (const filename of Object.values(trackedManifest.files) as string[]) {
      const filePath = path.join(v1Dir, filename)
      expect(fs.existsSync(filePath)).toBe(true)
      expect(fs.statSync(filePath).size).toBeGreaterThan(0)
    }
  })
})
