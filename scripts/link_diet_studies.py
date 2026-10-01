#!/usr/bin/env python3
"""Añade `studies:` (DOI + PMID verificados) a las fichas de dietas.

Misma política que scripts/link_vitamin_studies.py: no busca ni decide, solo
formatea el catálogo curado `research/diet_studies.json` dentro de
site/src/content/diets/. Las fichas ya tienen `sources:` con los ensayos
clínicos originales; esto aporta la revisión/meta-análisis más reciente.

Uso:
    python3 scripts/link_diet_studies.py [--apply]
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys

CATALOG = os.path.join("research", "diet_studies.json")
DIET_DIR = os.path.join("site", "src", "content", "diets")


def render_studies(entry: dict) -> list[str]:
    out = ["studies:"]
    for s in entry["studies"]:
        title = s["title"].replace("'", "''")
        out.append(f"  - title: '{title}'")
        out.append(f"    source: '{s['journal']}'")
        out.append(f"    year: {s['year']}")
        out.append(f"    doi: '{s['doi']}'")
        if s.get("pmid"):
            out.append(f"    pmid: '{s['pmid']}'")
        out.append(f"    url: 'https://doi.org/{s['doi']}'")
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    if not os.path.exists(CATALOG):
        print(f"ERROR: falta el catalogo {CATALOG}", file=sys.stderr)
        return 2
    catalog = json.load(open(CATALOG, encoding="utf-8"))

    changed = skipped = missing = 0
    for entry in catalog["diets"]:
        path = os.path.join(DIET_DIR, entry["file"])
        if not os.path.exists(path):
            print(f"  ? {entry['file']} no existe")
            missing += 1
            continue
        text = open(path, encoding="utf-8").read()
        if not text.startswith("---"):
            print(f"  ? {path} sin frontmatter")
            missing += 1
            continue
        end = text.find("\n---", 3)
        if end == -1:
            print(f"  ? {path} frontmatter sin cerrar")
            missing += 1
            continue
        fm, rest = text[3:end], text[end:]

        if re.search(r"^studies:", fm, re.M):
            skipped += 1
            continue

        new_fm = fm.rstrip("\n") + "\n" + "\n".join(render_studies(entry)) + "\n"
        changed += 1
        if args.apply:
            open(path, "w", encoding="utf-8").write("---" + new_fm + rest)

    verb = "written" if args.apply else "would update"
    print(f"dietas: {changed} {verb}, {skipped} ya tenían studies, {missing} sin archivo")
    return 0


if __name__ == "__main__":
    sys.exit(main())
