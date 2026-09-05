---
title: "RFC 001: Rust Core Unification"
type: DOCUMENTATION
agent: architect
status: proposal
created: 2025-12-16
---

# 🏗️ RFC 001: Unifying Git-Core Protocol into a Rust Monolith

## 1. Problem Statement
The current implementation of Git-Core Protocol suffers from **fragmentation complexity**:
- **38+ Scripts**: Mixed PowerShell (`.ps1`) and Bash (`.sh`) implementation requires dual maintenance.
- **Heavy CI Logic**: Workflows like `workflow-validator.yml` contain 24KB of YAML logic that cannot be tested locally.
- **Dependency Hell**: Users need Python, PowerShell, specialized modules, and Git configurations to start.
- **Inconsistent UX**: Some features are in scripts, others in generic tools, others in GitHub Actions.

## 2. The Solution: `git-core` Binary
We propose migrating all logic to a single, statically linked Rust binary (`git-core`).

### 2.1 Why Rust?
- **Tokio Runtime**: Native support for parallelizing heavy tasks (e.g., "Atomicity Check" + "Telemetry" + "Context Sync" running simultaneously).
- **Single Binary**: No dependencies. Works on Linux (Actions), Windows (Dev), and macOS.
- **Shared Logic**: The same validation logic runs on the developer's laptop `git-core validate` and in CI `git-core ci-validate`.

### 2.2 Proposed Architecture
We will use a **Workspace Pattern** to keep the codebase modular but compiled into one binary.

```
tools/git-core/
├── Cargo.toml (Workspace)
├── crates/
│   ├── git-core-cli/       # The entry point (Clap)
│   ├── git-core-config/    # Config parsing (.gitcore/ARCHITECTURE.md)
│   ├── git-core-context/   # Context management (Agent loading)
│   ├── git-core-github/    # GitHub API client (Octocrab)
│   ├── git-core-report/    # AI Reporting (Gemini/Copilot)
│   └── git-core-workflow/  # Workflow orchestration
```

### 2.3 Command Mapping
| Current Script | New Command | Benefit |
|----------------|-------------|---------|
| `init_project.ps1` | `git-core init` | Fast, cross-platform |
| `equip-agent.ps1` | `git-core context equip <role>` | Fuzzy finding, validation |
| `ai-report.ps1` | `git-core report pr <id>` | Parallel API calls to LLMs |
| `sync-issues.ps1` | `git-core issues sync` | 10x faster state sync |
| `workflow-validator.yml` | `git-core validate workflow` | Testable locally |

## 3. Migration Roadmap

### Phase 1: Core Foundation (The "Quick Win")
- [ ] Create `tools/git-core` workspace.
- [ ] Implement `init` and `check` commands.
- [ ] Implement `context` loading.
- [ ] **Goal**: Replace `install.ps1` and `equip-agent.ps1`.

### Phase 2: Workflow Migration (The "Big Lift")
- [ ] Port `workflow-orchestrator` logic to `git-core workflow`.
- [ ] Port `atomicity-checker` logic to `git-core validate`.
- [ ] Update GitHub Actions to use the binary (download release).

### Phase 3: AI & Reporting (The "Intelligence")
- [ ] Implement `report` command with Gemini/Copilot integration.
- [ ] Port `telemetry` to async Rust.

## 4. Distribution Strategy
The repository currently tries to be a "template". With this change:
- The **Repo** becomes the *Definition of Protocol* (Docs + Configs).
- The **Binary** is the *Engine*.
- **Installation**:
  ```bash
  # Installs one binary to PATH
  curl -fsSL https://git-core.dev/install | bash
  ```
- **Templates**: Users `git-core init` to pull the latest templates from the binary/CDN, not by cloning this repo.

## 5. Decision
- **Status**: PROPOSED
- **Action**: Await user confirmation to begin Phase 1.
