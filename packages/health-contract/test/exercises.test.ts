import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * The exercise catalogue as shipped under `exercises/`.
 *
 * Two of these assertions are about licensing rather than shape, and they are the ones that
 * matter most: the photos and GIFs the source dataset carries have unresolved title, so their
 * absence from this repository is a legal boundary, not a missing feature. If a future import
 * helpfully copies them in, this test is what stops it.
 */

const dir = fileURLToPath(new URL('../../../exercises/', import.meta.url))
const files = readdirSync(dir).filter((f) => f.endsWith('.json'))

type Exercise = {
  slug: string
  name: string
  bodyPart: string
  equipment: string
  targetMuscle: string
  secondaryMuscles: string[]
  steps: string[]
  sourceId: string
  artRef: string | null
}

const groups = files.map((f) => ({
  file: f,
  ...(JSON.parse(readFileSync(`${dir}${f}`, 'utf8')) as {
    bodyPart: string
    count: number
    exercises: Exercise[]
  }),
}))

const all = groups.flatMap((g) =>
  g.exercises.map((e) => ({ ...e, file: g.file })),
)

// The contract's exercise ref is `wg:<slug>`, and that pattern is enforced in
// schemas/ecosystem/v1/envelope.schema.json#/$defs/exercise.
const SLUG = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/

describe('exercise catalogue', () => {
  it('covers every body part with the exercises it holds', () => {
    expect(groups.length).toBeGreaterThan(0)
    for (const g of groups) {
      expect(g.count, `${g.file} count field`).toBe(g.exercises.length)
      expect(g.exercises.length, `${g.file} is empty`).toBeGreaterThan(0)
      for (const e of g.exercises)
        expect(e.bodyPart, `${e.slug} in ${g.file}`).toBe(g.bodyPart)
    }
  })

  it('gives every exercise a slug the contract accepts, and no two share one', () => {
    for (const e of all)
      expect(e.slug, `${e.slug} must match wg:<slug>`).toMatch(SLUG)
    expect(new Set(all.map((e) => e.slug)).size).toBe(all.length)
    expect(new Set(all.map((e) => e.sourceId)).size).toBe(all.length)
  })

  it('carries no artwork from the source dataset', () => {
    // Every upstream record has an `img` and a `gif`. Their title is unresolved — openGym's own
    // README says so — so none of it may be vendored here.
    for (const e of all) {
      for (const key of ['img', 'gif', 'image', 'media', 'video', 'url']) {
        expect(Object.hasOwn(e, key), `${e.slug} must not carry "${key}"`).toBe(
          false,
        )
      }
    }
  })

  it('carries technique instructions and the fields a plan needs', () => {
    for (const e of all) {
      expect(e.steps.length, `${e.slug} has no steps`).toBeGreaterThan(0)
      expect(e.name.length, `${e.slug} has no name`).toBeGreaterThan(0)
      expect(e.equipment.length, `${e.slug} has no equipment`).toBeGreaterThan(
        0,
      )
      expect(
        e.targetMuscle.length,
        `${e.slug} has no target muscle`,
      ).toBeGreaterThan(0)
      expect(
        Array.isArray(e.secondaryMuscles),
        `${e.slug} secondaryMuscles`,
      ).toBe(true)
    }
  })

  it('links artwork only where the name matches exactly', () => {
    // Fuzzy matching was tried and rejected: token overlap produced 286 candidates of which 76
    // were wrong (a "band bench press" resolving to a barbell bench illustration). A wrong picture
    // is worse than none, so the catalogue links only what it can prove.
    const linked = all.filter((e) => e.artRef)
    for (const e of linked) expect(e.artRef, `${e.slug} artRef`).toMatch(SLUG)
    expect(linked.length).toBeLessThan(all.length)
  })

  it('uses body parts and equipment values from the closed sets', () => {
    // Not enumerating them here on purpose: the point is that a new value is a deliberate act.
    // The counts are what the import produced and are worth pinning.
    expect(new Set(all.map((e) => e.bodyPart)).size).toBe(10)
    expect(new Set(all.map((e) => e.equipment)).size).toBe(28)
    expect(new Set(all.map((e) => e.targetMuscle)).size).toBe(19)
  })
})
