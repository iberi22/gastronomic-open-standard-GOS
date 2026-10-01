#!/usr/bin/env python3
"""Añade un bloque `studies:` a fichas markdown desde un catálogo curado.

Compartido por vitaminas y dietas: ambos leen `research/<t>_studies.json`
—donde cada DOI ya está comprobado contra Crossref— y solo formatean el bloque
dentro del frontmatter. Ningún script busca ni decide una referencia; la
decisión editorial vive en el catálogo, que es revisable.

Uso:
    python3 scripts/studies_updater.py research/vitamin_studies.json site/src/content/vitamins vitamins
    python3 scripts/studies_updater.py research/diet_studies.json site/src/content/diets diets --apply
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys

STUDIES_KEY = re.compile(r"^studies:", re.M)


def render_studies(entry: dict) -> list[str]:
    """Bloque YAML `studies:` a partir de las entradas del catálogo."""
    out = ["studies:"]
    for s in entry["studies"]:
        q = lambda v: str(v).replace("'", "''")  # noqa: E731
        out += [
            f"  - title: '{q(s['title'])}'",
            f"    source: '{q(s['journal'])}'",
            f"    year: {s['year']}",
            f"    doi: '{s['doi']}'",
        ]
        if s.get("pmid"):
            out.append(f"    pmid: '{s['pmid']}'")
        out.append(f"    url: 'https://doi.org/{s['doi']}'")
    return out


def update(catalog_path: str, content_dir: str, collection_key: str, apply: bool) -> int:
    if not os.path.exists(catalog_path):
        print(f"ERROR: falta el catalogo {catalog_path}", file=sys.stderr)
        return 2

    catalog = json.load(open(catalog_path, encoding="utf-8"))
    # El campo que da el nombre de archivo cambia según colección.
    entries = catalog[collection_key]
    id_key = "code" if collection_key == "vitamins" else "key"

    changed = skipped = missing = 0
    for entry in sorted(entries, key=lambda e: e[id_key]):
        path = os.path.join(content_dir, entry["file"])
        if not os.path.exists(path):
            print(f"  ? {entry['file']} no existe")
            missing += 1
            continue

        text = open(path, encoding="utf-8").read()
        end = text.find("\n---", 3) if text.startswith("---") else -1
        if end == -1:
            print(f"  ? {path} sin frontmatter válido")
            missing += 1
            continue

        fm, rest = text[3:end], text[end:]
        if STUDIES_KEY.search(fm):
            skipped += 1
            continue

        changed += 1
        if apply:
            block = "\n".join(render_studies(entry))
            # fm empieza con "\n"; se conserva para no perder el blanco tras ---.
            open(path, "w", encoding="utf-8").write(f"---{fm.rstrip()}\n{block}\n{rest}")

    verb = "written" if apply else "would update"
    print(f"{collection_key}: {changed} {verb}, {skipped} ya tenían studies, {missing} sin archivo")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("catalog")
    ap.add_argument("content_dir")
    ap.add_argument("collection")
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()
    return update(a.catalog, a.content_dir, a.collection, a.apply)


if __name__ == "__main__":
    sys.exit(main())
