# GOS Discussions — Knowledge Anchored

This repo uses **GitHub Discussions** as the PWA sharing layer for points of view on recipes, ingredients and substances.

- Category: `gos-knowledge` (create via repo Settings → Discussions → Categories)
- Every `site/src/pages/substances/[...slug].astro` and recipe/ingredient page links footer: “Discutir en GitHub Discussions” → `https://github.com/iberi22/gastronomic-open-standard-GOS/discussions/new?category=gos-knowledge&title=[Substance] <name>`
- Guides: `docs/SCIENTIFIC_INGREDIENT_PROTOCOL.md`, `SCIENTIFIC_RECIPE_PROTOCOL.md`, `site/src/lib/seo.ts`
- Graph: `site/public/graph-data.json` (1282 nodes) — substances 43→73 after GOS-03
- Paywall: agents use `POST /api/agent/pay {tier: "socio"}` → JWT via `site/src/lib/billing.ts` D1/KV (`site/wrangler.toml` bindings: R2 gos-site-r2, D1 gos-billing, KV SESSION+SWAL_KV, AI)

Moderation: keep language in English for code/docs, Spanish OK for Discussions. Anti-censorship: Xavier = generic agent memory, Maloca Analytics = enterprise layer (never mention Xavier in product narratives).
