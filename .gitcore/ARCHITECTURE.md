---
title: "System Architecture"
type: ARCHITECTURE
id: "arch-system"
created: 2025-12-01
updated: 2025-12-31
agent: copilot
model: gemini-3-pro
requested_by: system
summary: |
  Critical architectural decisions and system design.
keywords: [architecture, design, decisions, system]
tags: ["#architecture", "#design", "#critical"]
project: Git-Core-Protocol
---

# 🏗️ Architecture

## 🚨 CRITICAL DECISIONS - READ FIRST

> ⚠️ **STOP!** Before implementing ANY feature, verify against this table.
> These decisions are NON-NEGOTIABLE.

| # | Category | Decision | Rationale | ❌ NEVER Use |
|---|----------|----------|-----------|--------------|
| 1 | Hosting | GitHub Pages | Zero cost, Git-native | Vercel, Netlify, AWS |
| 2 | Backend | Supabase | BaaS, realtime | Firebase, custom API |
| 3 | State | GitHub Issues | Token economy | TODO.md, JIRA |

### How to use this table

1. **Before ANY implementation**, check if it conflicts with decisions above
2. If issue mentions alternatives (e.g., "Vercel/GitHub Pages"), the decision above WINS
3. When in doubt, ASK - don't assume

**Related Documentation:**

- `AGENTS.md` - Architecture Verification Rule
- `.github/copilot-instructions.md` - Architecture First Rule

---

## Project Context

**Project Name:** Gastronomic Open Standard (GOS)
**Description:** Open-source initiative for scientifically structured culinary knowledge database
**Repository:** <https://github.com/iberi22/gastronomic-open-standard-GOS>
**Original:** Fork/evolution of [HowToCook](https://github.com/Anduin2017/HowToCook)

## Stack

- **Language:** Node.js/TypeScript (build scripts), Python (data processing)
- **Frontend:** Astro 5.x + Svelte (site generation)
- **Content:** Markdown (recipes & ingredients), JSON (metadata)
- **Database:** GitHub Issues (state management), JSON files (structured data)
- **Infrastructure:** GitHub Actions (CI/CD), GitHub Pages (hosting)
- **AI Tools:** Gemini CLI (batch processing), Jules (autonomous tasks)

## Key Decisions

### Decision 1: GitHub Pages for Hosting

- **Date:** 2025-12-01
- **Context:** Need zero-cost, reliable hosting for static recipe database
- **Decision:** Use GitHub Pages instead of Vercel/Netlify
- **Consequences:** Free hosting, git-native deployment, no vendor lock-in. Trade-off: static only (no server-side rendering)

### Decision 2: Structured Markdown Format

- **Date:** 2025-11-15
- **Context:** Need machine-readable recipe format for AI processing
- **Decision:** YAML frontmatter + Markdown body with strict schema validation
- **Consequences:** Enables AI batch processing, metadata extraction, multilingual support. Requires validation scripts

### Decision 3: Git-Core Protocol Integration

- **Date:** 2026-01-20
- **Context:** Multiple developers, AI agents, need coordination protocol
- **Decision:** Adopt Git-Core Protocol v3.5.1 for state management
- **Consequences:** GitHub Issues as single source of truth, atomic commits enforced, AI agents coordinated. Learning curve for contributors

### Decision 2: Telemetry Migration to Rust

- **Date:** 2025-12-16
- **Context:** Telemetry logic was isolated in PowerShell, causing fragmentation and platform dependencies.
- **Decision:** Migrated client-side telemetry to `gc telemetry` command in Rust.
- **Consequences:** Unified toolchain in `gc-cli`, removed PowerShell dependency for telemetry submission. Legacy script `send-telemetry.ps1` is deprecated.

### Decision 3: CLI Unification

- **Date:** 2025-12-16
- **Context:** Multiple PowerShell scripts (`init_project.ps1`, `equip-agent.ps1`, `ai-report.ps1`) created maintenance overhead and platform lock-in.
- **Decision:** Consolidated all core workflows into `gc-cli` Rust binary (`gc init`, `gc context`, `gc report`, `gc ci-detect`).
- **Consequences:** All legacy PowerShell scripts are deprecated. Future development focuses solely on `gc-cli`.

## Project Structure

```
/
├── dishes/           # Recipe database (Colombian, Peruvian, etc.)
│   ├── colombian/    # Regional structure (amazonia, andina, caribe, etc.)
│   └── peruvian/     # Regional structure (costa, sierra, selva)
├── ingredients/      # Ingredient database with scientific metadata
│   ├── condiments/
│   ├── proteins/
│   ├── vegetables/
│   └── _template.md  # Standard ingredient format
├── site/             # Astro static site generator
│   ├── src/          # Svelte components
│   └── public/       # Static assets
├── automation/       # AI batch processing scripts
│   ├── translate_recipes.py
│   └── queue/        # Batch selection logic
├── scripts/          # Utility scripts (Python, PowerShell)
├── docs/             # Documentation
└── .gitcore/         # Git-Core Protocol state
```

## Dependencies

| Package | Version | Purpose |
|---------|---------|----------|
| astro | 5.x | Static site generation |
| svelte | 5.x | UI components |
| @xenova/transformers | 2.17.x | AI embeddings |
| front-matter | 4.0.x | YAML parsing |
| markdownlint-cli | 0.46.x | Markdown validation |
| husky | 9.1.x | Git hooks |
| lint-staged | 15.5.x | Pre-commit linting |

## Integration Points

- **Gemini API:** Batch recipe translation and metadata extraction
- **GitHub Actions:** Automated builds, deployments, issue sync
- **Jules Agent:** Autonomous task execution for labeled issues
- **GitHub Pages:** Static site deployment

## Data Flow

```
1. Recipe Creation/Update (Manual or AI)
   ↓
2. Validation (markdownlint + schema check)
   ↓
3. Git Commit (atomic, issue-referenced)
   ↓
4. CI Pipeline (build, test, deploy)
   ↓
5. GitHub Pages (published site)
```

## Security Considerations

- GitHub tokens stored in environment variables only (`GH_TOKEN`, `GEMINI_API_KEY`)
- No secrets committed to repository
- Pre-commit hooks prevent accidental credential exposure
- API keys rotated regularly
- Dependabot enabled for security updates

## Protocol Improvement Workflow

This project actively contributes improvements back to Git-Core Protocol:

1. **Identify Issue:** During development, identify protocol limitation
2. **Create Issue:** Use `gh issue create` in **iberi22/GitCore** repo
3. **Auto-sync:** Workflow reports improvements weekly
4. **Protocol Team:** Reviews and integrates improvements

See: `.github/workflows/protocol-feedback.yml`

---
*Last updated by AI Agent: 2026-01-20*
