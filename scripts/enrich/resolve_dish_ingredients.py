#!/usr/bin/env python3
"""Resolve dish `main_ingredients` free text to canonical ingredient slugs.

Writes `main_ingredient_slugs: [slug|null, ...]` right after `main_ingredients`
(parallel list; the original free text is never modified) into the CANONICAL
ROOT `dishes/`. Sync the site copy afterwards with `node site/scripts/copy-content.js`.
Every written slug is verified to exist as site/src/content/ingredients/**/<slug>.json.
Idempotent.

  resolve_dish_ingredients.py            write slugs, print stats + unresolved top-30
  resolve_dish_ingredients.py --check    exit 1 if root files are stale / a slug dangles
  resolve_dish_ingredients.py --selftest
"""
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib import ING, ROOT, find_ingredient_files, load  # noqa: E402

DISHES = ROOT / "dishes"
KEY = "main_ingredient_slugs"

# Curated normalised phrase -> ingredient slug. Used only if the slug file exists.
ALIASES = {
    "aji": "aji_picante", "aji picante": "aji_picante",
    "comino tostado": "comino", "comino molido": "comino", "cumin": "comino",
    "arroz basmati": "arroz", "arroz blanco": "arroz", "rice": "arroz",
    "azucar": "azucar", "sugar": "azucar", "azucar blanca": "azucar",
    "azucar morena": "azucar", "brown sugar": "azucar",
    "onion": "cebolla_cabezona", "cebolla": "cebolla_cabezona",
    "cebolla roja": "cebolla_cabezona", "cebolla blanca": "cebolla_cabezona",
    "cebolla morada": "cebolla_cabezona", "cebolla amarilla": "cebolla_cabezona",
    "red onion": "cebolla_cabezona",
    "cebolleta": "cebolla_larga", "scallion": "cebolla_larga",
    "green onion": "cebolla_larga", "spring onion": "cebolla_larga",
    "garlic": "ajo", "ginger": "jengibre", "tomato": "tomate", "jitomate": "tomate",
    "egg": "huevo", "huevos": "huevo", "eggs": "huevo", "milk": "leche",
    "butter": "mantequilla", "cheese": "queso", "avocado": "aguacate",
    "chicken": "pollo", "pechuga de pollo": "pollo", "muslos de pollo": "pollo",
    "beef": "carne_res", "carne de res": "carne_res", "carne de vacuno": "carne_res",
    "carne de ternera": "carne_res", "ternera": "carne_res", "carne molida": "carne_res",
    "pork": "cerdo", "carne de cerdo": "cerdo", "fish": "pescado",
    "cilantro": "cilantro", "coriander": "cilantro", "salt": "sal", "oil": "aceite",
    "aceite vegetal": "aceite", "lime": "limon", "lemon": "limon",
    "jugo de limon": "limon", "zumo de limon": "limon", "lemon juice": "limon",
    "corn": "maiz", "bean": "frijol", "beans": "frijol", "frijoles": "frijol",
    "lentils": "lentejas", "cassava": "yuca", "manioc": "yuca", "mandioca": "yuca",
    "wheat flour": "harina_trigo", "flour": "harina_trigo", "harina": "harina_trigo",
    "harina de trigo": "harina_trigo", "coconut milk": "leche_coco",
    "leche de coco": "leche_coco", "cream": "crema_leche", "heavy cream": "crema_leche",
    "crema de leche": "crema_leche", "nata": "crema_leche",
    "soy sauce": "salsa_soya", "salsa de soya": "salsa_soya", "salsa de soja": "salsa_soya",
    "pimenton": "pimenton_rojo", "pimiento rojo": "pimenton_rojo",
    "red pepper": "pimenton_rojo", "red bell pepper": "pimenton_rojo",
    "black pepper": "pimienta_negra", "pimienta": "pimienta_negra",
    "cinnamon": "canela", "carrot": "zanahoria", "peanut": "mani", "peanuts": "mani",
    "honey": "miel", "vinegar": "vinagre", "oregano": "oregano", "thyme": "tomillo",
    "鸡蛋": "huevo", "盐": "sal", "油": "aceite", "洋葱": "cebolla_cabezona",
    "番茄": "tomate", "西红柿": "tomate", "生抽": "salsa_soya", "老抽": "salsa_soya",
    "小葱": "cebolla_larga", "葱": "cebolla_larga", "姜": "jengibre", "大蒜": "ajo",
    "糖": "azucar", "白糖": "azucar", "dark soy sauce": "salsa_soya",
    "light soy sauce": "salsa_soya", "black pepper powder": "pimienta_negra",
    "sesame oil": "aceite_ajonjoli", "oyster sauce": "salsa_ostion",
    "orégano seco": "oregano", "oregano seco": "oregano",
    "pimiento verde": "pimenton_verde", "pimenton verde": "pimenton_verde",
    "mantequilla sin sal": "mantequilla", "sal marina": "sal", "sal fina": "sal",
    "azucar blanca refinada": "azucar", "aceite de ajonjoli": "aceite_ajonjoli",
    "aceite de sesamo": "aceite_ajonjoli", "pimienta negra molida": "pimienta_negra",
    "banana": "banano", "pineapple": "pina", "coconut": "coco",
}
DROP_WORDS = {
    "fresco", "fresca", "frescos", "frescas", "picado", "picada", "picados", "picadas",
    "molido", "molida", "cocido", "cocida", "cocidos", "cocidas", "rallado", "rallada",
    "grande", "grandes", "pequeno", "pequena", "pequenos", "pequenas", "tostado", "tostada",
    "fresh", "chopped", "ground", "cooked", "grated", "large", "small", "sliced",
}


def norm(text):
    s = unicodedata.normalize("NFD", str(text).lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"\([^)]*\)", " ", s)
    s = re.split(r"[,;:/]| o | or | y/o ", s)[0]
    s = re.sub(r"[^a-z0-9\u4e00-\u9fff ]+", " ", s)
    return " ".join(s.split())


def singular(w):
    for suf, rep in (("ces", "z"), ("es", ""), ("s", "")):
        if w.endswith(suf) and len(w) - len(suf) >= 3:
            return w[: -len(suf)] + rep
    return w


def variants(text):
    n = norm(text)
    if not n:
        return []
    toks = [t for t in n.split() if t not in DROP_WORDS]
    j = " ".join(toks)
    cand = [n, j, " ".join(singular(t) for t in toks), singular(j)]
    seen, out = set(), []
    for v in cand:
        if v and v not in seen:
            seen.add(v)
            out.append(v)
    return out


def build_index(files=None):
    """(label -> slug, set of existing slugs); pending_review is excluded."""
    files = files if files is not None else {
        s: p for s, p in find_ingredient_files().items()
        if "pending_review" not in p.parts
    }
    idx = {}
    for slug in sorted(files):
        labels = [slug.replace("_", " ")]
        try:
            d = load(files[slug])
            labels.append(d.get("name", "") or "")
            al = d.get("aliases") or {}
            for v in al.values():
                labels += list(v or [])
        except (OSError, ValueError, AttributeError):
            pass
        for lab in labels:
            for v in variants(lab):
                idx.setdefault(v, slug)
    return idx, set(files)


def resolve(text, idx, slugs):
    for v in variants(text):
        a = ALIASES.get(v)
        if a and a in slugs:
            return a
        if v in idx and idx[v] in slugs:
            return idx[v]
    return None


def process(path, idx, slugs):
    raw = path.read_text(encoding="utf-8")
    if not raw.startswith("---\n"):
        return None
    m = re.search(r"^main_ingredients:[ \t]*\n((?:(?:- |  ).*\n?)*)", raw, re.M)
    if not m:
        return None
    try:
        items = yaml.safe_load("main_ingredients:\n" + m.group(1))["main_ingredients"]
    except yaml.YAMLError:
        return None
    if not isinstance(items, list) or not items:
        return None
    items = [str(i) for i in items]
    out = [resolve(i, idx, slugs) for i in items]
    block = m.group(0) if m.group(0).endswith("\n") else m.group(0) + "\n"
    tail = re.sub(rf"\A{KEY}:.*\n", "", raw[m.end():])
    line = f"{KEY}: [" + ", ".join(s or "null" for s in out) + "]\n"
    return items, out, raw, raw[:m.start()] + block + line + tail


def run(check):
    idx, slugs = build_index()
    total = hit = stale = 0
    miss = Counter()
    for p in sorted(DISHES.rglob("*.md")):
        r = process(p, idx, slugs)
        if not r:
            continue
        items, out, raw, new = r
        for i, s in zip(items, out):
            total += 1
            if s:
                assert s in slugs, f"dangling slug {s}"
                hit += 1
            else:
                miss[i] += 1
        if new != raw:
            stale += 1
            if not check:
                p.write_text(new, encoding="utf-8")
    pct = 100 * hit / total if total else 0
    print(f"entries={total} resolved={hit} ({pct:.1f}%) unresolved={total - hit} "
          f"distinct_unresolved={len(miss)} files_{'stale' if check else 'updated'}={stale}")
    print("top unresolved:")
    for t, c in miss.most_common(30):
        print(f"  {c:3d} {t}")
    return 1 if (check and stale) else 0


def selftest():
    files = {s: Path(s) for s in (
        "cebolla_cabezona", "aji_picante", "comino", "arroz", "azucar",
        "pimenton_rojo", "leche_coco", "papa_criolla")}
    idx, slugs = build_index(files)
    r = lambda t: resolve(t, idx, slugs)  # noqa: E731
    assert r("Cebollas picadas") == "cebolla_cabezona"
    assert r("Leche de coco (lata)") == "leche_coco"
    assert r("Ají") == "aji_picante" != "pimenton_rojo"
    assert r("Comino tostado") == "comino"
    assert r("Arroz Basmati") == "arroz"
    assert r("Azúcar") == "azucar"
    assert r("Unobtainium") is None
    assert r("pollo") is None  # alias target file absent -> never dangling
    print("selftest ok")
    return 0


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        sys.exit(selftest())
    sys.exit(run("--check" in sys.argv))
