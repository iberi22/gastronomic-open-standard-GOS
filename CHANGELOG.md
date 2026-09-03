# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_Not yet released. All wave-13 items pending merge to main._

### Added
- RSS/JSON-LD feed at `/feed.json` (50 latest items)
- JSON-LD structured data on recipe and ingredient pages
- `site/scripts/generate-feed.mjs` — re-generate feed.json on content changes

### Changed
- `.husky/pre-commit` now runs `cd site && npx --yes astro check` (was `npx lint-staged`, not installed)

---

## [1.0.0] — 2026-09-03

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
