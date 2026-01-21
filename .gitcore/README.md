# Git-Core Protocol - Project Configuration

This directory contains the Git-Core Protocol configuration and state for this project.

## 📁 Files

| File | Purpose | Edit? |
|------|---------|-------|
| `ARCHITECTURE.md` | Critical decisions and system design | ✅ Yes - Document key decisions |
| `AGENT_INDEX.md` | Available AI agent roles | ⚠️ Carefully - Only if adding custom roles |
| `features.json` | Feature tracking (Anthropic pattern) | ✅ Yes - Update test results |
| `CLI_CONFIG.md` | Git-Core CLI configuration | ⚠️ Rarely |
| `CONTEXT_LOG.md` | Session context history | 🤖 Auto-generated |

## 🚀 Daily Workflow

### 1. Check Current State
```bash
gc status           # Protocol-aware git status
gc issue list       # View assigned tasks
```

### 2. Load Context for Task
```bash
gc context equip <role>     # Load agent persona
# Example: gc context equip backend-architect
```

### 3. Work on Task
```bash
# Make your changes
# Run tests
```

### 4. Commit Changes
```bash
gc commit "feat: description #issue-number"
# Or use legacy: git commit -m "feat: description #issue-number"
```

### 5. Create Pull Request
```bash
gh pr create --fill
gc report           # Generate AI analysis of PR
```

## 📋 ARCHITECTURE.md - Critical Rules

**ALWAYS check this file before implementing features!**

The "CRITICAL DECISIONS" table contains non-negotiable choices:
- **Hosting:** GitHub Pages (not Vercel/Netlify)
- **Backend:** Supabase (if needed)
- **State:** GitHub Issues (not TODO.md)

**Rule:** If an issue mentions alternatives, ARCHITECTURE.md wins.

## 📊 features.json - Feature Tracking

Track feature health with Anthropic's pattern:

```json
{
  "id": "feat-my-feature",
  "passes": true,           // ← Does it work?
  "verified_by": "npm test", // ← How to test?
  "github_issue": 42        // ← Related issue
}
```

**Health Check Protocol:**
```bash
# Before new feature
cat .gitcore/features.json | jq '.features[] | select(.passes == false)'

# If any show up → FIX FIRST before adding new features
```

## 🔄 Protocol Improvement Workflow

This project contributes improvements back to Git-Core Protocol:

### Method 1: Automatic (Weekly)
1. Create issue with label `protocol-improvement`
2. Weekly workflow collects all labeled issues
3. Summary sent to `iberi22/GitCore`

### Method 2: Manual (Immediate)
```bash
gh workflow run protocol-feedback.yml \
  -f feedback_type=bug \
  -f title="Installation fails on X" \
  -f description="Detailed description..." \
  -f priority=high
```

### Method 3: Direct Issue
Use GitHub template: `.github/ISSUE_TEMPLATE/protocol-improvement.md`

## 🎯 Agent Roles

Available in `AGENT_INDEX.md`:

| Domain | Roles Available |
|--------|----------------|
| Engineering | AI Engineer, Backend Architect, DevOps, Frontend, Mobile, Test Fixer |
| Product & Design | Brand Guardian, UI Designer, UX Researcher, Feedback Synthesizer |
| Marketing | Content Creator, Growth Hacker, Social Media Strategist |
| Project Management | Experiment Tracker, Project Shipper, Studio Producer |

**Usage:**
```bash
gc context equip backend-architect
# Now work with that persona's context
```

## 🛠️ Maintenance Commands

### Update Protocol
```bash
# Check for updates
./scripts/check-protocol-update.ps1

# Upgrade safely
curl -fsSL https://raw.githubusercontent.com/iberi22/Git-Core-Protocol/main/install.ps1 | iex
```

### Verify Installation
```bash
gc check            # Validate protocol integrity
cat .git-core-protocol-version  # Check version
```

### Export Session
```bash
./scripts/export-session.ps1 -Topic "feature-name" -Summary "What I'm working on"
# Creates: docs/prompts/SESSION_2026-01-20_feature-name.md
```

## 🚨 Emergency: Protocol Not Working?

1. **Check version:**
   ```bash
   cat .git-core-protocol-version
   ```

2. **Verify files exist:**
   ```bash
   ls .gitcore/
   ls .github/agents/
   ls scripts/
   ```

3. **Report issue:**
   ```bash
   gh workflow run protocol-feedback.yml \
     -f feedback_type=bug \
     -f title="Protocol error: [description]" \
     -f description="Full details..." \
     -f priority=high
   ```

4. **Fallback to manual:**
   If CLI broken, use GitHub Issues directly:
   ```bash
   gh issue create --title "Task" --body "Description"
   gh issue list
   ```

## 📚 Further Reading

- **Protocol Repo:** https://github.com/iberi22/GitCore
- **Full Documentation:** https://github.com/iberi22/GitCore/tree/main/docs
- **Agent Guide:** `.github/copilot-instructions.md`
- **Commit Standard:** `docs/COMMIT_STANDARD.md` (if exists)

---

*Last updated: 2026-01-20*
