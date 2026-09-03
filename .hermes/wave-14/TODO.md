# GOS Wave 14 — Schema + E2E Tests

**Fecha**: 2026-09-03
**Status**: 100% COMPLETE ✅
**Main SHA**: 36972052
**Duration**: ~4h (16:58 → 20:30 UTC)

## Issues Creadas

| # | Title | Labels | Status |
|---|-------|--------|--------|
| #224 | feat-recipe-schema-homogenize — Standardize frontmatter | wave-14, ola14, data-quality, jules | CLOSED (resuelto por #228) |
| #225 | feat-e2e-playwright — Setup Playwright E2E tests | wave-14, ola14, jules | CLOSED (resuelto por #226) |

## PRs Creadas

| PR | Title | Author | State | Files | +/- | Commit |
|----|-------|--------|-------|-------|-----|--------|
| #226 | Setup Playwright E2E tests for GOS PWA | Jules | MERGED (via #227) | 11 | +361 | 6dc19b25 |
| #227 | fix(e2e): port conflict + gitignore | iberi22 | MERGED | 3 | +9/-8 | f10dd94b |
| #228 | Standardize frontmatter schema across all dishes collections | Jules | MERGED | 1017 | +20788/-30773 | c8cb3217 |
| - | fix(content): remove broken local image references across all collections | iberi22 | MERGED (direct push) | 690 | +124/-693 | 36972052 |

## Scope Delivered

### Issue #224 — Recipe Schema Homogenization (✅)
- **Target**: ALL dishes/*.md (1017 files across 8+ collections)
- **Changes**:
  - Added `source:`, `language:`, normalized `difficulty:` to 5-star scale
  - Created `site/scripts/normalize-schema.mjs` (reusable)
  - Added `dishes_backup/` to .gitignore
- **Jules task**: 17980121240596282245
- **Duration**: ~3h

### Issue #225 — Playwright E2E Tests (✅)
- **Target**: `tests/e2e/` (was empty, now 5 spec files)
- **Changes**:
  - 22 E2E tests across 5 spec files (home, recipes, ingredients, pwa, rss)
  - `playwright.config.ts` at repo root (port 4331 to avoid conflict)
  - `test:e2e` script in both package.json files
  - Integrated `OfflineBanner` component in `Layout.astro`
  - `.gitignore`: test-results/, playwright-report/, playwright/.cache/
- **Jules task**: 35905226272440809
- **Duration**: ~18 min + follow-up port fix

## Issues Closed (Cleanup)

| # | Title | Reason |
|---|-------|--------|
| #193 | [GOS] Homogenize recipe schema | Resolved by #228 |
| #196 | feat-top20-catalog | Content already existed; Jules closed without PR |
| #197 | feat-ingredient-variants | Content already existed; Jules closed without PR |
| #198 | feat-substance-encyclopedia | Content already existed; Jules closed without PR |

## Final State

- [x] Issues created (#224, #225)
- [x] Labels added (wave-14, ola14, data-quality, jules)
- [x] Jules dispatched
- [x] PRs created (#226, #227, #228)
- [x] PRs merged
- [x] Build green (astro check 0e0w, vitest 34/34, build 1117 pages)
- [x] Image reference fix applied (post-merge regression caught)
- [x] Issues #193, #224, #225 closed
- [x] 0 open issues
- [x] 0 open PRs

## QA Final

```bash
pnpm --filter gos-site test
# Test Files  7 passed (7)
# Tests  34 passed (34)

pnpm --filter gos-site exec astro check
# 0 errors, 0 warnings, 79 hints

pnpm --filter gos-site build
# ✓ 1117 page(s) built
# Complete!

pnpm --filter gos-site audit
# No known vulnerabilities found
```

## Post-wave Cleanup

- [x] Documented in Xavier (wave-14/index.md, pr-228-schema-standardization.md, pr-226-227-e2e-suite.md)
- [x] Release v1.0.0 stays as-is (Wave 14 was additive, no v1.1.0 needed)
- [ ] (Future) Pre-build image reference validator script
- [ ] (Future) CI gate to run `pnpm test:e2e` on every PR
- [ ] (Future) Document NixOS chromium limitation in README

## Notes for Future Waves

1. **Always run `pnpm build` after merging Jules PRs** that touch content collections
2. **Port allocation**: assign 4300-4399 to SWAL apps (avoid 4321 used by worldexams/xavier)
3. **Jules duration**: 18 min for new files, 3h for large refactors (1017 file edits)
4. **Stale configs**: verify no `playwright.config.ts` at multiple paths
5. **Jules reintroduces broken image refs**: schema-normalization scripts may re-add upstream image paths that don't exist locally
