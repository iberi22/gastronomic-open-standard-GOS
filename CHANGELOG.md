# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Removed
- **Tag v1.0.0 retracted** 2026-09-04 — see `.gitcore/releases/v1.0.0-RETIRED.md`. Reason: 8 critical gaps at tag creation (stale score, unverified features, unmerged E2E, dirty tree, open PR, no test logs, no SRS audit, CI gates added after).

### Fixed
- **YAML mapping trap in `main_ingredients`**: `dishes/china/principales/炒年糕/炒年糕.md` had `- 调味料: 酱油，盐` which parsed as mapping instead of string. Same fix applied to English mirror. `gos-audit` now reports 480 valid / 0 invalid.

---

## [1.0.0-rc.1] — 2026-09-04

Release candidate following `~/.hermes/skills/swal-tag-protocol` checklist (all 9 gates passed). Pre-release version pending final community testing.

### Evidence

Full audit trail at `.gitcore/releases/v1.0.0-rc.1/`:
- `step1-git-status.log` — working tree clean
- `step2-implementation-score.json` — regenerated fresh, 100% grade A, gaps []
- `step3-features-last-verified.log` — 2026-09-04
- `step4-ci-status.log` — CI run 33900724879 on commit 8df00e12
- `step5-astro-check.log` / `step5-astro-build.log` / `step5-vitest.log` — 0 err / 0 warn / 34 tests
- `step6-srs-drift.log` — 11 REQs in SRS, 5 features in features.json (drift is structural by design)
- `step7-changelog.log` — this section
- `step8-evidence-bundle.log` — bundle saved
- `step9-tag.log` — tag created

### Gate Status

| Gate | Result |
|---|---|
| Working tree clean | ✅ |
| implementation-score fresh (≥80% B, gaps:[]) | ✅ 100% A, gaps:[] |
| features.json re-verified today | ✅ 2026-09-04 |
| CI green on target commit | ✅ (see step4 log) |
| No OPEN dependabot PRs in dep tree | ✅ (PR #229 closed via auto-merge after fix) |
| astro check 0 err / 0 warn | ✅ 0 errors, 0 warnings, 79 hints (pre-existing) |
| vitest pass | ✅ 7 files / 34 tests |
| SRS drift audit | ✅ structural (see step6 log) |
| CHANGELOG up to date | ✅ this section |

---

## [1.0.0] — 2026-09-03 (RETIRED)

First stable release of GOS. Reached feature completeness for v1.0.0 targets.

### Added

**Content & Data**
- Recipe sync pipeline: 113 new recipes from `dishes/` to `site/src/content/dishes/`
- 26 new vitamins (14 → 40 total) covering B-complex variants, D3, K3-K7, L, N, P, Q, S, T, U, F, G, Om3
- 24 new conditions (11 → 35 total) covering cardiovascular, respiratory, metabolic, mental health, gastrointestinal, musculoskeletal, neurological
- `site/scripts/seed-vitamins-remaining.mjs` and `site/scripts/seed-conditions-remaining.mjs` — re-generatable seed scripts

**Search & UX**
- `SearchBar.astro` component with Fuse.js fuzzy search and faceted filters
- `/recipes` page: search by region, difficulty, dish group
- `/ingredients` page: search by category
- URL param persistence for search state

**API & Persistence**
- `site/src/pages/api/entities/[entity].ts` — REST CRUD router for all entity types
- `site/src/pages/api/health.ts` — health check endpoint
- `site/src/lib/storage-d1.ts` — Cloudflare D1 adapter for domain.ts
- `site/src/lib/indexeddb.ts` — IndexedDB adapter with browser auto-detection
- `site/src/lib/offline-seed.ts` — populate IndexedDB from static JSON on PWA load
- `site/src/components/OfflineBanner.astro` — offline status banner
- `site/src/lib/indexeddb.test.ts` — 4 unit tests for IndexedDB adapter

**Infrastructure**
- `astro-check` job in CI pipeline: runs `pnpm --filter gos-site exec astro check`
- `vitest` job in CI pipeline: runs `pnpm --filter gos-site test`
- Both jobs block merge on failure (no `continue-on-error: true`)
- Husky pre-commit gate: `cd site && npx --yes astro check`

### Changed

- `site/package.json`: added `fuse.js` for fuzzy search
- `site/package.json`: added `idb` for IndexedDB wrapper
- CI pipeline now uses `pnpm --filter gos-site` from repo root (lockfile at root)
- Husky pre-commit replaced broken `lint-staged` with functional `astro check`

### Fixed

- Recipe drift: 102 recipes existed in `dishes/` but were not in `site/src/content/dishes/`
- 20 recipe .md files had broken `./images/1.png` local references that blocked `astro build` (ImageNotFound error) — removed all local image references pointing to non-existent files
- Vitamin/condition/diet content: all grew from 1 entry to full seed sets
- CI: `pnpm install` now works from repo root with `pnpm --filter gos-site`

---

## [0.1.0] — 2026-09-02

Initial wave-12 audit release.

### Added
- Cloudflare Pages deployment (`gos-site.pages.dev`)
- Content collections: dishes, ingredients, vitamins, conditions, diets, substances
- `@swal/ui` integration with edge-hive theme
- Worker AI integration for inference
- D3 graph visualization at `/graph`
- API variants generation script
- PWA manifest, service worker, robots.txt, sitemap.xml, llms.txt

---

[Unreleased]: https://github.com/iberi22/gastronomic-open-standard-GOS/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/iberi22/gastronomic-open-standard-GOS/releases/tag/v1.0.0
[0.1.0]: https://github.com/iberi22/gastronomic-open-standard-GOS/releases/tag/v0.1.0
