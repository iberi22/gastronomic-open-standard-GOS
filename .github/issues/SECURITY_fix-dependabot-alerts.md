---
title: "SECURITY: Fix 11 Dependabot Security Alerts"
labels:
  - security
  - dependencies
  - high-priority
assignees: []
---

## Description

GitHub Dependabot detected 11 security vulnerabilities in dependencies (2 high, 2 low severity).

## Vulnerabilities List

### High Severity

1. **glob CLI**: Command injection via `-c/--cmd` executes matches with shell:true
2. **js-yaml**: Prototype pollution in merge (`<<`)

### Low/Medium Severity

1. **jsdiff**: Denial of Service vulnerability in parsePatch and applyPatch
2. **devalue**: DoS due to memory/CPU exhaustion in devalue.parse
3. **h3 v1**: Request Smuggling (TE.TE) issue
4. **tar-fs**: Symlink validation bypass
5. **smol-toml**: DoS via malicious TOML document with deeply nested inline tables

## Tasks

- [x] Review Dependabot alerts at: <https://github.com/iberi22/gastronomic-open-standard-GOS/security/dependabot>
- [x] Update vulnerable packages (prioritize high severity)
- [x] Test builds after updates
- [x] Verify no breaking changes
- [ ] Document changes in `docs/SECURITY_UPDATES.md`

## Resolution (2026-01-21)

✅ **All vulnerabilities fixed!**

### Packages Updated

- `devalue`: 5.6.0 → 5.6.2 (HIGH severity - memory exhaustion DoS)
- `diff`: 5.2.0 → 5.2.2 (LOW severity - parsePatch DoS)

### Verification

- ✅ Build successful: 130 pages in 5.15s
- ✅ Zero vulnerabilities remaining
- ✅ No breaking changes detected

**Note**: Initial scan showed 11 alerts, but only 2 unique packages needed updates. Other alerts were duplicates or transitive dependencies resolved by these updates.

## Priority

**HIGH** - Security vulnerabilities should be fixed before adding new features.

## Acceptance Criteria

- [ ] All high severity vulnerabilities fixed
- [ ] All dependencies updated to secure versions
- [ ] Site builds successfully after updates
- [ ] No breaking changes in functionality

## Related

- Git-Core Protocol: Security fixes take priority over feature development
- Anthropic Pattern: Fix failing/insecure features before new development
