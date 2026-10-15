# Gastronomic Open Standard (GOS) Monorepo Licensing Map

This document outlines the licensing strategy and specific SPDX assignments for the various packages within the GOS monorepo.

## Overview

Since **2026-10-15** the whole monorepo is licensed under a single licence:

- **AGPL-3.0-or-later** (GNU Affero General Public License v3.0 or later) — the
  workspace root, the data corpus (recipes, ingredients, nutrition, mixtures,
  substances, schemas), the site, the worker and every package.

The previous mixed-licence split (apps AGPL / root and libraries Apache-2.0) is
gone: GOS is the open information repository of the SWAL ecosystem, and the
business models live in the apps that read it, not here. A single copyleft
licence keeps the published data and the code that serves it open, including
when run as a network service.

This document is the authoritative map; the canonical text is the root
[`LICENSE`](../LICENSE), byte-identical to the official GNU AGPL v3 text.

## SPDX identifiers by package

| Path | SPDX | Declared in |
|------|------|-------------|
| `.` (workspace root, corpus data, scripts) | `AGPL-3.0-or-later` | `package.json`, root `LICENSE` |
| `site/` (`gos-site`, Astro app) | `AGPL-3.0-or-later` | `site/package.json` |
| `worker/` (`gos-api-gateway`) | `AGPL-3.0-or-later` | `worker/package.json` |
| `packages/gos-client/` (`@swal/gos-client`) | `AGPL-3.0-or-later` | `packages/gos-client/package.json` + local `LICENSE` |
| `packages/health-contract/` (`@swal/health-contract`) | `AGPL-3.0-or-later` | `packages/health-contract/package.json` + local `LICENSE` |

`packages/health-contract` contains code ported from
[`openGym`](https://github.com/DuarteSantos8/openGym), which is AGPL-3.0-or-later;
it was the exception that forced AGPL under the old split and is now simply the
same licence as the rest.

## Third-party content

Third-party material keeps its own licence and is not relicensed by the above.
The full notices live in [`NOTICE.md`](../NOTICE.md), reproduced where the
licence requires it:

- Exercise catalogue metadata and instruction text (`exercises/*.json`) from
  [`hasaneyldrm/exercises-dataset`](https://github.com/hasaneyldrm/exercises-dataset)
  (via openGym) — **MIT**, full text reproduced in `NOTICE.md`.
- Exercise artwork from [`bryllim/workout-guide`](https://github.com/bryllim/workout-guide)
  — **CC BY-SA 4.0**.

## Pending content work (recorded, not done here)

Recipe cards (`dishes/**/*.md`, mirrored in `site/src/content/dishes/**`) still
carry `license: Apache-2.0` in their YAML front matter (495/495 at the time of
writing). Relicensing a recipe corpus is a content pass with its own review, so
those fields were deliberately left untouched by the licence change; until that
pass runs, the front-matter value is a per-recipe legacy field, not the
repository licence. The repository licence is this document and the root
`LICENSE`.

## Further Information

- **AGPL-3.0-or-later full text**: root [`LICENSE`](../LICENSE),
  `packages/health-contract/LICENSE`, `packages/gos-client/LICENSE`, or
  <https://www.gnu.org/licenses/agpl-3.0.txt>.
- **Licence lineage**: [`NOTICE`](../NOTICE) and [`NOTICE.md`](../NOTICE.md)
  (Unlicense / public domain → MIT 2025-07 → CC BY-NC 4.0 2025-12 → AGPL-3.0
  2026-08 → Apache-2.0 2026-10-02 → AGPL-3.0-or-later 2026-10-15).
