# GOS data storage — the repo is the database

GOS has no database. The data collections are JSON files committed in this
repo; git history is the audit trail.

## Layout

```
site/src/content/<collection>/[<group>/]<slug>.json
```

Collections stored as JSON: `ingredients`, `vitamins`, `substances`,
`conditions`, `mixtures`, `diets`. (`dishes` and `tips` are prose documents and
stay Markdown.)

Each file is one record: the schema fields at top level (see the zod schemas in
`site/src/content.config.ts`), plus an optional `body_md` string with the
Markdown prose shown on the page. Format: UTF-8, 2-space indent, trailing
newline, stable key order.

The public API (`site/public/api/v1/*`) is generated from these files by
`scripts/export-v1.mjs` (run as part of `pnpm --filter gos-site build`).

## Add a record

1. Create `site/src/content/<collection>/<slug>.json` with the required fields
   (e.g. `name`; mixtures also need `ingredients`).
2. Put long prose in `body_md`.
3. Validate (below), then open a PR.

Writers (seed/enrich scripts, `scripts/studies_updater.py`) emit the same format.

## Validate

```
node scripts/md_to_json.mjs --check   # no .md left, every JSON passes its schema
pnpm --filter gos-site test
pnpm --filter gos-site build
```

`node scripts/md_to_json.mjs` converts any stray `<slug>.md` (frontmatter +
body) to `<slug>.json` and deletes the Markdown.
