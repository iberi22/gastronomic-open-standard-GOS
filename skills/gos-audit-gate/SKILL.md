---
name: gos-audit-gate
description: Fail if a corrected GOS audit invariant regresses.
version: 0.1.0
author: Brahyan Belalcazar (iberi22)
license: AGPL-3.0-or-later
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [GOS, audit, corpus]
    related_skills: [gos-nutrition-source, gos-publish-reviewed-dish, gos-license-corpus, gos-review-queue]
---

# Compuerta de auditoría GOS

Esta skill vuelve a medir el corpus publicado y falla solo si una corrección ya hecha se revierte. Los huecos bloqueados se imprimen y siguen abiertos.

## When to Use

- Antes de decir que un hallazgo del informe del 2026-11-02 quedó resuelto.
- Después de editar ingredientes, platos, licencias, `docs/stats.json`, `README.md` o `README.es.md`.
- No la uses para inventar nutrición, copiar `dishes/china/` al sitio, ni mezclar pull requests.

## Procedure

1. Desde la raíz del repo corre `python3 skills/gos-audit-gate/scripts/audit_gate.py`.
2. Termina solo si la salida contiene `CORRECTIONS_HOLD` y el código de salida es 0.
3. Copia el bloque `BLOCKED` al informe. Esas líneas no se cierran con esta skill.
4. Si aparece `REGRESSIONS`, corrige el archivo nombrado y vuelve a correr el script. No borres la aserción.

## What the gate holds

- `pending_review` queda fuera del loader publicado en `site/src/content.config.ts`.
- `docs/stats.json` y los dos README coinciden con un recuento fresco: publicados, pendientes y nutrición no nula.
- El front matter de platos no contiene `license: Apache-2.0`.
- B17 no es una vitamina, no afirma citotoxicidad contra el cáncer y conserva el aviso de cianuro.
- `site/src/content/diets/placeholder.json` dice que no es una dieta.
- `docs/PROJECT_GOALS.md` no dice MIT ni «la base más completa del mundo».
- `docs/nutritional_database.md` no presenta la tabla manual como corpus de varias organizaciones.
- No hay directorio `china` ni `chinese` en `site/src/content/dishes/`.
- `exercises/` no contiene imágenes, y los avisos dicen que el arte no está vendorizado aquí.
- Cada ID de `.gitcore/planning/TASK.md` (C1–C9, F1, F2, F3, F13, F14, P1–P6) tiene una palabra terminal. F2, F3, F13 y P3 se quedan en `blocked`. P5 se queda en `deferred`.
- `.gitcore/planning/PLANNING.md` nombra el pase de honestidad, los huecos bloqueados y apunta a `TASK.md`. No vuelve al stub de una línea.
- Una casilla marcada de REQ-001 tiene que ser verdad. `SRC.md` completo sigue sin marcar. REQ-002 en adelante siguen sin marcar. SRS Estado de REQ-001 sigue en `draft`.
- Ningún objeto `sources` trae `org`, `id` o `url`. Las filas numéricas de `docs/nutritional_database.md` siguen igual que en `e956abf2`.

## Pitfalls

- Un código 0 no significa que el corpus cubra el mundo. El bloque `BLOCKED` es parte del resultado.
- `docs/corpus-stats.py --check` solo compara Markdown de platos y las tres cifras de ingredientes. Esta compuerta añade el resto.
- No cambies el script para que `sources>=5` tenga que ser mayor que cero. Esa cifra sube solo cuando `gos-nutrition-source` incorpora identificadores reales.
- Un objeto `sources` con `org`, `id` o `url` falla a propósito. Esos identificadores entran en el mismo cambio que actualiza esta aserción, copiados del publicador.

## Verification

La salida muestra `CORRECTIONS_HOLD` y el proceso sale 0. El bloque `BLOCKED` sigue listando F1, F2, F3 y F13.
