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
- El caso China: 118 Markdown bajo `dishes/china/` y ninguna carpeta `china` en el sitio.
- No la uses para un `cp -a`, un script de lote, ni para «poner China al día».

## Procedure

1. Elige un archivo. Léelo entero. Si el cuerpo es un volcado sin revisar, está en un idioma que no puedes comprobar, o el título no coincide con el plato, detente.
2. Confirma `license: AGPL-3.0-or-later` en el front matter. Si dice otra cosa, aplica `gos-license-corpus` a ese archivo antes de copiarlo.
3. Crea el destino `site/src/content/dishes/<cocina>/<stem>.md` con el mismo cuerpo. Para el primer plato chino revisado, la carpeta `china` se crea con ese único archivo.
4. No añadas nutrición, fuentes ni una traducción que no esté ya en el archivo de origen.
5. Corre `python3 skills/gos-audit-gate/scripts/audit_gate.py`. Si la carpeta publicada se llama `china` o `chinese`, la compuerta actual falla a propósito: antes de dejarla verde, cambia esa aserción en el mismo cambio y documenta el plato único revisado.

## Pitfalls

- El sitio y la raíz no tienen los mismos stems. La diferencia no se cierra moviendo los 118 archivos.
- `docs/PROJECT_GOALS.md` ya dice que China no está en el sitio. Actualiza esa frase solo cuando el plato revisado esté publicado, y nombra el archivo.
- Un README dentro de la carpeta de cocina no es un plato.

## Verification

`git diff --stat` muestra un plato nuevo en el sitio, no un directorio de más de un plato. El front matter del archivo nuevo es `AGPL-3.0-or-later`.
