# CLAUDE.md - Gastronomic Open Standard (GOS)

## Project Overview

**Gastronomic Open Standard (GOS)** is a recipe and ingredient graph standardization project with an interactive Astro web viewer at https://gos.swal.network (Cloudflare Pages)

## Tech Stack

- **Frontend**: Astro + Svelte + TailwindCSS (site/)
- **Content**: Markdown recipes in `dishes/<country>/` (20 country folders) and ingredients in `ingredients/<group>/`; published copies in `site/src/content/`
- **Graph**: Python scripts in `scripts/build_graph*.py`
- **Multi-agent**: GitHub Agents system in `.github/agents/`
- **Protocol**: Scientific recipe standardization in `dishes/`

## Key Directories

```
gastronomic-open-standard-GOS/
├── site/               # Astro web app
│   ├── src/
│   │   ├── components/  # Astro/Svelte components
│   │   ├── pages/       # Routes (index, recipes, graph, search)
│   │   └── layouts/     # Page layouts
│   └── dist/            # Built output (auto-generated)
├── dishes/             # Recipe source files
│   └── <country>/       # 20 folders (american … thai), 613 .md; 495 published
├── gos/                # Graph ontology (ingredients, dishes, techniques)
├── scripts/            # Build scripts (build_graph.py, copy-content.js)
├── .github/
│   ├── agents/         # Multi-agent system (architect, code-review, etc.)
│   ├── workflows/      # CI/CD (ci.yml, deploy-cloudflare.yml, deploy-worker.yml)
│   └── issues/         # Project issues
└── automation/         # Recipe processing automation
```

## Build & Deploy

```bash
# Build locally
cd site && npm ci && npm run build

# Deploy (automatic on push to main)
git push origin main
# GitHub Actions → deploy-cloudflare.yml → Cloudflare Pages (gos.swal.network)
```

## API Endpoints (generated at build)

- `/api/index.json` - All recipes
- `/api/by-country/[country].json` - By country
- `/api/v1/` - Versioned contract for consumers (see docs/CONSUMERS.md)

## Multi-Agent System

The `.github/agents/` directory contains SWAL's multi-agent protocol:
- `architect.agent.md` - Architecture decisions
- `code-review.agent.md` - PR reviews
- `pr-creator.agent.md` - PR creation
- `workflow-manager.agent.md` - Workflow orchestration

## Important Notes

- Protocol compliance is verified at build time (`npm run verify:protocol`)
- 495 published recipes, 552 ingredient cards (515 still `pending_review`)
- Deploy uses Cloudflare Pages at gos.swal.network
- Branch protection: `main` requires PR + 1 review
