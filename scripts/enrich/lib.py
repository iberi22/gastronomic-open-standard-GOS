"""Shared helpers for scripts/enrich: JSON ingredient load/dump, slugs."""
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ING = ROOT / "site/src/content/ingredients"


def dump_json(data):
    return json.dumps(data, indent=2, ensure_ascii=False) + "\n"


def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def slugify(text):
    s = unicodedata.normalize("NFD", text.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "_", s).strip("_")


def find_ingredient_files(root=ING):
    """slug -> Path for every ingredient JSON file (first wins, sorted)."""
    out = {}
    for p in sorted(Path(root).rglob("*.json")):
        out.setdefault(p.stem, p)
    return out
