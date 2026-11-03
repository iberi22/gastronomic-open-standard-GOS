---
name: gos-nutrition-source
description: Add a nutrition source only with a real publisher id.
version: 0.1.0
author: Brahyan Belalcazar (iberi22)
license: AGPL-3.0-or-later
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [GOS, nutrition, sources]
    related_skills: [gos-audit-gate]
---

# Fuente nutricional real

Esta skill es la única salida del bloqueo F3. Una ficha cuenta como fuente solo con un identificador estable copiado del publicador. El nombre «USDA FoodData Central» sin id no cuenta.

## When to Use

- Vas a llenar `nutrition_per_100g` de un ingrediente publicado.
- Vas a promover un stub de `site/src/content/ingredients/pending_review/`.
- No la uses para completar los 510 stubs, ni para escribir una tabla de cinco fuentes de memoria.

## What counts

Cada entrada de `sources` que deba contar tiene estas tres claves, tomadas del sitio del publicador en la misma sesión:

- `org`: el nombre de la organización.
- `id`: el identificador estable (`FDC 171477`, fila de la tabla ICBF, código FAO/INFOODS).
- `url`: la página de ese registro.

Cinco cadenas con el mismo nombre no son cinco fuentes. Cinco idiomas no son el campo `i18n` con `common_name: "TODO"`.

## Procedure

1. Abre el registro en el sitio de la organización y copia `org`, `id` y `url`. Si no puedes abrir el registro, detente.
2. Edita un solo JSON publicado. Pega los números tal como están en esa página. No conviertas unidades de memoria.
3. Añade el objeto de fuente. Conserva las cadenas viejas que solo tienen el nombre: no las presentes como una fuente distinta.
4. Corre `python3 skills/gos-audit-gate/scripts/audit_gate.py`. Tiene que seguir en `CORRECTIONS_HOLD`.
5. En el informe cita el `id` y la URL. Sin eso, el hallazgo sigue `blocked`.

## Pitfalls

- No rellenes `rda` ni `ul` de vitaminas con un número inventado. B17 se queda con ambos en `null`.
- No edites las filas numéricas de `docs/nutritional_database.md`. Esa tabla es manual y no es el corpus.
- `pending_review` no entra en la colección publicada. Promover un stub es un archivo movido más una fuente real, no un cambio del glob.

## Verification

El JSON modificado contiene al menos un objeto `sources` con `org`, `id` y `url` no vacíos, y los números coinciden con la página citada. La compuerta sigue en 0.

El ingrediente revisado es `site/src/content/ingredients/vegetables/tomate.json`, con id `FDC 170457` y URL `https://fdc.nal.usda.gov/food-details/170457/nutrients`.
