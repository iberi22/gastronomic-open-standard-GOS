# SRC — Source Code Reference — gastronomic-open-standard-GOS

> **Protocol:** GitCore 3.8.0
> **Updated:** 2026-11-02
> **Completeness:** structure matches the tree measured on this date

## 1. Overview

GOS es un grafo abierto de gastronomía. El repositorio público es la base: recetas, ingredientes, vitaminas, sustancias, dietas y condiciones. La licencia del proyecto es AGPL-3.0-or-later desde 2026-10-15.

No es una base mundial cerrada. Las cifras vivas salen de `python3 docs/corpus-stats.py` y quedan en `docs/stats.json`. El titular de `README.md` las repite. A 2026-11-02 el sitio publica 19 cocinas, con peso en Colombia. `dishes/china/` existe solo en la raíz.

| Field | Value |
|-------|--------|
| Stack | Astro 7, Svelte 5, Tailwind v4, pnpm |
| Protocol | GitCore 3.8.0 |
| Visibility | public |
| Live | https://gos.swal.network |

## 2. Directory structure

```
gastronomic-open-standard-GOS/
├── AGENTS.md
├── SRC.md
├── .git-core-protocol-version
├── .gitcore/
│   ├── features.json
│   ├── leak-policy.json
│   └── planning/
│       ├── PLANNING.md
│       └── TASK.md
├── docs/
│   ├── SRS/
│   │   ├── index.md
│   │   ├── REQUIREMENTS.md
│   │   └── ARCHITECTURE.md
│   ├── corpus-stats.py
│   └── CONTENT_EXPANSION_STRATEGY.md
├── dishes/                         # espejo raíz; dishes/china/ no entra al sitio
├── ingredients/
├── tips/
├── exercises/                      # 10 JSON, 1324 registros MIT, sin imágenes
├── skills/
├── site/
│   ├── src/content/                # corpus que el sitio lee
│   │   ├── dishes/
│   │   └── ingredients/
│   └── scripts/copy-content.js     # borra site dishes/tips y copia la raíz, salta china
├── packages/
├── worker/                         # gateway en el origen canónico, sin base propia
└── scripts/
```

`site/src/content.config.ts` carga ingredientes con `**/*.json` y excluye `pending_review`. Los platos del sitio salen de `site/src/content/dishes`. `pnpm --dir site run generate` ejecuta `site/scripts/copy-content.js`, que primero borra `site/src/content/dishes` y luego copia `dishes/`. Un directorio cuyo nombre es `china` no se copia.

## 3. Core components

| Component | Path | Purpose |
|-----------|------|---------|
| Corpus publicado | `site/src/content/` | Colecciones que Astro carga |
| Espejo de platos | `dishes/` | Origen del copiado. China queda fuera |
| Ingredientes | `site/src/content/ingredients/` | JSON publicado y stubs en `pending_review/` |
| Estadísticas | `docs/corpus-stats.py` | Recuento que `docs/stats.json` debe igualar |
| Compuerta | `skills/gos-audit-gate/scripts/audit_gate.py` | Falla si una corrección se revierte |
| Sitio | `site/` | Astro 7 + Svelte 5 |
| Gateway | `worker/` | Proxy del origen canónico, sin D1 |
| Ejercicios | `exercises/` | Metadatos MIT. El arte no está en el repo |
| SRS | `docs/SRS/` | Requisitos. REQ-001 sigue en `draft` |
| Agentes | `AGENTS.md` | Orden de lectura |

## 4. Build / run / test

```bash
pnpm install
pnpm --dir site dev
pnpm --dir site run check
pnpm --dir site test
pnpm run lint
python3 docs/corpus-stats.py --check
python3 skills/gos-audit-gate/scripts/audit_gate.py
```

`pnpm --dir site run check` ejecuta `astro check`. `pnpm --dir site test` ejecuta `vitest run`. `pnpm --dir site run build` corre `prebuild` (`generate`, incluido `copy-content.js`) y después `astro check` y `astro build`.

## 5. Environment

| Variable | Purpose | Required |
|----------|---------|----------|
| `CLOUDFLARE_API_TOKEN` | Deploy del sitio. No guardar el valor en git | solo deploy |
| `DEPLOY_TARGET` | Si vale `github-pages`, `copy-content.js` prefija las URLs públicas | no |
| `ORIGIN_URL` | Origen canónico del gateway, fijado en `worker/wrangler.toml` | ya versionado |

No hay `.env.example` en la raíz. Ningún secreto va en este archivo.

## 6. SWAL integration

| Concern | Approach |
|---------|----------|
| Producto | GOS no vende acceso, llaves ni créditos |
| Pagos | Este repo no desbloquea funciones con Stripe |
| Memoria de agentes | Xavier es externo y opcional. No es la base del corpus |
| Gateway | `worker/` no tiene base de datos propia |

## 7. Cross-references

| Doc | Path |
|-----|------|
| AGENTS.md | `AGENTS.md` |
| PLANNING | `.gitcore/planning/PLANNING.md` |
| TASK | `.gitcore/planning/TASK.md` |
| SRS index | `docs/SRS/index.md` |
| Requirements | `docs/SRS/REQUIREMENTS.md` |
| Architecture | `docs/SRS/ARCHITECTURE.md` |
| Roadmap de contenido | `docs/CONTENT_EXPANSION_STRATEGY.md` |
| Skills | `skills/README.md` |

---

*Document version: 3.8.0 · Part of GitCore Protocol*
