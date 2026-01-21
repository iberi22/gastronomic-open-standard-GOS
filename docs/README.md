# 📚 Git-Core Protocol - Documentation

> **Inteligente, sofisticada pero minimalista en complejidad**

This documentation follows the **[Diátaxis](https://diataxis.fr/)** framework - a systematic approach to technical documentation.

---

## 🧭 Diátaxis Framework

Our documentation is organized into **four quadrants** based on user needs:

```
                    LEARNING ←──────────→ WORKING
                        │                   │
        TUTORIALS       │    HOW-TO GUIDES  │
    (Learning-oriented) │  (Task-oriented)  │
                        │                   │
    ────────────────────┼───────────────────┼────────
                        │                   │
     EXPLANATION        │    REFERENCE      │
  (Understanding)       │  (Information)    │
                        │                   │
                   THEORY ←──────────→ PRACTICE
```

### 📖 [Tutorials](./tutorials/) - Learn by doing

**When:** You're new to Git-Core Protocol
**Goal:** Learn through guided lessons
**Examples:**

- Your first issue workflow
- Setting up a project from scratch
- Creating atomic commits

### 🎯 [How-To Guides](./how-to/) - Get things done

**When:** You know what you want, need to know how
**Goal:** Solve specific problems
**Examples:**

- How to export a session
- How to set up automation
- How to create a custom agent

### 📚 [Reference](./reference/) - Look up facts

**When:** You need precise information
**Goal:** Find accurate technical details
**Examples:**

- Commit message standard
- CLI command reference
- Configuration options

### 💡 [Explanation](./explanation/) - Understand context

**When:** You want to understand "why"
**Goal:** Deepen your knowledge
**Examples:**

- Why GitHub Issues instead of files
- The philosophy behind the protocol
- Trust and transparency principles

---

## 🤖 For AI Agents

**[Agent Documentation](./agent-docs/)** - Technical specifications for AI agents

| Directory | Purpose |
|-----------|---------|
| **[specs/](./agent-docs/specs/)** | System specifications |
| **[research/](./agent-docs/research/)** | Technical research |
| **[prompts/](./agent-docs/prompts/)** | Reusable prompts |
| **[sessions/](./agent-docs/sessions/)** | Session archives |

---

## 🚀 Quick Start (By Your Goal)

### "I want to learn Git-Core Protocol"

👉 Start with **[tutorials/](./tutorials/)**

### "I need to do something specific"

👉 Check **[how-to/](./how-to/)**

### "I need to look up a detail"

👉 Search **[reference/](./reference/)**

### "I want to understand the design"

👉 Read **[explanation/](./explanation/)**

### "I'm an AI agent"

👉 See **[agent-docs/](./agent-docs/)**

---

## 📖 GitHub Wiki

We maintain a **GitHub Wiki** as a mirror of the human-readable documentation. The wiki provides:

- 🔗 Easy navigation with sidebar
- 🔍 Search functionality
- 📱 Mobile-friendly interface
- 🌐 Public access

**Access the Wiki:** [github.com/iberi22/Git-Core-Protocol/wiki](https://github.com/iberi22/Git-Core-Protocol/wiki)

The wiki is synchronized automatically from the `docs/wiki/` directory.

---

## 📝 Documentation Philosophy

### Principle: Separation of Concerns

| Type | For Whom | Location | Format |
|------|----------|----------|--------|
| **Guides** | Humans learning the system | `docs/guides/` | Tutorial-style, friendly |
| **Specs** | AI agents implementing features | `docs/agent-docs/specs/` | Technical, precise |
| **Reference** | Everyone looking up details | `docs/wiki/` | Encyclopedia-style |
| **Setup** | New users installing | `docs/setup/` | Step-by-step, no jargon |

### Documentation Types (Diátaxis Framework)

| Type | Purpose | Example |
|------|---------|---------|
| **Tutorials** | Learning-oriented | "Your first issue workflow" |
| **How-To Guides** | Problem-oriented | "How to create atomic commits" |
| **Reference** | Information-oriented | "Commit standard reference" |
| **Explanation** | Understanding-oriented | "Why GitHub Issues instead of TODOs?" |

---

## 🤝 Contributing to Documentation

### When to Create Documentation

✅ **DO create** when:

- User explicitly asks: "Create a guide for..."
- New feature needs explanation
- Common question needs answer
- Tutorial would help onboarding

❌ **DON'T create** when:

- Tracking tasks (use GitHub Issues instead)
- Taking notes (use issue comments)
- Planning (use issues with `ai-plan` label)

### Where to Put New Documentation

| Content Type | Directory |
|--------------|-----------|
| Tutorial or guide for humans | `docs/guides/` |
| Installation/setup instructions | `docs/setup/` |
| Reference documentation | `docs/wiki/` |
| AI agent prompt | `docs/agent-docs/prompts/` |
| Technical specification | `docs/agent-docs/specs/` |
| Research or analysis | `docs/agent-docs/research/` |

### YAML Frontmatter (Required for agent-docs/)

All files in `agent-docs/` **MUST** include YAML frontmatter:

```yaml
---
title: "Document Title"
type: GUIDE | SPEC | RESEARCH | PROMPT | ANALYSIS | REPORT
id: "unique-id"
created: 2025-12-07
updated: 2025-12-07
agent: copilot | jules | gemini | codex
model: claude-sonnet-4 | gemini-3-pro | gpt-5.1
requested_by: user | system
summary: |
  Brief description of the document
keywords: [keyword1, keyword2, keyword3]
tags: ["#tag1", "#tag2"]
project: Git-Core-Protocol
---
```

See [agent-docs/README.md](./agent-docs/README.md) for full specification.

---

## 📊 Documentation Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Total Documents | ~50 | 📈 Growing |
| For Humans | ~15 | ✅ Good Coverage |
| For AI Agents | ~35 | 🤖 Rich Context |
| Wiki Pages | ~10 | 🚀 In Progress |

---

## 🔗 External Resources

- **Main Repository:** [github.com/iberi22/Git-Core-Protocol](https://github.com/iberi22/Git-Core-Protocol)
- **GitHub Wiki:** [github.com/iberi22/Git-Core-Protocol/wiki](https://github.com/iberi22/Git-Core-Protocol/wiki)
- **Issues Tracker:** [github.com/iberi22/Git-Core-Protocol/issues](https://github.com/iberi22/Git-Core-Protocol/issues)
- **Discussions:** [github.com/iberi22/Git-Core-Protocol/discussions](https://github.com/iberi22/Git-Core-Protocol/discussions)

---

*Last updated: December 2025*
