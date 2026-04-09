# CLAUDE.md - Gastronomic Open Standard (GOS)

## Project Overview

**Gastronomic Open Standard (GOS)** is a recipe and ingredient graph standardization project with an interactive Astro web viewer at https://iberi22.github.io/gastronomic-open-standard-GOS/

## Tech Stack

- **Frontend**: Astro + Svelte + TailwindCSS (site/)
- **Content**: Markdown recipes in `dishes/` (colombian/, chinese/, peruvian/)
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
│   ├── colombian/       # Colombian recipes (110+)
│   ├── chinese/         # Chinese recipes (49)
│   └── peruvian/        # Peruvian recipes
├── gos/                # Graph ontology (ingredients, dishes, techniques)
├── scripts/            # Build scripts (build_graph.py, copy-content.js)
├── .github/
│   ├── agents/         # Multi-agent system (architect, code-review, etc.)
│   ├── workflows/      # CI/CD (deploy-astro.yml, ci.yml)
│   └── issues/         # Project issues
└── automation/         # Recipe processing automation
```

## Build & Deploy

```bash
# Build locally
cd site && npm ci && npm run build

# Deploy (automatic on push to main)
git push origin main
# GitHub Actions → deploy-astro.yml → GitHub Pages
```

## API Endpoints (generated at build)

- `/api/index.json` - All recipes
- `/api/spanish/colombia.json` - Colombian recipes
- `/api/chinese/china.json` - Chinese recipes
- `/api/countries/[country].json` - By country

## Multi-Agent System

The `.github/agents/` directory contains SWAL's multi-agent protocol:
- `architect.agent.md` - Architecture decisions
- `code-review.agent.md` - PR reviews
- `pr-creator.agent.md` - PR creation
- `workflow-manager.agent.md` - Workflow orchestration

## Important Notes

- Protocol compliance is verified at build time (`npm run verify:protocol`)
- 160 recipes, 159 with full metadata
- Deploy uses GitHub Pages (not custom domain)
- Branch protection: `main` requires PR + 1 review
