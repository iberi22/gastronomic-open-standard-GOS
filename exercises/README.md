# Exercise catalogue — provenance and licensing

Generated 2026-10-04 from `exercises-data.js` in
[`DuarteSantos8/openGym`](https://github.com/DuarteSantos8/openGym) @ `e88062e`.

## What is in here

Only **metadata and instruction text**: the openGym id, name, body part, equipment, target and
secondary muscles, and the technique steps. All 1,324 records carry them.

## What is deliberately NOT in here

**The photos and animated GIFs.** Every one of the 1,324 records in the source carries an `img`
and a `gif` field. Those have **unresolved title** — openGym's own README says so:

> Third-party content is not, and openGym cannot sublicense it. The exercise metadata and
> instruction text originate from [ExerciseDB v1](https://exercisedb.dev/) … while
> [ExerciseDB/AscendAPI](https://exercisedb.io/faq) claims to be their creator and owner.

So the media is stripped from this catalogue and never vendored. Artwork for BioHuman comes from
`bryllim/workout-guide` (CC BY-SA 4.0), which has a clear chain of title.

## Licensing of what remains

- Metadata and instruction text: **MIT**. The content originates from ExerciseDB v1 by AscendAPI and
  reaches this repository through openGym, which takes it from
  [`hasaneyldrm/exercises-dataset`](https://github.com/hasaneyldrm/exercises-dataset). **The MIT grant
  being relied on is that dataset's, not ExerciseDB's** — ExerciseDB is the asserted originator of
  the content, not the party that granted the licence. The notice is reproduced in full in the
  repository's `NOTICE.md`, which is what the licence actually requires; a sentence here is not.
- This file layout and the `swal.health/v1` ref form (`wg:<slug>`): ours.

## `artRef`

Set only when an exercise's name matches a `workout-guide` entry **exactly** (after normalising
punctuation and case). 46 of 1,324 match. Everything else is `null` and the app shows an honest
placeholder.

Fuzzy matching was tried and rejected: scoring on token overlap produced 286 candidate links, of
which **76 were wrong** — `band bench press` resolved to a barbell bench illustration, `archer
pull up` to a plain `pull-up`. A wrong illustration is worse than no illustration, because the
lifter reads the picture as the exercise they are about to do.

## Fields

| Field | Meaning |
|---|---|
| `slug` | Stable id, the `wg:` half of the contract's exercise ref |
| `name` | English display name from the source dataset |
| `bodyPart` | 10 groups: back, cardio, chest, lower arms, lower legs, neck, shoulders, upper arms, upper legs, waist |
| `equipment` | 28 values, `body weight` (325) and `dumbbell` (294) the largest |
| `targetMuscle` | 19 muscles |
| `secondaryMuscles` | Often empty |
| `steps` | Technique instructions, MIT text |
| `sourceId` | The upstream 4-digit id, kept so a re-import can be diffed against this file |
| `artRef` | `workout-guide` slug when the name matches exactly, else `null` |

## Not verified

The instruction text has **not** been checked by a qualified trainer. Treat it as a starting point
to be corrected, not as coaching advice. `difficulty` is not included because the source derives it
by heuristic and it would read as an assessment.
