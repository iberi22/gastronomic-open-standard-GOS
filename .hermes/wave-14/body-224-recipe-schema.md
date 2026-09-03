# [Wave 14.01] feat-recipe-schema-homogenize — Standardize frontmatter across all dishes/ collections

> Wave 14 — Infrastructure.
> Labels: `wave-14`, `ola14`, `data-quality`
> Branch: `fix/recipe-schema-standardization` (create from main)

---

## Current State (MEASURABLE)

- `dishes/` root: **508 .md recipes** across 19 region subdirectories (colombian, china, peruvian, etc.)
- `site/src/content/dishes/`: **509 recipes** (synced from dishes/ via sync-recipes.mjs)
- **Frontmatter inconsistency** across collections:
  - `source_repo:` — 103 recipes (china only, other collections missing)
  - `source_url:` — 0 recipes (no direct URL to original recipe)
  - `language:` — 129 recipes (most china recipes, most colombian/peruvian missing)
  - `difficulty:` — 455 recipes (inconsistent format: ★★★ vs "Alta" vs "Media")
  - `source:` (structured object) — 0 recipes
- **Sample china recipe** (`dishes/china/.../tomato_beef_soup.md`):
  ```yaml
  source_repo: "Anduin2017/HowToCook"   # repo name only, no URL
  language: "zh"
  difficulty: "★★★"                      # 3-star, no trailing ☆
  ```
- **Sample colombian recipe** (`dishes/colombian/arepa.css.md`):
  ```yaml
  title: "Ají Negro (Salsa Amazónica Fermentada)"
  region: "Amazonía"
  # NO source_repo, NO source_url, NO language
  difficulty: (not found in this file)
  ```

## Desired State (DELTA)

A unified frontmatter schema for ALL recipes in `dishes/`:

```yaml
---
title: "Recipe Title (in original language)"
region: "colombian|china|peruvian|..."
language: "es|zh|pt|en"          # ISO 639-1 code, REQUIRED
license: "MIT"                    # all GOS content is MIT
source:
  name: "Anduin2017/HowToCook"   # repo or site name
  url: "https://github.com/Anduin2017/HowToCook/blob/master/dishes/..."  # direct link
  date_retrieved: "2026-09-03"
category: "sopas|carnes|ensaladas|..."
difficulty: "★★★☆☆"              # always 5-star scale, trailing ☆ for empty stars
prep_time: "30 min"
cook_time: "1 hour"
servings: 4
tags:
  - cuisine_china
main_ingredients:
  - "Name (original lang)"
  - "Name (English)"
sensory:
  flavor: []
  texture: []
  aroma: []
---
[Recipe body content — DO NOT MODIFY]
```

## Web Research Required

1. search: "GitHub API get file raw content from specific commit SHA"
2. search: "Anduin2017/HowToCook GitHub raw file URL format"
3. search: "frontmatter YAML schema validation CI hook 2026"

## Agent Session Prompt

"Before implementing, please:
1. Survey 5 random recipes from each collection (china, colombian, peruvian, brazilian) to understand the full range of frontmatter variations
2. Read `site/scripts/sync-recipes.mjs` to understand how dishes/ syncs to site/src/content/dishes/
3. Identify all distinct frontmatter key variations (e.g., `difficulty` has how many different value formats?)
4. Decide on a Python script approach vs direct sed/awk vs Python script for the batch migration
5. Document the exact transformations needed per collection"

## Existing Code Patterns

- Migration script: `site/scripts/sync-recipes.mjs` — uses hash-based dedup and fs operations
- Seed scripts: `site/scripts/seed-vitamins-conditions-diets.mjs` — structured YAML frontmatter generation
- Schema definitions: `site/src/content.config.ts` — zod schemas for each content type

## Acceptance Criteria (VERIFIABLE BY COMMAND)

- [ ] `grep -L "^language:" dishes/*/*/*.md 2>/dev/null | wc -l` == 0 (every recipe has language)
- [ ] `grep -L "^source:" dishes/*/*/*.md 2>/dev/null | wc -l` == 0 (every recipe has source object)
- [ ] `grep -L "^difficulty:" dishes/*/*/*.md 2>/dev/null | wc -l` == 0 (every recipe has difficulty)
- [ ] All 103 china recipes have `source.url` pointing to Anduin2017/HowToCook GitHub raw URL
- [ ] All difficulty values are on 5-star scale: exactly `★{1,5}☆{0,4}` pattern
- [ ] `grep "source_repo:" dishes/*/*/*.md 2>/dev/null | wc -l` == 0 (source_repo migrated to source.url)
- [ ] Recipe body content preserved (use `grep -c "^#" dishes/colombian/nacionales/*.md` to verify headings exist)
- [ ] `pnpm --filter gos-site exec astro check 2>&1 | grep "0 errors"` — no TypeScript regressions
- [ ] `pnpm --filter gos-site test 2>&1 | grep "All tests passed"` — no test regressions
- [ ] `pnpm --filter gos-site build 2>&1 | grep "✓ Completed"` — build still works

## Files to Modify

| File | Current State | Change | Risk |
|------|-------------|--------|------|
| `dishes/china/*/*.md` | 103 files, source_repo only | Add `source.url`, migrate `source_repo→source.name`, fix difficulty | MEDIUM |
| `dishes/colombian/*/*/*.md` | ~120 files, no source | Add `source`, `language: "es"`, normalize difficulty | MEDIUM |
| `dishes/peruvian/*/*.md` | ~23 files, partial | Add `source`, `language: "es"`, normalize difficulty | MEDIUM |
| `dishes/brazilian/*/*.md` | ~10 files, partial | Add `source`, `language: "pt"`, normalize difficulty | LOW |
| `dishes/chilean/*/*.md`, `dishes/cuban/*/*.md`, `dishes/dominican/*/*.md`, `dishes/puerto-rican/*/*.md` | ~10 each | Add `source`, `language: "es"`, normalize difficulty | LOW |
| `dishes/argentinian/*/*.md` | ~10 files | Add `source`, `language: "es"`, normalize difficulty | LOW |
| `site/scripts/normalize-schema.mjs` | NEW | Python/JS script for batch frontmatter migration | LOW |

**Total files: ~320 across 8 collections**

## DO NOT touch (Anti-Regression)

- `site/src/content/dishes/` — synced from dishes/ automatically; do NOT edit directly
- Recipe body content (text after `---` frontmatter delimiter)
- `site/src/content.config.ts` — schema definitions
- `site/scripts/sync-recipes.mjs` — sync mechanism
- `node_modules/` or lockfiles
- `site/src/pages/` or `site/src/components/`

## Anti-Hallucination Guard

1. **BACKUP before modifying**: Run `cp -r dishes dishes_backup` before starting
2. **READ each file before modifying**: Preserve all existing frontmatter keys not being normalized
3. **No invented URLs**: Derive `source.url` for china recipes from `source_repo` value only (https://github.com/{source_repo}/blob/master/dishes/...)
4. **If source cannot be determined**: Use `source.url: "pending"` with a `source.notes` field
5. **Test on 3 files first**: Run the normalization on 3 files manually before running the batch script
6. **Verify body preserved**: Use `wc -l` before and after to confirm no content loss

## PR Delivery Requirements (ANTI-EMPTY-PR)

- [ ] `git status --porcelain` shows ≥50 files modified
- [ ] `git diff --stat HEAD` shows non-empty diff across all collections
- [ ] PR contains ≥8 collection directories touched (one per region)
- [ ] `wc -l` of sample recipe bodies unchanged before/after

## Dependencies & Merge Order

- **Depends on:** NONE (independent, foundational)
- **Blocked by:** NONE
- **Parallel with:** #225 (e2e-tests) — different file islands
- **Merge order within wave:** [1] (schema must be stable before E2E tests run)
- **Expected effort:** Large (4-6h) — ~320 files across 8 collections

## Failure Recovery

| If this happens | Action |
|----------------|--------|
| Script corrupts YAML | Restore from `dishes_backup/` |
| Astro build fails after schema change | Revert, test on 3 files, re-diagnose |
| source_repo URL derivation is wrong | Use `source.url: "pending"` for those files |
| Lockfile conflicts | Do NOT update lockfile; this is a content-only change |
