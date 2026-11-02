# TASK: GOS — gaps del informe 2026-11-02

**Last updated:** 2026-11-02
**Branch:** `develop` está 0 commits detrás de `origin/main`. El commit de honestidad sigue alcanzable desde HEAD. No hay pull request de este pase.
**Working tree:** el pase de honestidad, `skills/` y esta lista ya están en commits locales. No hay pull request de este pase.
**Gate:** `python3 skills/gos-audit-gate/scripts/audit_gate.py` → `CORRECTIONS_HOLD`, salida 0
**Índice de skills:** `skills/README.md`

## Cómo leer el estado

Cada ID tiene una sola palabra terminal.

| Estado | Significado |
|---|---|
| `done` | Cumplido en este árbol y presente en el commit local. |
| `blocked` | Sigue abierto. Cerrarlo inventando datos, copiando China o mezclando la cola incumple la auditoría. |
| `confirmed` | El hallazgo sigue siendo verdad y no es un defecto de redacción. |
| `needs-owner` | Decisión del dueño. Este pase no la ejecuta. |
| `deferred` | Sigue fuera de este pase. |

## Estados

| ID | Estado | Qué queda |
|---|---|---|
| C1 | done | El loader publicado excluye `pending_review` en `site/src/content.config.ts`. |
| C2 | done | Conteos 144 publicados, 510 pendientes, 36 con nutrición no nula en `docs/corpus-stats.py`, `docs/stats.json`, `README.md` y `README.es.md`. |
| C3 | done | B17 no es una vitamina. Aviso de cianuro conservado. `rda` y `ul` en null. `site/src/content/vitamins/b17-b17.json`. |
| C4 | done | `site/src/content/diets/placeholder.json` dice que no es una dieta. |
| C5 | done | Front matter de platos en AGPL-3.0-or-later. Cero Apache-2.0. `docs/LICENSING.md` fecha 2026-11-02. |
| C6 | done | `docs/PROJECT_GOALS.md` ya no dice MIT ni «base más completa del mundo». |
| C7 | done | `docs/nutritional_database.md` es una tabla manual. Filas numéricas intactas. |
| C8 | done | Avisos de arte alineados. `exercises/` no tiene imágenes. |
| C9 | done | Cinco skills en `skills/`. `AGENTS.md` ya no apunta a `.skills/`. |
| F1 | confirmed | 19 cocinas publicadas. Colombia tiene 109 platos. La cobertura mundial sigue siendo falsa. |
| F2 | blocked | 118 Markdown en `dishes/china/`. Salida: `skills/gos-publish-reviewed-dish`, un plato. Prohibido copiar el árbol. |
| F3 | blocked | Histograma de fuentes 617 con 0, 34 con 1, 3 con 2, 0 con 5 o más. Salida: `skills/gos-nutrition-source` con org, id y url del publicador. |
| F13 | blocked | Cola sin mezclar. `skills/gos-review-queue`. No mezclar #414, #381, #380 ni Dependabot. |
| F14 | confirmed | 69 stems de `dishes/china/` no están en el sitio. Mismo camino que F2, de a un plato. |
| P1 | done | Commit local del pase de honestidad, de `skills/` y de esta lista. Sin push y sin pull request. |
| P2 | done | `develop` incorpora `origin/main`. Queda 0 atrás. Sin force-push y sin pull request. |
| P3 | blocked | 510 stubs de `pending_review` no se promueven sin fuente real. |
| P4 | done | Los ejercicios se quedan. Son 10 JSON y 1324 registros MIT, sin imágenes. No se relicencian ni se borra el directorio. |
| P5 | blocked | El roadmap es `docs/CONTENT_EXPANSION_STRATEGY.md`. La fase 0 quedó decidida. Las oleadas de países siguen bloqueadas: hace falta fuente real, y China no se copia. `starsystem/` no es el roadmap. |
| P6 | done | `SRC.md` tiene las secciones obligatorias del árbol medido. REQ-002 marca árbol, comandos y enlaces. SRS Estado de REQ-001 sigue en `draft`. REQ-003 en adelante siguen sin marcar. |

## Cola

Pull requests humanos dejados abiertos: #414, #381 draft, #380 draft. El resto de la cola abierta era Dependabot. Issues que no son pull requests: #402, #298, #297, #263, #257. Este pase no los mezcla, no los cierra y no abre un pull request nuevo.

## Verificación

```bash
python3 skills/gos-audit-gate/scripts/audit_gate.py
python3 docs/corpus-stats.py --check
```

El bloque `BLOCKED` (F1, F2, F3, F13) es parte del resultado. Salida 0 y `CORRECTIONS_HOLD`.
