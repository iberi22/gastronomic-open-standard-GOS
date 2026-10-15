# Third-party notices

Since 2026-10-15 the repository root and every package in it (recipes, ingredients, schemas,
exercises, site, worker, `packages/gos-client`, `packages/health-contract`) are licensed under
**AGPL-3.0-or-later** (see `LICENSE` and `NOTICE`). `packages/health-contract` contains code ported
from [`openGym`](https://github.com/DuarteSantos8/openGym), which was already
**AGPL-3.0-or-later** — the same licence, now repo-wide, so there is no longer a package that is the
exception. Third-party content below keeps its own licence exactly as stated; those notices are not
relicensed by the change above.

## Licence lineage

Each step is verifiable in git history:

| Date | Licence | Evidence |
|------|---------|----------|
| 2020-03-16 | Unlicense (public domain) | `5cd6be07` — this repository started from [HowToCook](https://github.com/Anduin2017/HowToCook), released into the public domain under the Unlicense |
| 2025-07-10 | MIT | `525ae36c` |
| 2025-12-11 | CC BY-NC 4.0 | `716cd84c` |
| 2026-08-24 | AGPL-3.0 | `eefae003` |
| 2026-10-02 | Apache-2.0 | `ac33f89b` |
| 2026-10-15 | **AGPL-3.0-or-later** | owner decision (Belal): GOS stops selling access and becomes the open information repository of the SWAL ecosystem |

## Exercise catalogue metadata and instruction text

`exercises/*.json` redistributes exercise names, attributes and technique instructions for 1,324
exercises. That content originates from [**ExerciseDB v1**](https://exercisedb.dev/) by AscendAPI and
reaches this repository through openGym, which takes it from
[`hasaneyldrm/exercises-dataset`](https://github.com/hasaneyldrm/exercises-dataset). The MIT grant
relied on is that dataset's, and its notice is reproduced in full below as the licence requires.

```
MIT License

Copyright (c) 2026 Hasan Emir Yıldırım

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation and data files (the "Software"),
to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

See `exercises/README.md` for what was and was not taken from that dataset.

## Exercise artwork

**None.** The source dataset's photographs and animated GIFs are deliberately excluded and are not
present in this repository in any form. Their ownership is disputed — openGym's own `NOTICE.md`
records that Gym Visual and ExerciseDB/AscendAPI make conflicting claims and that openGym cannot
sublicense them. Artwork used by the apps comes from
[`bryllim/workout-guide`](https://github.com/bryllim/workout-guide) under **CC BY-SA 4.0**, with the
credit its own licence requires.

## Body diagram geometry

Not used here. Recorded for completeness because openGym derives its muscle maps from
[`MuscleMap`](https://github.com/melihcolpan/MuscleMap) by Melih Colpan (MIT); this repository ships
no such geometry.
