# GOS Wave 14 — Schema + E2E Tests

**Fecha**: 2026-09-03
**Repo**: iberi22/gastronomic-open-standard-GOS

## Issues Creadas

| # | Title | Labels | Status |
|---|-------|--------|--------|
| #224 | feat-recipe-schema-homogenize — Standardize frontmatter | wave-14, ola14, data-quality, jules | DISPATCHED |
| #225 | feat-e2e-playwright — Setup Playwright E2E tests | wave-14, ola14, jules | DISPATCHED |

## Scope

### Issue #224 — Recipe Schema Homogenization
- **Target**: `dishes/` (508 .md root source, pre-sync)
- **Changes**: Add `source:`, `language:`, normalize `difficulty:` to 5-star scale
- **Files**: ~320 across 8 collections (china, colombian, peruvian, brazilian, etc.)
- **Effort**: Large (4-6h)

### Issue #225 — Playwright E2E Tests
- **Target**: `tests/e2e/` (empty directory)
- **Changes**: 5+ test files, playwright.config.ts, test:e2e script
- **Tests**: home, recipes, ingredients, PWA, RSS/JSON feed
- **Effort**: Medium (2-3h)

## Status

- [x] Issues created (#224, #225)
- [x] Labels added (wave-14, ola14, data-quality, jules)
- [ ] Jules takes issues (monitor via `gh pr list --author iberi22`)
- [ ] PRs created
- [ ] PRs merged
- [ ] Main green post-wave-14

## Post-wave Cleanup

- Reconciliar CHANGELOG.md con cambios de wave-14
- Actualizar features.json (si existe) post-wave
- Tag v1.1.0 si warranted
