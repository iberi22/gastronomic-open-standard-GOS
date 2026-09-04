# AGENTS.md

This repository is automated by two agents:

- Gemini CLI (via GitHub Actions): edits recipes in small batches following `GEMINI.md`.
- Jules (GitHub App): picks up issues labeled `jules` and opens PRs autonomously.

## Gemini CLI

- Workflow: `.github/workflows/gemini-recipes.yml`
- Inputs: batch size, whether to run embeddings.
- Obeys: `GEMINI.md` style, licensing and sources.
- Only edit files listed by the batch selector output.

Recommended settings:

```json
{"model":"gemini-1.5-flash","temperature":0.2}
```

Project variables/secrets:

- `vars.GCP_PROJECT_ID`, `vars.GCP_LOCATION` (only needed when using Vertex AI auth)
- `secrets.GEMINI_API_KEY` (for Gemini API from AI Studio)

## Jules

- Install the Jules GitHub App and grant access to this repo.
- Create an issue using "Jules Task" template or add the `jules` label to any issue.
- Jules will plan, run, and open a PR. Keep tasks small and clear.

Include context for Jules:

- Goal, acceptance criteria, constraints (languages, licenses), file paths.
- Link to prior PRs or examples.

### Jules Task History

#### Completed Tasks

- ✅ **Security fixes** (Dec 9, 2025): Updated `js-yaml` (3.14.1 → 3.14.2) and `glob` to fix CVE-2025-64718 (moderate) and CVE-2025-64756 (high severity).
- ✅ **Translation Script Fix** (Issue #37, PR #40, Dec 9, 2025): Updated Gemini model to `gemini-2.5-flash`. PR closed - change applied directly in main with minor correction (removed `models/` prefix).
- ✅ **Astro Site Structure** (Issue #38, PR #41, Dec 9, 2025): Created complete `site/` directory with Astro 5.x configuration. Merged successfully!
- ✅ **GitHub Pages Deployment** (Issue #36, PR #39, Dec 9, 2025): Workflow created and merged. Required manual fix of package-lock.json dependency.

#### Failed Tasks (Limitations Identified)

- ❌ **Recipe Translation** (Issue #32, PR #34): Jules cannot create multiple new files due to environment restrictions. Error: "Unable to create files".
  - **Recommendation**: Create file structure manually first, then let Jules handle content translation.

- ❌ **GitHub Pages with Astro/Svelte** (Issue #33, PR #35): Empty PR with "known build issue". Task too complex for single iteration.
  - **Recommendation**: Break into smaller sub-tasks (setup Astro → add Svelte → configure GitHub Actions).

### Best Practices for Jules (Updated Dec 9, 2025)

#### ✅ What Works Well

1. **Single-file modifications**: Editing existing files with clear instructions
2. **Specific line changes**: "Change line X from Y to Z"
3. **Configuration updates**: Updating constants, config values, dependencies
4. **Bug fixes**: Well-defined errors with specific solutions
5. **Provided content**: Copy-paste exact file contents in issue description

#### ❌ What Doesn't Work

1. **Multiple new files**: Creating 5+ new files in one task fails
2. **Complex scaffolding**: Framework setup (Astro + Svelte + Actions)
3. **Ambiguous tasks**: "Set up authentication system"
4. **Large refactors**: Restructuring entire codebases
5. **Research-heavy**: Tasks requiring exploration and decisions

#### 📋 Issue Template for Success

```markdown
## Goal
[One sentence: what should be accomplished]

## Context
[Why this is needed, what problem it solves]

## Acceptance Criteria
- [ ] Specific measurable outcome 1
- [ ] Specific measurable outcome 2

## File(s) to Create/Modify
- `path/to/file.ext` (line X or new file)

## Specific Changes Needed
[Exact content or code snippets]

## Testing
[How to verify the changes work]

## Important Constraints
- [Language requirements]
- [Don't modify X]
- [Must preserve Y]
```

#### 🎯 Task Breakdown Strategy

**Bad** (too broad):
> "Create a recipe translation system with API integration and batch processing"

**Good** (atomic tasks):

1. Issue: "Fix script to use gemini-2.5-flash model (1 line change)"
2. Issue: "Create site/ directory structure (5 config files, exact content provided)"
3. Issue: "Add GitHub Actions workflow (1 file, exact YAML provided)"

#### 🔗 Dependencies Between Issues

When tasks depend on each other:

- Mark with `**BLOCKED BY**: Issue #XYZ` in description
- Jules will wait or inform you if dependency isn't met
- Order: structure → content → automation

### New Issues (Dec 9, 2025)

Following improved practices, created:

- **#37**: Translation script model fix (atomic, 1-line change)
- **#38**: Astro site structure (5 files, all content provided)
- **#36**: GitHub Pages workflow (1 file, blocked by #38)

## Batch selection (legacy — removed 2026-09-02)

- El pipeline root `automation/queue/select_batch.py` + `recipes_metadata.json` /
  `recipes_vectors.jsonl` fue eliminado (RAG/GPU frágil removido en d3a767a9).
- La indexación de recetas ahora la produce `site/scripts/generate-api.js` y
  `generate-graph.js` hacia `site/dist/api` y `graph-data.json`.

## Embeddings (legacy — removed 2026-09-02)

- La vectorización local (Vertex AI / `vectorize_selected.ts`) ya no corre en este
  repo. Búsquedas semánticas: Xavier (API :8006) o Cloudflare Workers AI en runtime.

## Conventions

- Branch protection: changes go via PR. Actions and agents create PRs.
- Keep prompts short. Limit batches to avoid rate limits.
- Favor idempotent scripts and append-only JSONL artifacts.

## Auto-approve & Auto-merge

- PRs labeled `automation` are auto-approved by a bot and auto-merge is enabled (squash).
- Self-approval by the author is blocked by GitHub; the bot handles approval when the label is present.
- Auto-merge only completes when all required checks are green, respecting branch protection.
- Workflows: `/.github/workflows/auto-merge.yml` and PR-side helper if needed.

<!-- SWAL-ROUTING-START -->
## SWAL Routing Minimalista (SDD Hibrido F1)
> Antes de crear `.gitcore/sdd/` aplica routing organico (gentle-ai v2.3.0).
> - **Direct inline**: 1-3 files trivial -> inline sin delegar, sin SDD
> - **Delegated direct**: 4+ files o 2+ non-trivial -> delegate_task con Xavier skill search, sin SDD
> - **Optional SDD**: ambiguedad alta -> proponer SDD opcional, si SI crear `.gitcore/sdd/specs/###-feat/onepage.md` (1 pagina spec P1 + plan HOW minimo + tasks [P])
> Ver skill `sdd-hibrido` (`~/.hermes/skills/sdd-hibrido/references/routing.md`). `rm -rf .gitcore/sdd` limpia sin tocar features.json.
<!-- SWAL-ROUTING-END -->

<!-- SWAL-REGISTRY-START -->
## Skill Registry + Xavier Indexer (F1b)
> Skills viven FUERA de `.gitcore` (global `~/.hermes/skills` + proyecto `.skills/`). GitCore solo referencia via `.atl/skill-registry.md` + cache `.skill-registry.cache.json` y opcional `.gitcore/skill-registry.json`.
> - Refresh: `~/.hermes/scripts/skill-registry-refresh.sh --cwd <proyecto>`
> - Index: `~/.hermes/scripts/xavier-index-skills.sh --cwd <proyecto>` (Xavier tags [skill])
> - Antes de delegar: `xavier_search(tags=[skill]) -> skill_view(paths)`
> Ver skills `skill-registry` y `xavier-skill-indexer`.
<!-- SWAL-REGISTRY-END -->

<!-- SWAL-SDD-START -->
## SDD One-Page + SRS Mapping
> Spec efimero `.gitcore/sdd/specs/###-feat/onepage.md` referencia `REQ-xxx` durable de `docs/SRS/REQUIREMENTS.md` (IEEE 830 reduced). Drift detector `srs-src-drift-detector` mantiene traceabilidad. Docs humanos estables en `docs/`, specs AI en `.gitcore/sdd/` aislado.
<!-- SWAL-SDD-END -->

<!-- SWAL-TAG-PROTOCOL-START -->
## Release Tag Protocol
**NUNCA** crear tag sin completar el checklist de `~/.hermes/skills/swal-tag-protocol/SKILL.md`.
- Pre-tag: working tree clean + score<7d ≥80% B gaps:[] + features HOY + CI verde + tests corridos + srs drift + CHANGELOG al día
- Evidence bundle OBLIGATORIO en `.gitcore/releases/<tag>-evidence.md` ANTES de taggear
- Incident 2026-09-04: tag v1.0.0 retirado por 8 gaps (ver `.gitcore/releases/v1.0.0-RETIRED.md`)
<!-- SWAL-TAG-PROTOCOL-END -->
