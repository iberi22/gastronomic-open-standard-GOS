## SKILL CONTEXT FOR THIS TASK

You are working on a GOS (Gastronomic Open Standard) PWA project. This is a complex Astro 5 PWA with TypeScript.

### codex Skill
Read: C:\Users\belal\clawd\skills\codex\SKILL.md

---

## TASK

Perform a comprehensive code review of the GOS PWA implementation at `E:\scripts-python\gastronomic-open-standard-GOS\site`

### Review Scope
1. **Code Quality & Patterns**
   - TypeScript usage (types, interfaces, any滥用)
   - Astro component architecture
   - Error handling
   - Code duplication (DRY violations)

2. **Security Audit**
   - XSS vulnerabilities (innerHTML, dangerouslySetInnerHTML)
   - CSRF considerations
   - Data exposure (private user data)
   - Input validation
   - CSP headers if missing

3. **Performance**
   - Bundle size
   - Image optimization
   - Lazy loading
   - Service worker efficiency

4. **UX/UI Anomalies**
   - Mobile responsiveness
   - Accessibility (a11y)
   - Loading states
   - Error states
   - Empty states

5. **Architecture Gaps**
   - Missing error boundaries
   - Incomplete features (placeholders marked "coming soon")
   - Missing API routes
   - GunDB integration issues

6. **PWA Compliance**
   - manifest.json completeness
   - Service worker caching strategy
   - Offline functionality
   - Installability

### Output Format
Provide a structured report:
```
## Findings

### 🔴 Critical
[Security issues, bugs causing crashes]

### 🟠 High
[Performance issues, missing error handling]

### 🟡 Medium
[Code smells, DRY violations, UX issues]

### 🟢 Low
[Nice-to-have improvements]

## Recommended Fixes (Priority Order)
[List of actionable fixes with file paths]
```

Working dir: `E:\scripts-python\gastronomic-open-standard-GOS\site`