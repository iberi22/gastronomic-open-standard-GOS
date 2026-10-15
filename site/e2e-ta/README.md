# tester-army/e2e Smoke Suite for GOS

This directory contains the deterministic smoke test suite for `gos-site` using the [`tester-army/e2e`](https://github.com/tester-army/e2e) framework.

## Installation & Setup

Ensure Node.js `^22.22.3 || >=24.8.0` is used.

Dependencies added:
- `e2e`: `0.20.0`
- `@e2e-dev/web`: `0.14.0`

Install Playwright browser binaries if needed:
```bash
pnpm exec playwright install chromium
```

## Running the E2E Suite

### Local Target
Build the site first, then run local suite against preview server (`http://127.0.0.1:0`):

```bash
pnpm --filter gos-site build
pnpm --filter gos-site run e2e:ta
```

### Live Target
Run against the live deployment (`https://gos.swal.network`):

```bash
pnpm --filter gos-site run e2e:ta:live
```

---

## Sandbox Run Report

| Journey | Local (`astro preview`) | Live (`https://gos.swal.network`) | Notes |
| --- | --- | --- | --- |
| 1. Home opens with GOS heading | **PASSED** (978ms) | **PASSED** (1.99s) | Verified heading role with GOS |
| 2. Ingredients index lists entries & detail page opens | **PASSED** (1.28s) | **PASSED** (3.35s) | Opens `/ingredients/` and taps Ajo detail page |
| 3. Recipes index lists entries & detail page opens | **PASSED** (1.72s) | **PASSED** (3.86s) | Opens `/recipes/` and taps Ajiaco detail page |
| 4. Graph page renders container | **PASSED** (1.89s) | **PASSED** (2.15s) | Verified heading / canvas container |
| 5. Unknown route shows 404 page | **PASSED** (544ms) | **PASSED** (1.11s) | Verified 404 heading rendering |
| 6. Public JSON endpoint under `/api/` answers with valid JSON | **PASSED** (201ms) | **PASSED** (848ms) | Verified `/api/index.json` returns valid JSON object |

Total: **6/6 passed** on both targets.

---

## Persona Charters for Agentic Bug Bash (`e2e explore`)

1. **Dr. Elena Vance (Nutritional Scientist)**: Navigates scientific pages and ingredient detail entries to verify that active compounds, micronutrient values, and DOI reference citations render accurately and without broken external links.
2. **Marco Rossi (Culinary Historian & Chef)**: Explores regional recipe catalogs, searching for authentic dish titles and verifying that main ingredients match traditional preparations across different countries.
3. **Sora Kim (Interactive Graph Explorer)**: Toggles graph filters and node types on the global graph page to test WebGL canvas responsiveness, node pan/zoom interactions, and detail panel drawer popups.
4. **Alex Rivera (Mobile Web Accessibility Auditor)**: Uses screen readers and keyboard navigation across mobile viewports to ensure header navigation, language selectors, search inputs, and theme toggles are fully accessible.
5. **Javier Mendez (Offline PWA & API Integration Developer)**: Tests offline PWA behavior and `/api/` endpoints (`/api/index.json`, `/api/health`, `/api/countries`) to confirm data schemas, valid JSON structures, and service worker caching strategy.
