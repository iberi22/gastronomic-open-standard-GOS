# Third-party notices

GOS itself is licensed under **Apache-2.0** (see `LICENSE`). This file records the third-party
material that ships in this repository.

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
