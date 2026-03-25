# CLAUDE.md - Gastronomic Open Standard (GOS)

## Project Overview

**Gastronomic Open Standard (GOS)** is an open-source initiative to establish a rigorous, scientifically structured format for documenting global culinary knowledge. It provides a data-driven culinary database with scientific accuracy suitable for API integration.

## Quick Start & Build Commands

### Root Project (Data & Tools)

- **Install dependencies:** `npm install`
- **Generate README index:** `npm run build`
- **Lint markdown:** `npm run markdownlint`
- **Full linting suite:** `npm run lint` (runs markdownlint and custom logic)

### Astro Website (`site/` directory)

- **Install dependencies:** `npm ci` (within `site/`)
- **Development server:** `npm run dev`
- **Build website:** `npm run build`
- **Verify protocol:** `npm run verify:protocol`

## Architecture & Directory Structure

- `dishes/`: Hierarchical recipe storage (e.g., `dishes/colombian/andina/ajiaco/`).
- `ingredients/`: Detailed ingredient profiles categorized by type (e.g., `legumes/`, `proteins/`).
- `site/`: Astro.js frontend and static site generator.
- `automation/`: Python automation scripts (recipe auditing, translation, batch selection).
- `.github/workflows/`: CI/CD for site deployment and automated recipe enrichment via Gemini.
- `docs/`: Supplementary documentation.

## Tech Stack

- **Frontend:** Astro 5.x, Tailwind CSS, D3.js.
- **Automation:** Python 3.11+, Gemini API (via `google-generativeai`).
- **Data Format:** Markdown with complex YAML frontmatter.
- **Runtime:** Node.js v20/v22.

## Key Coding Patterns & Standards

### Scientific Recipe Standard

Recipes must follow the standard defined in `PLAN_DE_ESTANDARIZACION.md`:

- **Frontmatter:** Must include `ingredients_detailed` (linked to `ingredients/`), `nutrition_per_serving`, and `sensory` profiles.
- **Structure:** Scientific accuracy is prioritized over narrative.

### File Naming & Conventions

- Use lowercase with underscores for directories and filenames.
- Recipe files should end with a trailing newline.
- Content in `dishes/` is managed as an Astro content collection with flexible schema (`z.any()`).

### Automation & Workflow

- **Gemini Agent:** Automates recipe enrichment in batches. Requires `GEMINI_API_KEY`.
- **Jules Agent:** Handles specific GitHub issues labeled `jules`.
- **PR Workflow:** All changes should go through Pull Requests.

## Common Automation Commands

- **Audit recipes:** `python automation/audit_recipes.py`
- **Translate recipes:** `python automation/translate_recipes.py`
- **Select batch:** `python automation/queue/select_batch.py`
