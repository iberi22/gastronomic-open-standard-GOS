#!/usr/bin/env python3
"""Añade un bloque `studies:` a fichas JSON desde un catálogo curado.

Compartido por vitaminas y dietas: ambos leen `research/<t>_studies.json`
—donde cada DOI ya está comprobado contra Crossref— y solo añaden el bloque
dentro del registro JSON. Ningún script busca ni decide una referencia; la
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

def render_studies(entry: dict) -> list[dict]:
    """Lista `studies` a partir de las entradas del catálogo."""
    out = []
    for s in entry["studies"]:
        study = {
            "title": str(s["title"]),
            "source": str(s["journal"]),
            "year": s["year"],
            "doi": str(s["doi"]),
        }
        if s.get("pmid"):
            study["pmid"] = str(s["pmid"])
        study["url"] = f"https://doi.org/{s['doi']}"
        out.append(study)
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
        # El catálogo nombra el archivo .md; el registro vive ahora en .json.
        name = re.sub(r"\.md$", ".json", entry["file"])
        path = os.path.join(content_dir, name)
        if not os.path.exists(path):
            print(f"  ? {name} no existe")
            missing += 1
            continue

        try:
            record = json.load(open(path, encoding="utf-8"))
        except ValueError:
            print(f"  ? {path} JSON inválido")
            missing += 1
            continue

        if "studies" in record:
            skipped += 1
            continue

        changed += 1
        if apply:
            # Mismo formato que scripts/md_to_json.mjs; `studies` va al final
            # de los campos de datos, antes de `body_md`.
            body = record.pop("body_md", None)
            record["studies"] = render_studies(entry)
            if body is not None:
                record["body_md"] = body
            with open(path, "w", encoding="utf-8") as f:
                f.write(json.dumps(record, indent=2, ensure_ascii=False) + "\n")

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
