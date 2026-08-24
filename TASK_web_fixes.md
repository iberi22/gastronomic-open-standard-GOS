# [GOS Web] Fix site build errors + polish graph UIs and Scientific panel

> Repo: iberi22/gastronomic-open-standard-GOS · Executed locally by AGY (Gemini 3.7 Flash Medium)
> Context: post-prune state — dishes/china removed (103 files), textlint deps dropped, bin/ deleted, stale artifacts archived. Site must build clean again.

## Current State (MEASURABLE)
- `site/dev_output.log` shows esbuild/vite stack-trace errors during dev (log now moved to archive/, but errors persist in code)
- Graph components: `site/src/components/GraphExplorer.astro`, `site/src/components/PWAGraph.astro`, page `site/src/pages/graph.astro`
- Scientific panel: `site/src/pages/scientific.astro` + `site/src/components/ReviewPanel.astro`
- Graph data source: `site/graph-data.json` / `site/graph.json`
- Content copy script: `site/scripts/copy-content.js` (feeds from dishes/ ingredients/ tips/)
- Build chain: `npm run verify:protocol && node scripts/copy-content.js && node scripts/generate-api.js && node ../scripts/generate-embeddings.mjs && astro build`
- NOTE: recipes count changed after prune — china recipes are gone; any hardcoded counts or china references in UI/data will break or show empty entries

## Desired State (DELTA)
1. **Build green**: run the full build chain inside `site/`; fix every error until `astro build` completes with exit 0
2. **Remove china leftovers**: grep the whole `site/` for `china|中国|中文` references in data generation, menus, filters, counts — remove or make data-driven so pruned content disappears naturally
3. **GraphExplorer.astro + PWAGraph.astro polish**:
   - Nodes/links render from live graph-data.json only (no hardcoded nodes)
   - Hover tooltip: recipe name + country flag/category
   - Click → navigates to the recipe page URL (verify route pattern matches `src/pages/recipes/[...]`)
   - Responsive: works at 375px width (mobile) and desktop
   - Empty-state message when a category has 0 items (post-prune reality)
4. **Scientific panel (scientific.astro)**:
   - Keep ONLY scientific sections (nutritional database, ingredient chemistry, analytics)
   - REMOVE any recipe-card grids or cooking-content blocks that duplicate the recipes area
   - Counts in tables must be computed from actual data files, not hardcoded numbers
5. **ReviewPanel.astro**: hide/disable any review workflow UI not meant for public visitors

## Acceptance Criteria (COMMAND-VERIFIABLE)
- [ ] `cd site && npm run build` — exit 0, no error lines in output
- [ ] `grep -ri "china" site/src site/scripts | wc -l` == 0 (or only in generated JSON rebuilt by scripts)
- [ ] `grep -c "graph-data" site/src/components/GraphExplorer.astro` >= 1 (loads real data)
- [ ] No hardcoded recipe counts: spot-check scientific.astro tables are computed or removed
- [ ] Mobile check: CSS/tailwind breakpoints present for graph container (`grep -c "sm:\|md:" site/src/components/GraphExplorer.astro` >= 1)
- [ ] `git status --porcelain` lists only intended modified files before PR

## DO NOT touch
- `dishes/**`, `ingredients/**`, `tips/**` content files (data is settled after prune)
- `.github/workflows/*`
- Root package.json (deps already cleaned)

## Anti-Hallucination Guard ⚠️
1. READ each component fully before editing — match existing Astro/Tailwind patterns
2. Do NOT invent new npm deps; work with what's installed in site/package.json
3. If build fails on something outside your scope, document it in PR body — do not hack around silently
4. English UI strings only (site language is English/Spanish; NO Chinese strings anywhere)
5. Verify every internal link you touch resolves to an existing page/route

## Verification
```bash
cd site && npm install && npm run build  # must exit 0
npx astro preview &  # manual smoke: / , /graph , /scientific load 200
```

## Effort
Medium (2-4h) — build fixes first, then UI polish.
