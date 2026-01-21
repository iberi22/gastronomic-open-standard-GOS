---
title: "PLAN: Git-Core Protocol CLI v1.0 Roadmap"
labels:
  - enhancement
  - cli
  - rust
  - v1.0-roadmap
assignees: []
---

## 🎯 Goal
Finalize the `git-core-cli` (Rust) as the primary interface for the protocol, replacing legacy shell scripts as the recommended method.

## 🏗️ Architecture Analysis
The current CLI is well-structured using a hexagonal/adapter pattern:
- **Core**: `gc-core` (Business logic)
- **adapters**: `gc-adapter-fs`, `gc-adapter-github`, `gc-adapter-system`
- **Interface**: `gc-cli` (Clap v4)

## 🧩 Gap Analysis

### 1. Feature Gaps
- [ ] **`gc workflow`**: Currently a stub. Needs to integrate with `gc-validator` to lint/run workflows.
- [x] **`gc check`**: Add a "doctor" command to verify environment health (GH token, Git config, dependencies).
- [x] **`gc next`**: Automated agent dispatcher (Prioritization + Branching + Agent Selection).
- [ ] **`gc context`**: Ensure it fully supports the new `.github/agents` structure (Agent v2).

### 2. Distribution
- [ ] **Binaries**: Automate release builds for Windows/Linux/macOS via `release.yml`.
- [ ] **Install Script**: Ensure `install.ps1` and `install.sh` download the correct binary version. (Partially done).

### 3. Documentation
- [ ] **CLI Man Page**: Generate markdown docs for all commands.
- [ ] **Migration Guide**: Guide for moving from scripts to CLI.

## 📅 Roadmap to v1.0

### Phase 1: Core Stability (Current)
- ✅ `gc init`: Project scaffolding.
- ✅ `gc task`: Issue-branch binding.
- ✅ `gc finish`: PR automation.

### Phase 2: Refinement & Developer Experience
- [x] Implement `gc check` (Doctor).
- [x] Implement `gc next` (Dispatcher).
- [ ] Polish error messages (use `color-eyre` everywhere).
- [ ] Add `gc feedback` command to open GitHub issues with logs.

### Phase 3: Agent Integration
- [ ] Integrate local LLM execution capabilities (optional feature flag).
- [ ] Deep integration with `context-research-agent`.

## 📝 Immediate Action Items
1. Audit `task.rs` and `finish.rs` for edge cases.
2. Create "Good First Issue" tickets for `gc doctor`.
3. Set up a "nightly" build workflow.
