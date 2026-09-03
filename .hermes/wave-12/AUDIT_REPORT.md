# GOS Maturity Audit — Wave 12 (2026-09-02)

> Auditor: Hermes (Maturity v8 dimensiones) · Repo: `iberi22/gastronomic-open-standard-GOS` @ `04f4e120`
> Stack actual: Astro 7.2.10 + Svelte 5 + @swal/ui + Tailwind 4.1 + Cloudflare Pages (Git integration) · pnpm 11.24 monorepo

## 📊 Scorecard — 8 dimensiones (modelo `swal-maturity` v1)

| Dimensión | % real | Evidencia |
|-----------|-------:|-----------|
| 1. FRONTEND (UI/UX) | **72%** | 12 páginas públicas + 12 componentes. Cero facetas/búsqueda textual en /recipes ni /ingredients. Paginación ausente en /ingredients (solo primeros 60). |
| 2. BACKEND (API) | **55%** | 4 endpoints (ai/infer, agent/pay, agent/knowledge, substances.json). Falta CRUD real para `recipe/ingredient/vitamin/condition/diet/substance` (el `domain.ts` es in-memory y no se invoca desde rutas). |
| 3. DATA / PERSISTENCE | **40%** | 1 migración D1 (billing). SurrealAdapter es **stub HTTP** sin endpoint real. IndexedDB adapter es TODO. Vitamin=1 record, condition=1 record, diet=1 record (vs home dice 40+/35+/5). Drift: `dishes/` root=508, `site/src/content/dishes/`=406 (102 recetas no se buildean). |
| 4. SMART CONTRACTS | N/A | — |
| 5. TESTING | **60%** | 30 unit tests (vitest) ✅ 6/6 files pass. 3 e2e (Playwright) sin correr en CI. Cobertura real <30% en domain/config/agentDomain. |
| 6. INFRASTRUCTURE | **75%** | CI verde, pnpm 11.24, deploy CF Pages via Git integration. Falta: monitoring real (Sentry), smoke post-deploy, IA conformance check (drift scanner). |
| 7. DOCUMENTATION | **65%** | SRS en `docs/SRS/`, AGENTS.md completo, README en /site. Faltan: cookbook de contribución por región, spec del grafo (edges canon), docs API endpoints. |
| 8. MOBILE (PWA) | **50%** | vite-plugin-pwa con workbox, manifest, sw.js. Sin offline real para ingredientes (IndexedDB adapter sin implementar). |

**Score global: 60% (Beta — usable, gaps críticos en backend + data + search).**

## 🔍 Top 5 gaps identificados (criterio CRITICAL/HIGH)

### Gap #1 — Drift de contenido: 102 recetas en root NO llegan al build
**Severidad: HIGH**
- Root `dishes/` tiene **508 .md** (incluye subcarpetas `brazilian/cuban/dominican/puerto-rican/argentinian/chilean/china` con 103-122 archivos cada uno).
- Build de Astro usa `site/src/content/dishes/` que tiene **406 .md**.
- El script `copy-content.js` está documentado pero la ejecución se saltó para los waves Jules (PR #196 top20 catalog) — solo copiaron los 20 marcados.
- **Impacto**: 102 recetas (~20% del total) son **invisibles** en el sitio público. El catálogo se ve incompleto vs la realidad del repo.

### Gap #2 — Vitamin/condition/diet: 1 record cada uno, contradice claims
**Severidad: HIGH (data quality)**
- `site/src/content/vitamins/` = 1 file (`Vitamina C`, 4 líneas).
- `site/src/content/conditions/` = 1 file (`placeholder`).
- `site/src/content/diets/` = 1 file (`placeholder`).
- `site/src/content/substances/` = 30 ✅.
- Home de `index.astro` línea 24-29 muestra "40+ Vitaminas", "35+ Afecciones", "5 Dietas".
- **Impacto**: la promesa de marketing está **inflada** vs el contenido. El grafo genera nodos fantasma de 1 sola entidad.

### Gap #3 — Cero búsqueda / filtros en /recipes y /ingredients
**Severidad: HIGH (UX crítico)**
- `site/src/pages/recipes/index.astro`: muestra solo 80 recetas estáticas, los "filtros" son `<span class="pill">` no clickeables.
- `site/src/pages/ingredients/index.astro`: muestra solo 60 ingredientes, slice hardcoded, sin filtro.
- Componente `SearchBar.astro` **existe** (157 líneas, astro components) **pero NO se usa en ningún index page** (grep `SearchBar` en `site/src/` → 0 imports).
- `ingredients/index.astro` línea 14: `sorted.slice(0,60)` hardcoded.
- **Impacto**: con 553 ingredientes y 508 recetas, sin búsqueda el sitio es **inutilizable** para discovery. El usuario tiene que scrollear.

### Gap #4 — CRUD backend ausente: domain.ts no se invoca
**Severidad: CRITICAL (funcional)**
- `site/src/lib/domain.ts` define `createEntity/listEntities/getEntity/updateEntity/deleteEntity` con MemoryAdapter funcional.
- `site/src/lib/agentDomain.ts` envuelve con Xavier + mesh.
- **PERO** ninguna ruta Astro invoca estos helpers. Solo `site/src/pages/api/agent/pay.ts` (billing) usa `domainConfig` indirectamente.
- SurrealDB adapter (`site/src/lib/surreal.ts`) es **stub HTTP** que apunta a `EDGE_HIVE_URL` que no existe.
- Workers AI (`site/workers/ai.ts`) está bien, pero `domain.ts` no se conecta a D1.
- **Impacto**: la "infra agentic 100%" (Xavier + mesh + domain) que el repo promete **no funciona end-to-end**. La home dice "Xavier memoria + mesh P2P" pero no hay ningún flow real que pase por las 3 capas.

### Gap #5 — PWA offline falso: no hay IndexedDB adapter
**Severidad: MEDIUM (PWA)**
- `vite-plugin-pwa` configura workbox con `runtimeCaching` solo para `api.swal.dev` (que tampoco existe).
- `mesh.ts` usa `y-indexeddb` correctamente para sincronización de mesh.
- `domain.ts` **NO** tiene IndexedDB adapter. Comentario explícito línea 12: "Storage adapters: Memory (tests) -> IndexedDB (PWA offline) -> SurrealDB via edge-hive (prod). El modelo de negocio no habla a Surreal directo".
- Comentario en `surreal.ts` línea 18: "IndexedDB adapter placeholder (Fase 4 Yjs) — por ahora memory es suficiente para build verde."
- **Impacto**: el service worker cachea HTML/CSS/JS pero no hay datos offline. App pierde contenido si conexión se cae después de cargar.

## 📋 Métricas duras (verificadas 2026-09-02 23:56 UTC)

```
vitest:        6 files, 30/30 passing (1.96s)
astro check:   0 errors, 0 warnings, 67 hints (TS implicit any en .map)
pnpm audit:    0 vulns
eslint:        no config para site/, no corre
playwright:    3 specs no ejecutados en este árbol
coverage:      <30% estimado (solo site/src/lib/*.test.ts)
```

## 🎯 Wave 12 propuesta — 5 issues profesionales

| # | Issue | Dimensión | Esfuerzo | Riesgo | Paralelizable |
|---|-------|-----------|----------|--------|---------------|
| 12.01 | feat-recipe-sync-pipeline — copiar 102 recetas huérfanas root→site/content | DATA | M | LOW | sí |
| 12.02 | feat-vitamin-condition-diet-seed — poblar 23 vitaminas + 35 conditions + 5 diets (datos desde USDA + PubMed abstracts) | DATA | L | MED | sí |
| 12.03 | feat-search-filters-recipes-ingredients — integrar SearchBar + facetas (region/group/condition) | FRONTEND | M | LOW | sí |
| 12.04 | feat-domain-crud-api — wire domain.ts a endpoints Astro (/api/recipes, /api/ingredients, /api/conditions) + persist D1 | BACKEND | L | HIGH | sí (con #12.05) |
| 12.05 | feat-indexeddb-adapter-domain — IndexedDB storage adapter con fallback a Memory (offline PWA) | DATA/PWA | M | MED | sí |

### File islands verificados (no overlap)
- 12.01: `site/scripts/copy-content.js`, `dishes/<region>/*.md`, `site/src/content/dishes/<region>/*.md`
- 12.02: `site/src/content/vitamins/*.md`, `site/src/content/conditions/*.md`, `site/src/content/diets/*.md`, `scripts/harvest_ingredients.py`
- 12.03: `site/src/components/SearchBar.astro`, `site/src/pages/recipes/index.astro`, `site/src/pages/ingredients/index.astro`
- 12.04: `site/src/lib/domain.ts`, `site/src/pages/api/recipes/*.ts`, `site/src/pages/api/ingredients/*.ts`, `site/migrations/002_*.sql`
- 12.05: `site/src/lib/domain.ts`, `site/src/lib/indexeddb.ts` (NEW), `site/src/lib/worker-ai.example.ts` (mock fallback)

### Merge order recomendado
1. **12.04** primero (define API contract que otros pueden consumir)
2. **12.05** en paralelo con **12.04** (storage adapter)
3. **12.03** depende de **12.04** (SearchBar consulta API)
4. **12.02** y **12.01** independientes, pueden ir en paralelo

## 📚 Referencias cruzadas
- `docs/SRS/REQUIREMENTS.md` REQ-005 (Xavier), REQ-007 (entity isolation)
- `site/src/lib/domain.config.ts` líneas 12-104 (10 entities declaradas)
- `.gitcore/features.json` (5 features legacy, desactualizadas vs realidad post-02-sep)
- AGENTS.md líneas 47-52 (limitaciones Jules con archivos nuevos — 5+ falla)