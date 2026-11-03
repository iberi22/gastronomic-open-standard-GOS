# GOS — Gastronomic Open Standard

[![CI](https://github.com/iberi22/gastronomic-open-standard-GOS/actions/workflows/ci.yml/badge.svg)](https://github.com/iberi22/gastronomic-open-standard-GOS/actions/workflows/ci.yml)
[![License: AGPL-3.0-or-later](https://img.shields.io/badge/license-AGPL--3.0--or--later-blue)](./LICENSE)

An open knowledge graph of world gastronomy: **recipes ↔ ingredients ↔ vitamins ↔
bioactive substances ↔ flavors ↔ techniques ↔ health conditions ↔ diets ↔ regions**.
The repo files are the database, with measured counts: **541 dishes** in Markdown, and
ingredients as JSON — **144 published ingredients**, **510 pending review** stubs kept
out of the published collection, and **36 with non-zero nutrition** (published records
whose `nutrition_per_100g` carries at least one value above zero) — verified by
`python3 docs/corpus-stats.py` into `docs/stats.json`. Built with Astro 7 + Svelte 5 + Tailwind v4.

Live: **https://gos.swal.network** (Cloudflare Pages, single canonical deploy)

## Agent skills

Repo skills live in [`skills/`](skills/README.md) at the repository root. That file is the index. Run the gate before calling an audit finding fixed:

```bash
python3 skills/gos-audit-gate/scripts/audit_gate.py
```

| Skill | Use |
|---|---|
| `gos-audit-gate` | Fail if a corrected finding regresses. Blocked gaps stay printed. |
| `gos-nutrition-source` | Add nutrition only with a real publisher id. |
| `gos-publish-reviewed-dish` | Publish one reviewed dish. Do not copy `dishes/china/`. |
| `gos-license-corpus` | Keep dish front matter and third-party notices aligned. |
| `gos-review-queue` | Re-read pull requests and issues. Do not merge them. |

## Role in the SWAL ecosystem

GOS is the open information repository of the SWAL ecosystem: open data and
schemas that SWAL apps (Fize, GARA-G, BioHuman, OrionHealth...) read. The
business models live in those apps, not here: GOS sells no access, no keys, no
tiers and no AI credits.

## Purpose

1. **Humans**: browse recipes/ingredients/science with an interactive graph
   (`/graph`), PWA offline-first.
2. **Agents & apps**: consume the data as an open, keyless JSON API with an
   anonymous rate limit (30 req/min/IP on every route). GOS sells no access: no keys, no tiers,
   no AI credits. AI-first SEO (`llms.txt`, JSON-LD, sitemap) makes GOS the #1
   extraction source.

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

## Security

Please see our [Security Policy](./SECURITY.md) for information on supported versions and how to report vulnerabilities privately.

## Free API (no key, fair use)

Base `https://gos.swal.network/api` — `index.json`, `all.json`,
`countries` (18, top colombian 122), `by-country/<c>.json`, `spanish/*.json`,
`ingredients/variants.json`, `substances.json`, `health`, `entities/*`.
Full reference: [API_README.md](./API_README.md). The gateway is keyless: no API
keys, no tiers, no paid access (owner decision, 2026-10-15).

## Vectors & embeddings (bulk download, live)

Versioned snapshot over live collections (552 ingredients, 495 dishes,
30 substances), regenerated each build by `site/scripts/export-vectors.mjs`.
These figures are the export snapshot, not measured nutrition coverage:

- Manifest: `https://gos.swal.network/api/vectors/index.json`
  (model, dim, counts, version)
- Shards: `/api/vectors/vectors-1.json`, `vectors-2.json`
- Record: `{ id, type: "ingredient"|"dish"|"substance", text, embedding }`
- Spot-check: cosine(ajo, garlic) > 0.8

## Ecosistema

GOS es la fuente de datos de comida para los proyectos del ecosistema SWAL:

- **Fize** — datos de recetas e ingredientes para la plataforma de hosteleria.
- **swal-training** — material de capacitacion basado en el dataset de GOS.
- **OrionHealth** — integracion de datos de alimentos y salud (ingredientes,
  bioactivos, vitaminsas y condiciones de salud).

Los consumidores y el contrato de datos se describen en
[docs/CONSUMERS.md](./docs/CONSUMERS.md).

## Contribute

Content: copy a template, keep YAML front-matter schema
(`docs/INGREDIENT_PROTOCOL.md`), run `pnpm run lint` before push.
Pre-commit hook runs Biome + `astro check` (wired via `pnpm run prepare`).
Small Jules-ready tasks live in GitHub issues (label `jules`).
History preserves the HowToCook fork (thanks to its contributors).

## License

AGPL-3.0-or-later (GNU Affero General Public License v3 or later) — see
[LICENSE](./LICENSE). It applies to the whole repository since 2026-10-15: data
(recipes, ingredients, schemas), site, worker and packages.

Third-party content keeps its own licence and is listed with its full notice in
[NOTICE.md](./NOTICE.md): the exercise catalogue metadata from
`hasaneyldrm/exercises-dataset` (MIT) and artwork from `bryllim/workout-guide`
(CC BY-SA 4.0). The illustration files are not in this repository.
[NOTICE](./NOTICE) records the licence lineage: the project
started from HowToCook (Unlicense / public domain), later MIT (2025-07),
CC BY-NC 4.0 (2025-12), AGPL-3.0 (2026-08), Apache-2.0 (2026-10-02), and now AGPL-3.0-or-later.
