---
name: gos-publish-reviewed-dish
description: Publish one reviewed dish from the root mirror.
version: 0.1.0
author: Brahyan Belalcazar (iberi22)
license: AGPL-3.0-or-later
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [GOS, dishes, china]
    related_skills: [gos-audit-gate, gos-license-corpus]
---

# Publicar un plato revisado

Esta skill es la única salida del bloqueo F2 y del espejo raíz. Publica un plato. No copia el árbol `dishes/china/`.

## When to Use

- Un plato de `dishes/` debe aparecer en `site/src/content/dishes/`.
- El caso China: 118 Markdown bajo `dishes/china/`. El sitio tiene dos archivos, `site/src/content/dishes/china/principales/mapo-doufu.md` y `site/src/content/dishes/china/principales/gongbao-jiding.md`. El resto de `dishes/china/` sigue sin publicar.
- No la uses para un `cp -a`, un script de lote, ni para «poner China al día».

## Procedure

1. Elige un archivo. Léelo entero. Si el cuerpo es un volcado sin revisar, está en un idioma que no puedes comprobar, o el título no coincide con el plato, detente.
2. Confirma `license: AGPL-3.0-or-later` en el front matter. Si dice otra cosa, aplica `gos-license-corpus` a ese archivo antes de copiarlo.
3. Crea el destino `site/src/content/dishes/<cocina>/<stem>.md` con el mismo cuerpo. La carpeta `china` del sitio contiene `principales/mapo-doufu.md` y `principales/gongbao-jiding.md`. El resto de `dishes/china/` sigue sin publicar.
4. No añadas nutrición, fuentes ni una traducción que no esté ya en el archivo de origen.
5. Corre `python3 skills/gos-audit-gate/scripts/audit_gate.py`. La compuerta permite solo `site/src/content/dishes/china/principales/mapo-doufu.md` y `site/src/content/dishes/china/principales/gongbao-jiding.md`. Un tercer Markdown, un directorio `chinese`, o quitar el salto general de `china` es una regresión. El resto de `dishes/china/` sigue sin publicar.

## Pitfalls

- El sitio y la raíz no tienen los mismos stems. La diferencia no se cierra moviendo los 118 archivos.
- `site/scripts/copy-content.js` borra `site/src/content/dishes` al generar y no copia un directorio `china`. Un archivo puesto solo en el sitio no sobrevive a `pnpm --dir site run generate`. Para que un plato chino revisado dure, el mismo cambio tiene que abrir ese salto para ese único archivo.
- `docs/PROJECT_GOALS.md` nombra `site/src/content/dishes/china/principales/mapo-doufu.md` y `site/src/content/dishes/china/principales/gongbao-jiding.md` y dice que el resto de `dishes/china/` sigue sin publicar.
- Un README dentro de la carpeta de cocina no es un plato.

## Verification

`git diff --stat` muestra un plato nuevo en el sitio, no un directorio de más de un plato. El front matter del archivo nuevo es `AGPL-3.0-or-later`.
