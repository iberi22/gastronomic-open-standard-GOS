# Security Updates

## January 2026

### Date: January 21, 2026

#### devalue - High Severity (Memory Exhaustion DoS)

- **Package**: devalue
- **Previous Version**: 5.6.0
- **Fixed Version**: 5.6.2
- **Issue**: Denial of Service vulnerability due to memory/CPU exhaustion in `devalue.parse`
- **Impact**: High - Could cause server crashes or resource exhaustion
- **Resolution**: Updated via `npm install devalue@5.6.2`
- **Verification**: Build successful (130 pages in 5.15s)

#### diff (jsdiff) - Low Severity (parsePatch DoS)

- **Package**: diff
- **Previous Version**: 5.2.0
- **Fixed Version**: 5.2.2
- **Issue**: Denial of Service vulnerability in parsePatch and applyPatch methods
- **Impact**: Low - Limited attack surface in static site generation
- **Resolution**: Updated via `npm install diff@5.2.2`
- **Verification**: Zero breaking changes detected

**Commit**: `f47b36e6` - security: fix 2 high-severity vulnerabilities (devalue, diff)

---

## December 2025

#### CVE-2025-64718 (js-yaml) - Moderate Severity

- **Package**: js-yaml
- **Previous Version**: < 3.14.2
- **Fixed Version**: 3.14.2
- **Issue**: Prototype pollution in YAML merge (`<<`) operator
- **Impact**: Moderate
- **Resolution**: Updated dependency via `npm update`

#### CVE-2025-64756 (glob) - High Severity

- **Package**: glob
- **Previous Version**: >= 10.2.0, < 10.5.0
- **Fixed Version**: 10.5.0
- **Impact**: High
- **Resolution**: Updated dependency via `npm update`

## Verification

Audit completed on December 9, 2025:

```bash
npm audit
# Result: found 0 vulnerabilities
```

## Automated Security

This repository uses:

- **Dependabot**: Automated dependency updates with security alerts
- **GitHub Security Advisories**: Monitors for known vulnerabilities
- **Auto-merge workflow**: PRs labeled `automation` are auto-approved when checks pass

## Security Policy

1. All security updates are applied within 48 hours of disclosure
2. Critical vulnerabilities are addressed immediately
3. Dependencies are reviewed quarterly
4. Security audit runs on every PR

## Related PRs

- #31: Automated Dependabot PR for js-yaml updates (merged Dec 9, 2025)

## Next Steps

- Continue monitoring Dependabot alerts
- Regular dependency updates via `npm update`
- Consider implementing npm audit in CI/CD pipeline
