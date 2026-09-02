# Nuevos Alcances 2026-09 — SDD Hibrido Minimalista + Skill Registry + Xavier Indexer

> Fecha: 2026-09-01 | Plan: ~/.hermes/plans/PLAN_SDD_HIBRIDO_SPECKIT_GENTLEAI_2026-09-01.md | Estado: F1/F1b implementado, F2/F3 diferidos

## Resumen
- Routing organico (gentle-ai v2.3.0) como capa previa a .gitcore/sdd/ — evita sobre-ingenieria
- Skill registry (.atl/) + Xavier indexer (vector search) — skills como capa paralela, no dentro de .gitcore
- One-page spec opcional (1 pagina) que referencia REQ-xxx durable de docs/SRS/ (IEEE 830 reduced)

## Cambios aplicados por swal-docs-propagate.sh
- AGENTS.md: snippets routing + registry + SDD mapping (idempotentes, marcadores SWAL-*-START/END)
- .atl/skill-registry.md + .skill-registry.cache.json generados via skill-registry-refresh.sh
- .gitcore/skill-registry.json opcional para lectura GitCore
- Xavier index: ~/.hermes/scripts/xavier-index-skills.sh (tags [skill])

## Como usar
1. Antes de wave: `~/.hermes/scripts/skill-registry-refresh.sh --cwd <proyecto>`
2. Antes de delegar: `xavier_search(query=tarea, tags=[skill]) -> skill_view(paths)`
3. Al decidir: `skill_view(sdd-hibrido)` aplica routing; solo si Optional SDD y usuario SI -> crear .gitcore/sdd/specs/###-feat/onepage.md con `Related REQ: REQ-xxx`

## Trazabilidad
- SRS canon sigue en docs/SRS/REQUIREMENTS.md + drift-detector
- Spec efimero archiva post-converge, docs humanos via srs-authoring
- Hook: ~/.hermes/hooks/swal-docs-sync + cron diario 04:00 + propagate script

## Viabilidad
- Ver analisis 2026-09-01: spec-kit 1.0 intent-driven + gentle-ai index-first + ISO 29148 supersede 830 — patron A (SRS canon + spec mapea) es viable minimalista, patron C (4 templates + engine) no pasa AC1-4.
