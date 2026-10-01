#!/usr/bin/env python3
"""Añade la sección `## 🔬 Perfil Sensorial Estandarizado` a recetas que ya
tienen el campo YAML `sensory:` pero no la sección en el cuerpo.

Por qué existe: `scripts/audit_content.py` cuenta como "missing sensorial" toda
receta sin el literal "Perfil Sensorial Estandarizado" en el cuerpo, aunque ya
tenga el campo YAML completo. El grafo (`generate-graph.js`) y las páginas de
receta leen el YAML, así que el dato ya existe: esta script solo proyecta el
YAML a la sección del cuerpo, sin inventar valores.

Determinista y sin red: no genera[new] texto, solo formatea lo que ya está.

Uso:
    python3 scripts/add_sensory_section.py            # dry-run, lista affected
    python3 scripts/add_sensory_section.py --apply    # escribe
"""

from __future__ import annotations

import argparse
import os
import re
import sys

HEADER = "## 🔬 Perfil Sensorial Estandarizado"
SENTINEL = "Perfil Sensorial Estandarizado"


def split_frontmatter(text: str) -> tuple[str, str, str] | None:
    """Devuelve (pre, frontmatter, post) o None si no hay frontmatter."""
    if not text.startswith("---"):
        return None
    end = text.find("\n---", 3)
    if end == -1:
        return None
    return text[:3], text[3:end], text[end:]


def parse_sensory_block(fm: str) -> dict | None:
    """Extrae flavor/texture/aroma/presentation del bloque YAML `sensory:`.

    Soporta las dos formas que usa el repo:
      - listas:      `flavor:` seguido de items `    - Creamy`
      - escalar:     `presentation: >-` seguido de un folded scalar indentado
    Las claves viven a indent 2; el valor, a indent 4 o mas.
    """
    lines = fm.split("\n")
    try:
        start = next(i for i, l in enumerate(lines) if l.rstrip() == "sensory:")
    except StopIteration:
        return None

    KEYS = ("flavor", "texture", "aroma", "presentation")
    out: dict[str, list[str] | str] = {}
    key: str | None = None
    i = start + 1
    while i < len(lines):
        raw = lines[i]
        if not raw.strip():
            i += 1
            continue
        indent = len(raw) - len(raw.lstrip())
        stripped = raw.strip()
        # indent 0 = otra clave de primer nivel: termina sensory
        if indent == 0:
            break
        # indent 2 = clave nueva
        if indent == 2:
            name, sep, rest = stripped.partition(":")
            # `flavor:` -> rest vacio (es una lista). `presentation: >-` -> folded.
            key = name.strip() if sep else None
            if key in KEYS:
                rest = rest.strip()
                out[key] = rest if rest and rest not in (">-", "|", ">") else []
            else:
                key = None
            i += 1
            continue
        # indent >= 4: item de lista o continuacion de folded scalar
        if key:
            if stripped.startswith("- "):
                bucket = out.get(key)
                if not isinstance(bucket, list):
                    bucket = []
                    out[key] = bucket
                bucket.append(stripped[2:].strip())
            else:
                prev = out.get(key)
                joined = prev if isinstance(prev, str) else " ".join(prev or [])
                out[key] = f"{joined} {stripped}".strip()
        i += 1

    if not any(v for v in out.values()):
        return None
    return out


def render(sensory: dict) -> str:
    """Construye la sección markdown a partir del dict parseado."""
    lines = [HEADER, ""]

    def join(key: str) -> str | None:
        v = sensory.get(key)
        if isinstance(v, list):
            v = [x for x in v if x]
            if not v:
                return None
            return ", ".join(v)
        if isinstance(v, str) and v.strip():
            return v.strip()
        return None

    flavor = join("flavor")
    texture = join("texture")
    aroma = join("aroma")
    presentation = join("presentation")

    if flavor:
        lines.append(f"* **Sabor:** {flavor}")
    if texture:
        lines.append(f"* **Textura:** {texture}")
    if aroma:
        lines.append(f"* **Aroma:** {aroma}")
    if presentation:
        lines.append(f"* **Presentación:** {presentation}")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    root = "."
    targets = []
    for dirpath, _dirs, files in os.walk(os.path.join(root, "dishes")):
        for f in sorted(files):
            if not f.endswith(".md") or f == "README.md":
                continue
            targets.append(os.path.join(dirpath, f))
    targets.sort()

    changed = skipped = norecipe = 0
    for path in targets:
        text = open(path, encoding="utf-8").read()
        if SENTINEL in text:
            skipped += 1
            continue
        parts = split_frontmatter(text)
        if not parts:
            norecipe += 1
            continue
        _pre, fm, post = parts
        sensory = parse_sensory_block(fm)
        if not sensory:
            continue
        section = render(sensory)
        # Insertamos al final del documento con un separador claro.
        new_text = text.rstrip("\n") + "\n\n---\n\n" + section + "\n"
        changed += 1
        if args.apply:
            open(path, "w", encoding="utf-8").write(new_text)
            print(f"  + {path}")

    verb = "written" if args.apply else "would update"
    print(
        f"sensory: {changed} {verb}, {skipped} already had the section, "
        f"{norecipe} without frontmatter",
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
