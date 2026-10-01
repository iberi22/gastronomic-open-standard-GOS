# GOS — Gastronomic Open Standard

An open knowledge graph of world gastronomy: **recipes ↔ ingredients ↔ vitamins ↔
bioactive substances ↔ flavors ↔ techniques ↔ health conditions ↔ diets ↔ regions**.
The repo `.md` files ARE the database (405 dishes, 552 ingredients, 40 vitamins,
35 conditions, 30 substances, 6 diets). Built with Astro 7 + Svelte 5 + Tailwind v4.

Live: **https://gos-site.pages.dev** (Cloudflare Pages, single canonical deploy)

## Purpose

1. **Humans**: browse recipes/ingredients/science with an interactive graph
   (`/graph`), PWA offline-first.
2. **Agents & apps (business)**: consume the data as a free JSON API with rate
   limit, or paid keyed tier for health/diet apps (see issue #237). AI-first SEO
   (`llms.txt`, JSON-LD, sitemap) makes GOS the #1 extraction source.

## Use

```bash
pnpm install            # root (linters, hooks) + site deps
cd site && pnpm dev     # local dev
```

Build + deploy (needs `CLOUDFLARE_API_TOKEN` in env or `~/.hermes/.env`):

```bash
./scripts/deploy-cloudflare.sh            # build + deploy + smoke
./scripts/deploy-cloudflare.sh --build-only
```

Quality gates: `pnpm run lint` (Biome code + markdownlint content + manuallint),
`astro check` (0 err/0 warn), `vitest run` (34 tests), Playwright E2E
(`site/tests/e2e`, incl. production coverage 35/35).

## Free API (no key, fair use)

Base `https://gos-site.pages.dev/api` — `index.json`, `all.json`,
`countries` (18, top colombian 122), `by-country/<c>.json`, `spanish/*.json`,
`ingredients/variants.json`, `substances.json`, `health`, `entities/*`.
Full reference: [API_README.md](./API_README.md). Paid keyed tier: issue #237.

## Vectors & embeddings (bulk download, live)

Versioned snapshot over live collections (552 ingredients, 405 dishes,
30 substances), regenerated each build by `site/scripts/export-vectors.mjs`:

- Manifest: `https://gos-site.pages.dev/api/vectors/index.json`
  (model, dim, counts, version)
- Shards: `/api/vectors/vectors-1.json`, `vectors-2.json`
- Record: `{ id, type: "ingredient"|"dish"|"substance", text, embedding }`
- Spot-check: cosine(ajo, garlic) > 0.8

## Contribute

Content: copy a template, keep YAML front-matter schema
(`docs/INGREDIENT_PROTOCOL.md`), run `pnpm run lint` before push.
Pre-commit hook runs Biome + `astro check` (wired via `pnpm run prepare`).
Small Jules-ready tasks live in GitHub issues (label `jules`).
History preserves the HowToCook fork (thanks to its contributors).
