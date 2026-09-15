# GOS Content Expansion Strategy — i18n + research por país + pipeline científico

> Sesión expansión 2026-09-07/08 (BELA). Idioma del doc: español (decisión de usuario).
> Estado: ESTRATEGIA VIVA — este archivo manda sobre TRANSLATION_GUIDE.md (zh→es, parcial)
> y RECIPE_COMPLETENESS_REPORT.md (superseded por scoring 2026-09-07: 273/405 12/12).

## 1. Enfoque (decisiones BELA, no supuestas)

1. **Contenido nativo, no traducido a máquina**: cada país se investiga EN SU IDIOMA
   (queries nativas + prensa local). La traducción automática es ayuda de borrador,
   nunca fuente.
2. **Todo con fuentes**: Wikipedia (edición en el idioma del país) como primaria,
   Grokipedia (xAI, IA-generada, oct-2025) como terciaria con cross-check, prensa
   local en idioma nativo como respaldo. URLs reales — `url: pending` PROHIBIDO.
3. **Correlación total**: cada receta nueva enlaza química de alimentos
   (compuestos), sustancias (fichas), grafo (aristas), papers (resumen + DOI).
4. **Sin inventar**: tiempos redondos del texto, nutrición solo con fuente,
   fotos solo reales/LFS. Duda → report, nunca frontmatter.

## 2. Oleada 1 — 1 issue Jules por idioma+país (7)

| # | Idioma | País (supuesto) | Foco |
|---|--------|-----------------|------|
| 1 | EN | United States | sureño/BBQ/criollo + food-chemistry USDA |
| 2 | ES | Mexico | moles/antojitos/aguas + cocina prehispánica |
| 3 | PT | Brazil | feijoada/moqueca + frutos amazónicos |
| 4 | ZH | China | 8 cocinas regionales + fermentos/tés |
| 5 | HI | India | curries/ayurveda + especias (papers) |
| 6 | BN | Bangladesh | pescado/curry + mostaza fermentada |
| 7 | JA | Japan | washoku/umami/dashi + fermentos (miso/shoyu) |

Cada issue: ≥15 platos NUEVOS + ≥5 mezclas/pociones (tónicos, fermentos, caldos
medicinales → colección `mixtures/` o subdir bebidas), frontmatter estándar
(gold: `dishes/colombian/amazonia/aji_negro/aji_negro.md`; reglas:
`site/src/lib/recipe-standard.ts`), schema `site/src/content.config.ts`,
árbol canónico **`dishes/` (raíz)** — NUNCA `site/src/content/dishes/`
(generado, lo borra el build; lección #270→#271).

## 3. Top-15 idiomas → locales (fuente: Wikipedia/Ethnologue totales, orden 5-15 varía)

en · zh · hi · es · ar · fr · bn · ru · pt · ur · id · de · ja · mr · te
(≈1.5B … ≈95M hablantes). `site/src/lib/locales.ts` ya trae 22 (incluye id+mr
desde esta sesión). ES canónico; resto vía §4.

## 4. Modelo local de Chrome — research profundo (2026-09-08)

**Qué es**: Gemini Nano on-device + APIs web estándar:
- `window.Translator` (¡NO `window.ai.translator`, deprecado!): `Translator.availability({sourceLanguage, targetLanguage})`
  → `'available'|'downloadable'|'downloading'|'unavailable'`; `Translator.create({...mismas opts, monitor})`
  + `t.translate(text)`. Shipped Chrome 138 desktop; Edge 148+.
- `window.LanguageDetector`: `LanguageDetector.create({expectedInputLanguages})` + `detect(text)`
  → `[{detectedLanguage, confidence}]`.
- Paquetes de idioma se descargan 1 vez por par (con red, con GESTO de usuario);
  luego funciona offline. Sin API key, gratis, privado.

**Cómo lo usamos**:
- (a) UI runtime: `TranslateMenu` + `site/src/lib/chrome-translate.ts` (PR #265).
  Lotes ≤800 chars, progreso, restore, fallback honesto.
- (b) Borradores de contenido: Jules/traductores lo usan como primer pase;
  el texto final exige fuente nativa (§1). Nunca publicar crudo.
- (c) Detección de idioma entrante (papers/queries) con LanguageDetector.

**Límites medidos**: solo Chrome/Edge escritorio (sin móvil/Firefox/Safari);
calidad varía por par (pares chicos, peor); contexto HTTPS o localhost;
segmentación por frase puede variar (nuestro reparto proporcional lo asume).

## 5. Fuentes oficiales — política

1. Wikipedia edición del idioma (`en./es./pt./zh./hi./bn./ja.wikipedia.org`) + Wikidata (QIDs).
2. Grokipedia (terciaria, cross-check obligatorio con 1).
3. Prensa local en idioma nativo (periódicos por país, ver issues de oleada).
4. Papers: PubMed/Crossref (DOI obligatorio) → colección estudios + aristas.
5. PROHIBIDO: URLs `pending`, homepages como `image:`, hotlinks sin licencia,
   fotos inventadas, números nutricionales sin fuente.

## 6. ¿Migrar .md → .json? Opinión técnica (NO migrar)

Evidencia del repo: el diseño YA es md-canónico + JSON-generado
(`generate-api.js` con gray-matter → `public/api/**`; `copy-content.js`
raíz→site; schema zod en `content.config.ts`; 1013 páginas).
- **Prosa + frontmatter** (.md) es lo correcto para recetas: narrativa, review
  humano en PR, diffs legibles, builds reproducibles.
- **.json** ya existe como capa de consumo (API + grafos). Duplicar fuente de
  verdad (md Y json editables) = divergencia garantizada (lección #270→#271
  a otra escala).
- Lo que SÍ falta: endurecer schema (hoy `.passthrough()` traga basura:
  `pending`, homepages) + `pending` como valor ilegal en CI + tipos por
  colección. Eso es 1 PR chico, no una migración.
- Veredicto: **NO migrar; NO eliminar .md**. Endurecer zod + tests de
  contenido (extender `audit-dish-coverage.py` a ilegal-values gate).

## 7. Jobs diarios de papers → issues Jules (diseño)

- Script `site/scripts/schedule-jules-research.mjs` (stdlib): lee
  `docs/research/queue.json` (cola rotativa: sustancias, química, deep-dives
  regionales, papers), crea 1 issue/día con template canónico vía `gh`
  (requiere `GH_TOKEN` en entorno del cron), haciendo toggle de label `jules`
  solo tras verificar secciones, y avanza la cola.
- Cron diario 06:00 UTC (harness local). Side-effect = issues en GitHub
  (funciona aunque el output del cron sea local-only).
- Cada issue diario: 3-5 papers (PubMed/Crossref, DOI) → resumen + aristas a
  sustancias/recetas + actualización de fichas. ACs por comando (grep DOI,
  astro check, audit).

## 8. Refactor docs — mapa (ejecutar en orden)

| Doc | Veredicto |
|-----|-----------|
| Este archivo | CANÓNICO de expansión |
| `TRANSLATION_GUIDE.md` | EXTENDER (solo zh→es; absorber convención `.es.md` aquí o viceversa) |
| `SCIENTIFIC_RECIPE_PROTOCOL.md` + `SCIENTIFIC_INGREDIENT_PROTOCOL.md` + `INGREDIENT_PROTOCOL.md` | UNIFICAR en 1 protocolo (solapan filosofía/estructura) |
| `RECIPE_COMPLETENESS_REPORT.md` | ELIMINAR (superseded por scoring 2026-09-07) |
| `SENSORY_DATA_TODO.md` | ELIMINAR o absorber (sensory 377/377) |
| `wiki/` (Home.md) + `docs/` how-to/tutorials | UNIFICAR índice (2 sistemas paralelos) |
| `archive/` + `SRS/` + `SWAL/` + `PLAN_*.md` en site/ | ARCHIVAR con fecha (históricos, no borrar: git los guarda) |
| `GRAPH_DATABASE_PROPOSAL.md` + `graph-explorer.md` | UNIFICAR (propuesta ya ejecutada: sigma) |
| `METODOLOGIA.md` + `AGENTS.md` + `CONTRIBUTING*` | UNIFICAR puerta de entrada contribuidor |
| `PROTOCOLO_RECOLECCION_DATOS_VIDEO.md` | REVISAR vigencia con BELA (¿sigue el plan video?) |
| `ingredient_chemistry.md` + `nutritional_database.md` + `recipe_analytics.md` | Absorber en protocolo unificado o `reference/` |
