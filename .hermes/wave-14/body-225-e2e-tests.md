# [Wave 14.02] feat-e2e-playwright — Setup Playwright E2E tests for GOS PWA

> Wave 14 — Polish / Testing.
> Labels: `wave-14`, `ola14`
> Branch: `feat/e2e-playwright-tests` (create from main)

---

## Current State (MEASURABLE)

- `@playwright/test` **already installed** in `site/package.json` (v1.62.1)
- `tests/e2e/` directory **exists but is empty** (0 test files)
- Vitest unit tests: **34 tests passing** (7 files in `site/src/lib/`)
- `site/package.json` scripts:
  ```json
  "test": "vitest run",
  "test:watch": "vitest"
  ```
- **No E2E test script** in package.json
- Playwright browsers: **not installed** (`npx playwright install` never run)

## Desired State (DELTA)

Playwright E2E tests covering the main user journeys:

1. **Home page** — loads without errors, shows key sections
2. **Recipe search** — SearchBar returns results, faceted filters work
3. **Recipe detail** — JSON-LD present, nutrition data renders
4. **Ingredient search** — search returns results
5. **Ingredient detail** — page loads, data renders
6. **PWA offline banner** — appears when offline
7. **Countries page** — lists regions
8. **RSS/JSON feed** — /feed.json returns valid JSON Feed 1.1

## Web Research Required

1. search: "Playwright Astro 2026 setup configuration astro.config.mjs"
2. search: "Playwright E2E test best practices 2026 React/Vue patterns"
3. search: "Playwright test.skip CI environment variable conditional"

## Agent Session Prompt

"Before implementing, please:
1. Read `site/astro.config.mjs` to understand the Astro integration setup
2. Read `site/src/pages/index.astro` to understand the home page structure
3. Read `site/src/components/SearchBar.astro` to understand the search interaction
4. Read `site/src/components/OfflineBanner.astro` to understand offline detection
5. Run `npx playwright install chromium --with-deps` to install browsers
6. Create a `tests/e2e/` directory with Playwright config and test files"

## Existing Code Patterns

- Unit tests: `site/src/lib/indexeddb.test.ts` — uses Vitest with mock pattern
- Components: `site/src/components/SearchBar.astro` — fuzzy search with Fuse.js
- Offline detection: `site/src/components/OfflineBanner.astro` — `navigator.onLine` check
- Content pages: `site/src/pages/recipes/[...slug].astro` — static paths with getStaticPaths()

## Acceptance Criteria (VERIFIABLE BY COMMAND)

- [ ] `ls tests/e2e/*.spec.ts 2>/dev/null | wc -l` >= 5 (at least 5 test files created)
- [ ] `grep -c "test(" tests/e2e/*.spec.ts` >= 20 (at least 20 test cases total)
- [ ] `npx playwright test --list 2>&1 | grep "test" | wc -l` >= 10 (Playwright lists 10+ tests)
- [ ] `npx playwright install chromium --with-deps 2>&1 | grep "Chromium"` — Chromium installed
- [ ] `pnpm --filter gos-site test 2>&1 | grep "All tests passed"` — vitest still passes (no regressions)
- [ ] `pnpm --filter gos-site exec astro check 2>&1 | grep "0 errors"` — TypeScript clean
- [ ] `package.json` has `"test:e2e": "playwright test"` script added
- [ ] `playwright.config.ts` exists with baseURL pointing to `http://localhost:4321`

## Files to Modify

| File | Current State | Change | Risk |
|------|-------------|--------|------|
| `tests/e2e/` | empty directory | Create test files + playwright config | LOW |
| `tests/e2e/home.spec.ts` | NEW | Test home page load, key sections | LOW |
| `tests/e2e/recipes.spec.ts` | NEW | Test recipe search + filters + detail | LOW |
| `tests/e2e/ingredients.spec.ts` | NEW | Test ingredient search + detail | LOW |
| `tests/e2e/pwa.spec.ts` | NEW | Test offline banner + manifest | LOW |
| `tests/e2e/rss.spec.ts` | NEW | Test /feed.json valid JSON Feed 1.1 | LOW |
| `playwright.config.ts` | NEW | Base config with webServer, timeouts | LOW |
| `site/package.json` | scripts section | Add `"test:e2e": "playwright test"` | LOW |

## DO NOT touch (Anti-Regression)

- `site/src/lib/` — unit test files
- `site/src/pages/` — page components
- `site/src/components/` — UI components
- `site/src/content/` — content files
- `site/src/content.config.ts` — schema definitions
- `node_modules/` or lockfiles

## Anti-Hallucination Guard

1. **Start dev server first**: Tests must start `astro dev` via `webServer` in playwright.config.ts
2. **Use absolute URLs**: `baseURL` must be set correctly, tests navigate to `/`, `/recipes`, etc.
3. **Do NOT assume data**: Use `page.goto('/recipes')` then `await page.waitForLoadState('networkidle')`
4. **Mock-sensitive tests**: Mark tests that depend on specific recipe data with `.skip` in CI if needed
5. **Timeout**: Use `test.setTimeout(30000)` for page navigation tests
6. **Take screenshots on failure**: Use `await page.screenshot()` in test after hooks

## PR Delivery Requirements (ANTI-EMPTY-PR)

- [ ] `git status --porcelain` shows ≥7 files (config + 5 test files + package.json update)
- [ ] `git diff --stat HEAD` shows non-empty diff
- [ ] `wc -l tests/e2e/*.spec.ts | tail -1` >= 100 (total lines of test code >= 100)
- [ ] `grep -c "test(" tests/e2e/*.spec.ts` >= 20 (real test cases, not just empty tests)

## Dependencies & Merge Order

- **Depends on:** NONE (independent, can run parallel with #224)
- **Blocked by:** NONE
- **Parallel with:** #224 (recipe-schema) — different file islands (dishes/ vs tests/e2e/)
- **Merge order within wave:** [2] (after #224 schema is merged, but can be developed in parallel)
- **Expected effort:** Medium (2-3h)

## Failure Recovery

| If this happens | Action |
|----------------|--------|
| Playwright install fails | Use `npx playwright install --with-deps chromium` |
| Dev server doesn't start | Add `webServer` block to playwright.config.ts with correct port (4321) |
| Tests fail on CI | Use `test.skip()` with `process.env.CI` condition |
| Port 4321 already in use | Change to 4322 in both config and test files |
