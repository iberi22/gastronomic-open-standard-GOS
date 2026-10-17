// @vitest-environment node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { buildDataset } from '../../../scripts/export-v1.mjs'

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
)

describe('v1 manifest drift gate', () => {
  it('matches a fresh build of the corpus', () => {
    const manifestPath = path.join(repoRoot, 'site/public/api/v1/manifest.json')
    const manifestContent = fs.readFileSync(manifestPath, 'utf8')
    const trackedManifest = JSON.parse(manifestContent)

    expect(manifestContent.endsWith('\n')).toBe(true)

    const freshDataset = buildDataset({ generatedAt: trackedManifest.generatedAt })
    const freshManifest = freshDataset.manifest

    expect(trackedManifest.schemaVersion).toBe(freshManifest.schemaVersion)
    expect(trackedManifest.version).toBe(freshManifest.version)
    expect(trackedManifest.license).toBe(freshManifest.license)
    expect(trackedManifest.counts).toEqual(freshManifest.counts)
    expect(trackedManifest.contentHash).toBe(freshManifest.contentHash)

    const v1Dir = path.dirname(manifestPath)
    for (const filename of Object.values(trackedManifest.files) as string[]) {
      const filePath = path.join(v1Dir, filename)
      expect(fs.existsSync(filePath)).toBe(true)
      expect(fs.statSync(filePath).size).toBeGreaterThan(0)
    }
  })
})
