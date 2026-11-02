---
name: gos-license-corpus
description: Keep dish front matter and third-party notices aligned.
version: 0.1.0
author: Brahyan Belalcazar (iberi22)
license: AGPL-3.0-or-later
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [GOS, license, notices]
    related_skills: [gos-audit-gate, gos-publish-reviewed-dish]
---

# Licencia del corpus

El repositorio es AGPL-3.0-or-later desde el 2026-10-15. El front matter de cada plato dice lo mismo. El texto de ejercicios y el arte de entrenamiento no se relicencian.

## When to Use

- Vas a tocar `license:` en un plato, `docs/LICENSING.md`, `NOTICE.md` o el contrato de ejercicios.
- No la uses para cambiar `exercises/*.json`, los `LICENSE` de paquetes de terceros, ni el linaje histórico de `NOTICE.md`.

## Rules that stay true

- Platos en `dishes/**/*.md` y `site/src/content/dishes/**/*.md`: `license: AGPL-3.0-or-later`.
- Metadatos de `exercises/*.json`: MIT, vía `hasaneyldrm/exercises-dataset`. El aviso está en `NOTICE.md`.
- `@bryllim/workout-guide` es CC BY-SA 4.0 y no está vendorizado en este repositorio. `exercises/` no tiene imágenes. Una app que dibuje `wg:` trae el paquete por su cuenta.
- HowToCook original sigue en dominio público. Relicenciar el trabajo posterior del dueño a AGPL no convierte ese texto original en AGPL.

## Procedure

1. Lee `docs/LICENSING.md` y la sección «Exercise artwork» de `NOTICE.md` antes de editar.
2. Cambia solo el campo `license` del plato que estás publicando o corrigiendo. No recorras el árbol si la compuerta ya informa cero `Apache-2.0`.
3. Si un documento dice que el arte está vendorizado aquí, corrige esa frase. No añadas archivos de imagen.
4. Corre `python3 skills/gos-audit-gate/scripts/audit_gate.py` y exige `CORRECTIONS_HOLD`.

## Pitfalls

- `docs/ecosystem/CONTRATO-DATOS.md` usa `wg:` para el catálogo externo y `ex:` para `exercises/`. No unifiques los prefijos.
- El párrafo de linaje que menciona MIT y Apache-2.0 como fechas pasadas no es la licencia viva. No lo borres.

## Verification

Cero líneas `license: Apache-2.0` en el front matter de platos. `NOTICE.md`, `docs/LICENSING.md`, `docs/ecosystem/CONTRATO-DATOS.md` y `docs/ecosystem/README.md` dicen que las ilustraciones no están en el repo.
