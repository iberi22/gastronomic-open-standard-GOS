#!/usr/bin/env python3
"""Import USDA FoodData Central (Foundation + SR Legacy, CC0) nutrition (gos-d1-03).

Only ingredients listed in mapping.yml are touched. Values come verbatim from the
pinned FDC CSV releases (cached in the gitignored .cache/usda). Missing nutrients
stay absent (never 0, never guessed). Every mapped field is OVERWRITTEN with the FDC value (the cited source is the truth);
fields FDC does not report are removed (never 0). Only existing ingredients are enriched.
Idempotent: same inputs -> byte-identical files.

Usage: usda_import.py [--check] [--selftest]
  --check  write nothing; exit 1 if a run would change any file
"""
import csv
import sys
import urllib.request
import zipfile
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib import ROOT, dump_json, find_ingredient_files, load  # noqa: E402

CACHE = ROOT / ".cache/usda"
MAPPING = Path(__file__).with_name("mapping.yml")
BASE = "https://fdc.nal.usda.gov/fdc-datasets/"
DATASETS = {"sr_legacy": "FoodData_Central_sr_legacy_food_csv_2018-04",
            "foundation": "FoodData_Central_foundation_food_csv_2025-04-24"}
NAMES = {"sr_legacy": "USDA FoodData Central SR Legacy",
         "foundation": "USDA FoodData Central Foundation Foods"}

# fdc nutrient number -> (frontmatter key, unit as stored)
MACROS = {1003: "protein_g", 1004: "fat_g", 1005: "carbs_g", 1079: "fiber_g", 2000: "sugar_g",
          1258: "saturated_fat_g"}
MICROS = {1087: "calcium_mg", 1089: "iron_mg", 1090: "magnesium_mg", 1091: "phosphorus_mg",
          1092: "potassium_mg", 1093: "sodium_mg", 1095: "zinc_mg", 1098: "copper_mg",
          1101: "manganese_mg", 1103: "selenium_ug", 1162: "vitamin_c_mg", 1165: "thiamin_mg",
          1166: "riboflavin_mg", 1167: "niacin_mg", 1175: "vitamin_b6_mg", 1177: "folate_ug",
          1178: "vitamin_b12_ug", 1106: "vitamin_a_rae_ug", 1109: "vitamin_e_mg",
          1185: "vitamin_k_ug", 1114: "vitamin_d_ug", 1253: "cholesterol_mg"}
ENERGY = (1008, 2047, 2048)  # kcal; Foundation lacks 1008 for some foods


def kcal_ok(kcal, p, c, f):
    """kcal ~= 4P+4C+9F within 15% (or 8 kcal absolute for very low-energy foods)."""
    est = 4 * p + 4 * c + 9 * f
    return abs(kcal - est) <= max(0.15 * max(kcal, est), 8)


def merge(existing, new, mapped_keys):
    """Overwrite every mapped key with the FDC value; drop mapped keys FDC lacks."""
    out = {k: v for k, v in (existing or {}).items() if k not in mapped_keys}
    out.update(new)
    return out


def ensure_data():
    CACHE.mkdir(parents=True, exist_ok=True)
    for name in DATASETS.values():
        if (CACHE / name).is_dir():
            continue
        z = CACHE / f"{name}.zip"
        if not z.exists():
            urllib.request.urlretrieve(f"{BASE}{name}.zip", z)
        with zipfile.ZipFile(z) as zf:
            zf.extractall(CACHE / name)


def csv_rows(ds, table):
    base = CACHE / DATASETS[ds]
    p = next(base.rglob(f"{table}.csv"))
    with open(p, newline="", encoding="utf-8") as fh:
        yield from csv.DictReader(fh)


def load_fdc(ids):
    """fdc_id -> {dataset, desc, nutrients{nbr: amount}, portions[...]}"""
    ids = {str(i) for i in ids}
    foods = {}
    for ds in DATASETS:
        unit = {r["id"]: r["name"] for r in csv_rows(ds, "measure_unit")}
        local = {}
        for r in csv_rows(ds, "food"):
            if r["fdc_id"] in ids and r["fdc_id"] not in foods:
                local[r["fdc_id"]] = {"dataset": ds, "desc": r["description"], "n": {}, "portions": []}
        for r in csv_rows(ds, "food_nutrient"):
            f = local.get(r["fdc_id"])
            if f and r["amount"] != "":
                f["n"][int(r["nutrient_id"])] = float(r["amount"])
        for r in csv_rows(ds, "food_portion"):
            f = local.get(r["fdc_id"])
            if f and r["gram_weight"]:
                u = unit.get(r["measure_unit_id"], "")
                u = "" if u in ("undetermined", "") else u
                label = " ".join(x for x in (r["amount"].rstrip("0").rstrip("."), u,
                                             r["portion_description"], r["modifier"]) if x)
                f["portions"].append((int(r["seq_num"] or 0), label.strip(), float(r["gram_weight"])))
        foods.update(local)
    return foods


def r2(x):
    return round(x + 0.0, 2)


def build(food):
    """-> (macros, micros, portions) or None when macros missing/insane."""
    n = food["n"]
    kcal = next((n[k] for k in ENERGY if k in n), None)
    if kcal is None or any(k not in n for k in (1003, 1004, 1005)):
        return None
    if not kcal_ok(kcal, n[1003], n[1005], n[1004]):
        return None
    macros = {"calories": r2(kcal)}
    macros.update({v: r2(n[k]) for k, v in MACROS.items() if k in n})
    micros = {v: r2(n[k]) for k, v in MICROS.items() if k in n}
    seen, portions = set(), []
    for _, label, g in sorted(food["portions"]):
        if label and label not in seen and g > 0:
            seen.add(label)
            portions.append({"description": label, "grams": r2(g)})
    return dict(sorted(macros.items())), dict(sorted(micros.items())), portions[:8]


def source_entry(fdc_id, food, retrieved):
    return {"name": NAMES[food["dataset"]], "id": f"fdc:{fdc_id}", "licence": "CC0-1.0",
            "retrieved": retrieved}


def apply(fm, fdc_id, food, built, retrieved):
    macros, micros, portions = built
    fm = dict(fm)
    fm["nutrition_per_100g"] = dict(sorted(merge(
        fm.get("nutrition_per_100g"), macros, {"calories", *MACROS.values()}).items()))
    m = merge(fm.get("micronutrients"), micros, set(MICROS.values()))
    m.pop("vitamin_a_iu", None)  # no source; only RAE from FDC is kept
    fm["micronutrients"] = dict(sorted(m.items()))
    p = dict(fm.get("portions") or {})
    p.setdefault("default_g", 100)
    if portions:
        p["household"] = portions
    fm["portions"] = p
    # schema v1 + zod require `sources` as strings; structured provenance goes to `data_sources`.
    entry = source_entry(fdc_id, food, retrieved)
    label = f"{entry['name']} ({entry['id']})"
    src = [s for s in (fm.get("sources") or []) if not str(s).startswith("USDA FoodData Central")]
    fm["sources"] = src + [label]
    ds = [d for d in (fm.get("data_sources") or []) if not d.get("id", "").startswith("fdc:")]
    fm["data_sources"] = ds + [entry]
    return fm


def run(check):
    spec = yaml.safe_load(MAPPING.read_text(encoding="utf-8"))
    retrieved = spec["retrieved"]
    entries = spec["ingredients"]
    ensure_data()
    foods = load_fdc(e["fdc_id"] for e in entries.values())
    files = find_ingredient_files()
    changed, unmapped, insane, missing, warn, written = [], [], [], [], [], 0
    for slug, e in sorted(entries.items()):
        path = files.get(slug)
        if not path:
            continue  # only existing canonical ingredients are enriched
        food = foods.get(str(e["fdc_id"]))
        if e.get("confidence") not in ("high", "medium") or not food:
            unmapped.append(slug)
            continue
        built = build(food)
        if not built:
            insane.append(slug)
            continue
        fm = load(path)
        out = dump_json(apply(fm, e["fdc_id"], food, built, retrieved))
        written += 1
        if path.read_text(encoding="utf-8") != out:
            changed.append(path)
            if not check:
                path.write_text(out, encoding="utf-8")
    print(f"mapped={len(entries)} canonical_enriched(full_macros)={written} changed={len(changed)} "
          f"unmapped={len(unmapped)} failed_kcal_sanity={len(insane)}")
    if unmapped:
        print("unmapped (no confident match):", ", ".join(unmapped))
    if insane:
        print("WARNING kcal~4P+4C+9F off >15%, not written:", ", ".join(insane))
    if check and changed:
        print("would change:", *[str(p.relative_to(ROOT)) for p in changed[:10]], sep="\n  ")
        return 1
    return 0


def verify_sources(foods=None):
    """Self-test: every ingredient citing fdc:<id> has all mapped fields equal to the CSV."""
    ensure_data()
    docs = {}
    for slug, p in find_ingredient_files().items():
        fm = load(p)
        ids = [d["id"][4:] for d in fm.get("data_sources") or [] if str(d.get("id", "")).startswith("fdc:")]
        if ids:
            docs[slug] = (fm, ids[0])
    foods = load_fdc(i for _, i in docs.values())
    bad, n = [], 0
    for slug, (fm, i) in sorted(docs.items()):
        nut = foods[i]["n"]
        kcal = next((nut[k] for k in ENERGY if k in nut), None)
        exp_n = {v: r2(nut[k]) for k, v in MACROS.items() if k in nut}
        if kcal is not None:
            exp_n["calories"] = r2(kcal)
        exp_m = {v: r2(nut[k]) for k, v in MICROS.items() if k in nut}
        got_n = {k: v for k, v in (fm.get("nutrition_per_100g") or {}).items() if k in {"calories", *MACROS.values()}}
        got_m = {k: v for k, v in (fm.get("micronutrients") or {}).items() if k in MICROS.values()}
        n += 1
        if got_n != exp_n or got_m != exp_m or "vitamin_a_iu" in (fm.get("micronutrients") or {}):
            bad.append(slug)
    print(f"source-equality: {n} ingredients checked, {len(bad)} mismatched {bad}")
    return not bad


def selftest():
    assert kcal_ok(160, 2, 9, 15)  # avocado-like
    assert not kcal_ok(300, 1, 1, 1)
    assert merge({"a": 0, "b": 5, "z": 1}, {"a": 3, "c": 1}, {"a", "b", "c"}) == {"a": 3, "c": 1, "z": 1}
    f = {"dataset": "sr_legacy", "desc": "x", "n": {1008: 100, 1003: 5, 1004: 2, 1005: 15}, "portions": [(1, "1 cup", 50)]}
    macros, micros, por = build(f)
    assert macros["calories"] == 100 and micros == {} and por[0]["grams"] == 50
    f["n"][1008] = 900
    assert build(f) is None
    if not verify_sources():
        return 1
    print("selftest ok")
    return 0


if __name__ == "__main__":
    a = sys.argv[1:]
    sys.exit(selftest() if "--selftest" in a else run("--check" in a))
