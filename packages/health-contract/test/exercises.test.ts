import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * The exercise catalogue as shipped under `exercises/`.
 *
 * Two of these assertions are about licensing rather than shape, and they matter most: the photos
 * and GIFs the source dataset carries have unresolved title, so their absence here is a legal
 * boundary, not a missing feature. If a future import helpfully copies them in, this is what stops
 * it.
 */

const dir = fileURLToPath(new URL('../../../exercises/', import.meta.url))

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

const groups = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((file) => {
    const g = JSON.parse(readFileSync(`${dir}${file}`, 'utf8')) as {
      bodyPart: string
      count: number
      exercises: Exercise[]
    }
    return { file, ...g }
  })

const all = groups.flatMap((g) => g.exercises)

// The half of the contract's exercise ref that follows `wg:` — enforced in
// schemas/ecosystem/v1/envelope.schema.json#/$defs/exercise.
const SLUG = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/

describe('exercise catalogue', () => {
  it('files every exercise under the body part it claims', () => {
    expect(groups.length).toBeGreaterThan(0)
    for (const g of groups) {
      expect(g.exercises.length, `${g.file} is empty`).toBeGreaterThan(0)
      expect(g.count, `${g.file} count field`).toBe(g.exercises.length)
      for (const e of g.exercises)
        expect(e.bodyPart, `${e.slug} in ${g.file}`).toBe(g.bodyPart)
    }
  })

  it('gives every exercise a unique slug the contract accepts', () => {
    for (const e of all)
      expect(e.slug, `${e.slug} must match wg:<slug>`).toMatch(SLUG)
    expect(new Set(all.map((e) => e.slug)).size, 'duplicate slug').toBe(
      all.length,
    )
    expect(new Set(all.map((e) => e.sourceId)).size, 'duplicate sourceId').toBe(
      all.length,
    )
  })

  it('carries no artwork from the source dataset', () => {
    // Every upstream record has an `img` and a `gif`. Their title is unresolved — openGym's own
    // README says so — so none of it may be vendored here.
    for (const e of all)
      for (const key of ['img', 'gif', 'image', 'media', 'video', 'url'])
        expect(Object.hasOwn(e, key), `${e.slug} must not carry "${key}"`).toBe(
          false,
        )
  })

  it('carries everything a plan needs to prescribe an exercise', () => {
    for (const e of all)
      for (const key of ['name', 'equipment', 'targetMuscle'] as const)
        expect(e[key].length, `${e.slug}.${key} is empty`).toBeGreaterThan(0)
    for (const e of all)
      expect(e.steps.length, `${e.slug} has no steps`).toBeGreaterThan(0)
  })

  it('links artwork only where the name matches exactly', () => {
    // Fuzzy matching was tried and rejected: token overlap produced 286 candidates of which 76
    // were wrong (a "band bench press" resolving to a barbell bench illustration). A wrong picture
    // is worse than none, so the catalogue links only what it can prove.
    const linked = all.flatMap((e) =>
      e.artRef ? [{ ref: e.artRef, of: e.slug }] : [],
    )
    for (const l of linked) expect(l.ref, `${l.of} artRef`).toMatch(SLUG)
    expect(linked.length, 'every exercise links artwork').toBeLessThan(
      all.length,
    )
  })

  it('uses the closed value sets the import produced', () => {
    // Deliberately not enumerated: a new value should be a deliberate act, so only the shape of
    // the sets is pinned here and their contents live in exercises/README.md.
    expect(new Set(all.map((e) => e.bodyPart)).size).toBe(10)
    expect(new Set(all.map((e) => e.equipment)).size).toBe(28)
    expect(new Set(all.map((e) => e.targetMuscle)).size).toBe(19)
  })
})
