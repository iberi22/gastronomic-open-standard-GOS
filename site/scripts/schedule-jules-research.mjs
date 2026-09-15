#!/usr/bin/env node
/**
 * site/scripts/schedule-jules-research.mjs — job diario: programa 1 issue
 * de investigación científica para Jules y avanza la cola.
 *
 * Uso: `node site/scripts/schedule-jules-research.mjs [--dry-run]`
 * Requiere: `gh` autenticado (usa su propio keyring), repo root como cwd
 *   o GOS_REPO env. Todo stdlib, sin dependencias.
 *
 * Flujo: lee docs/research/queue.json → toma entry con status=pending (la de
 * menor `day`) → crea issue con template canónico (label gos-daily, SIN jules)
 * → verifica 13 secciones → aplica label jules → marca done con issue number.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const DRY = process.argv.includes('--dry-run')
const REPO =
  process.env.GOS_REPO ||
  '/home/belal/proyectosSWAL/apps/gastronomic-open-standard-GOS'
const QUEUE = path.join(REPO, 'docs/research/queue.json')

function gh(...args) {
  return execFileSync('gh', args, { cwd: REPO, encoding: 'utf-8' }).trim()
}

function bodyFor(e) {
  return `# feat-daily-research-${e.id} — ${e.title}

> Ola GOS-DAILY — Scientific research linkage. Labels: \`gos-daily\` (sin \`jules\` todavía)
> Merge order: daily | Risk: LOW | Effort: Small <1h

---

## Current State (MEDIBLE)

- Queue entry: \`${e.id}\` — ${e.topic} (${e.lang} sources).
- Collections: \`dishes/\` (ROOT canonical), \`site/src/content/mixtures/\`, \`site/src/content/substances/\`.
- Gold mixture (studies shape): \`site/src/content/mixtures/curcuma-pimienta-negra.md\`.
- Strategy: \`docs/CONTENT_EXPANSION_STRATEGY.md\` §1 (native sources), §5 (sources policy).

## Desired State (DELTA)

- **Research**: ${e.brief}
- **Output**: ${e.output} (resumen en español + datos crudos citados).
- **Linkage**: ${e.linkage}
- Risk: LOW — research + summaries only; content edits limited to studies[] additions with DOI.

## 🌐 Web Research Required

**MANDATORY — in ${e.lang} unless noted.**
1. search: "${e.q1}"
2. search: "${e.q2}"
3. search: "${e.q3}"
4. search: "${e.q4}"

## 🔬 Agent Session Prompt

"Before implementing, please:
1. Research the 4 queries above — ${e.lang} sources for context, EN ok for papers.
2. Read the gold mixture file + strategy §5 (no pending URLs, DOI mandatory).
3. Document findings (paper list with DOIs) before editing."

## Existing Code Patterns (MUST follow)

- \`site/src/content/mixtures/curcuma-pimienta-negra.md\` → studies[] {title, source, year, doi, url}
- \`docs/CONTENT_EXPANSION_STRATEGY.md\` §5 → source hierarchy

## Acceptance Criteria (VERIFICABLES POR COMANDO)

- [ ] Studies added have DOI: \`grep -rh "doi" <touched files> | wc -l\` >= ${e.min_dois}
- [ ] \`grep -rn "pending" <touched files> | wc -l\` == 0
- [ ] Every new URL starts with https:// (spot check in PR body)
- [ ] \`pnpm --filter gos-site exec astro check 2>&1 | grep -E " errors"\` 0 errors
- [ ] \`gh pr view <NUM> --json files --jq '.files | length'\` >= 1

## Files to Modify

| File | Current State | Change | Risk |
|------|--------------|--------|------|
| ${e.targets} | existing | studies[] additions + summaries | LOW |

## DO NOT touch (Anti-Regression)

- \`site/src/content/dishes/**\` (generated); \`nutrition:\` values (never invent); \`image:\` URLs; code/config; other mixtures.

## Anti-Hallucination Guard ⚠️

1. DOI resolvable (https://doi.org/...) or OMIT the study.
2. Summaries in Spanish, faithful to abstract; no health claims beyond paper.
3. Real URLs only. 4. Never empty PR (blocked → comment).

## PR Delivery Requirements (ANTI-EMPTY-PR)

- [ ] status/diff non-empty BEFORE PR; PR ≥1 file
- [ ] PR body lists papers + DOIs

## Verification

\`\`\`bash
grep -rh "doi" <touched files> | wc -l  # >= ${e.min_dois}
pnpm --filter gos-site exec astro check 2>&1 | grep -E " errors"
\`\`\`

## Dependencies & Merge Order

- **Depends on:** main. **Parallel:** safe (studies-only). **Effort:** Small <1h.

## Failure Recovery

| If this happens | Action |
|----------------|--------|
| DOI dead | drop study, note in PR |
| check fails | fix, no broken commits |
| conflicts | rebase + re-verify |
`
}

function main() {
  const q = JSON.parse(fs.readFileSync(QUEUE, 'utf-8'))
  const next = q.entries
    .filter((e) => e.status === 'pending')
    .sort((a, b) => a.day - b.day)[0]
  if (!next) {
    console.log(
      'QUEUE-EMPTY: all entries done — refill docs/research/queue.json',
    )
    return
  }
  const title = `feat-daily-research-${next.id} — ${next.title}`
  console.log(`NEXT: ${next.id} — ${title}`)
  if (DRY) {
    console.log('DRY-RUN: issue NOT created. Body preview:')
    console.log(`${bodyFor(next).slice(0, 400)}...`)
    return
  }
  const url = gh(
    'issue',
    'create',
    '--title',
    title,
    '--body',
    bodyFor(next),
    '--label',
    'gos-daily',
  )
  console.log(`CREATED: ${url}`)
  const num = url.split('/').pop()
  const body = gh('issue', 'view', num, '--json', 'body', '--jq', '.body')
  const sections = body.split('\n').filter((l) => l.startsWith('## ')).length
  console.log(`SECTIONS: ${sections}`)
  if (sections < 11) {
    console.log(
      'VERIFY-FAIL: <11 sections, jules label NOT applied. Fix template.',
    )
    process.exitCode = 2
    return
  }
  gh('issue', 'edit', num, '--add-label', 'jules')
  console.log(`DISPATCHED: #${num} labeled jules`)
  next.status = 'done'
  next.issue = Number(num)
  next.dispatched_at = new Date().toISOString()
  fs.writeFileSync(QUEUE, `${JSON.stringify(q, null, 1)}\n`)
  console.log('QUEUE-ADVANCED')
}

main()
