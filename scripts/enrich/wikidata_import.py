#!/usr/bin/env python3
"""Import Wikidata (CC0) scientific names, taxonomy and multilingual labels (gos-d2-07).

Only ingredients listed in mapping.yml under `wikidata:` (slug -> {taxon_qid, food_qid,
confidence}) are touched; only high/medium entries are used. scientific_name, family and
genus come from the TAXON item; labels/aliases come ONLY from the FOOD item (an ingredient
without a confident food_qid gets no labels). Labels/aliases that are binomials or whose
script does not match the language are dropped. Values come verbatim from the Wikidata SPARQL
endpoint (polite User-Agent, responses cached in the gitignored .cache/wikidata). Missing
values stay absent (never guessed). Curated values are kept unless --force. Idempotent.

Usage: wikidata_import.py [--check] [--force] [--resolve] [--selftest]
  --check    write nothing; exit 1 if a run would change any file
  --resolve  (network) propose QIDs for ingredients not yet mapped and append them to
             mapping.yml for human review (exact taxon matches only)
"""
import hashlib
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib import ROOT, dump_json, find_ingredient_files, load  # noqa: E402

CACHE = ROOT / ".cache/wikidata"
MAPPING = Path(__file__).with_name("mapping.yml")
SPARQL = "https://query.wikidata.org/sparql"
API = "https://www.wikidata.org/w/api.php"
UA = "GOS-enrich/0.1 (https://github.com/SouthWestAILabs/gastronomic-open-standard-GOS; data import bot)"
LANGS = ("en", "es", "zh", "ja", "pt", "fr")
LANG_VARIANTS = {"zh": ("zh", "zh-hans", "zh-cn")}
MAX_ALIASES = 1
ALIAS_LANGS = ("en", "es", "pt", "fr")  # zh/ja altLabels are too noisy: labels only
BINOMIAL = re.compile(r"^[A-Z][a-z]+ (?:[x\u00d7] )?[a-z-]{3,}(?: (?:(?:subsp|var|f|ssp)\.? )?[a-z-]{3,})?$")
CJK = re.compile(r"[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]")
LATIN = re.compile(r"^[A-Za-z\u00c0-\u024f0-9 '\u2019().,/&-]+$")


def lang_ok(lang, v):
    """Drop binomials and values whose script does not match the language."""
    if BINOMIAL.match(v):
        return False
    if lang in ("zh", "ja"):
        return bool(CJK.search(v))
    return bool(LATIN.match(v))
BAD_SCI = (None, "", "TODO", "N/A", "Unknown")


def http_json(url, params):
    CACHE.mkdir(parents=True, exist_ok=True)
    key = hashlib.sha256((url + json.dumps(params, sort_keys=True)).encode()).hexdigest()[:24]
    f = CACHE / f"{key}.json"
    if f.exists():
        return json.loads(f.read_text(encoding="utf-8"))
    req = urllib.request.Request(url + "?" + urllib.parse.urlencode(params),
                                 headers={"User-Agent": UA, "Accept": "application/json"})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                data = json.load(r)
            break
        except Exception:
            if attempt == 4:
                raise
            time.sleep(10 * (attempt + 1))
    f.write_text(json.dumps(data, sort_keys=True), encoding="utf-8")
    time.sleep(1)  # be polite
    return data


def sparql(q):
    return http_json(SPARQL, {"query": q, "format": "json"})["results"]["bindings"]


def qid_of(b):
    return b["value"].rsplit("/", 1)[-1]


def values(qids):
    return " ".join(f"wd:{q}" for q in qids)


def fetch(qids):
    """qid -> {sci, labels{lang:str}, aliases{lang:[str]}, family, genus}; names only used for food items"""
    qids = sorted(set(qids))
    out = {q: {"sci": None, "labels": {}, "aliases": {}, "family": None, "genus": None} for q in qids}
    langs = ",".join(f'"{v}"' for ls in LANGS for v in LANG_VARIANTS.get(ls, (ls,)))
    back = {v: ls for ls in LANGS for v in LANG_VARIANTS.get(ls, (ls,))}
    for i in range(0, len(qids), 40):
        part = values(qids[i:i + 40])
        for r in sparql(f"SELECT ?i ?v WHERE {{ VALUES ?i {{ {part} }} ?i wdt:P225 ?v }}"):
            cur = out[qid_of(r["i"])]
            cur["sci"] = min(filter(None, [cur["sci"], r["v"]["value"]]))
        q = (f"SELECT ?i ?k ?v WHERE {{ VALUES ?i {{ {part} }} "
             f'{{ ?i rdfs:label ?v BIND("l" AS ?k) }} UNION {{ ?i skos:altLabel ?v BIND("a" AS ?k) }} '
             f"FILTER(LANG(?v) IN ({langs})) }}")
        raw = {}
        for r in sparql(q):
            lang = back[r["v"]["xml:lang"]]
            raw.setdefault((qid_of(r["i"]), lang), []).append((r["k"]["value"], r["v"]["xml:lang"], r["v"]["value"]))
        for (qid, lang), rows in raw.items():
            pref = {v: n for n, v in enumerate(LANG_VARIANTS.get(lang, (lang,)))}
            labels = sorted((pref[x], v) for k, x, v in rows if k == "l" and lang_ok(lang, v))
            if labels:
                out[qid]["labels"][lang] = labels[0][1]
            out[qid]["aliases"][lang] = sorted({v for k, x, v in rows if k == "a" and lang_ok(lang, v)})
        lineage(out, qids[i:i + 40])
    return out


def lineage(out, qids):
    """Walk P171 (parent taxon) upwards with cheap per-level queries; record family/genus."""
    frontier = {(q, q) for q in qids}  # (node, origin item)
    for _ in range(12):
        if not frontier:
            break
        part = values(sorted({n for n, _ in frontier}))
        rows = sparql(f"SELECT ?i ?r ?n ?p WHERE {{ VALUES ?i {{ {part} }} "
                      f"OPTIONAL {{ ?i wdt:P105 ?r }} OPTIONAL {{ ?i wdt:P225 ?n }} OPTIONAL {{ ?i wdt:P171 ?p }} }}")
        nxt = set()
        for r, origin in sorted(((r, o) for r in rows for n, o in frontier if n == qid_of(r["i"])),
                                key=lambda t: (json.dumps(t[0], sort_keys=True), t[1])):
            rank = qid_of(r["r"]) if "r" in r else None
            if rank in ("Q35409", "Q34740") and "n" in r:
                key = "family" if rank == "Q35409" else "genus"
                cur = out[origin][key]
                out[origin][key] = r["n"]["value"] if cur is None else min(cur, r["n"]["value"])
            if "p" in r:
                nxt.add((qid_of(r["p"]), origin))
        frontier = {(q, o) for q, o in nxt if not (out[o]["family"] and out[o]["genus"])}


def clean_names(food, sci):
    """Labels/aliases from the food item: drop binomials, repeats of the sci name; cap aliases."""
    sci = (sci or "").casefold()
    labels = {l: v for l, v in food["labels"].items() if lang_ok(l, v) and v.casefold() != sci}
    aliases = {}
    for l, vs in food["aliases"].items():
        if l not in ALIAS_LANGS:
            continue
        seen = {labels.get(l, "").casefold(), sci}
        keep = []
        for v in vs:
            if lang_ok(l, v) and v.casefold() not in seen:
                seen.add(v.casefold())
                keep.append(v)
        if keep:
            aliases[l] = keep[:MAX_ALIASES]
    return labels, aliases


def todo(v):
    return v in BAD_SCI


def apply(fm, taxon_qid, taxon, food_qid, food, retrieved, force):
    fm = dict(fm)
    if food_qid and food:
        labels, aliases = clean_names(food, taxon["sci"])
    else:
        labels, aliases = {}, {}
    if taxon["sci"] and (force or todo(fm.get("scientific_name"))):
        fm["scientific_name"] = taxon["sci"]
    reg = dict(fm.get("scientific_registry") or {})
    for k in ("family", "genus"):
        if taxon[k] and (force or todo(reg.get(k))):
            reg[k] = taxon[k]
    if reg:
        fm["scientific_registry"] = reg
    i18n = {l: dict(v or {}) for l, v in (fm.get("i18n") or {}).items()}
    for l, label in labels.items():
        if force or todo(i18n.get(l, {}).get("common_name")):
            i18n.setdefault(l, {})["common_name"] = label
    if i18n:
        fm["i18n"] = dict(sorted(i18n.items()))
    al = {l: list(v) for l, v in (fm.get("aliases") or {}).items()}
    for l, vs in aliases.items():
        have = {x.casefold() for x in al.get(l, [])}
        add = [v for v in vs if v.casefold() not in have]
        if add:
            al[l] = al.get(l, []) + add
    if al:
        fm["aliases"] = dict(sorted(al.items()))
    qids = [taxon_qid] + ([food_qid] if food_qid and food else [])
    fm["sources"] = [x for x in (fm.get("sources") or []) if not str(x).startswith("Wikidata (")] + \
        [f"Wikidata ({q})" for q in qids]
    ds = [d for d in (fm.get("data_sources") or []) if d.get("name") != "Wikidata"]
    fm["data_sources"] = ds + [{"name": "Wikidata", "id": q, "licence": "CC0-1.0", "retrieved": retrieved}
                               for q in qids]
    return fm


def strip_todos(fm):
    """Remove placeholder 'TODO' i18n/registry keys (unknown stays absent)."""
    fm = dict(fm)
    i18n = {}
    for l, v in (fm.get("i18n") or {}).items():
        v = {k: x for k, x in (v or {}).items() if not todo(x) and x != []}
        if v:
            i18n[l] = v
    if "i18n" in fm:
        if i18n:
            fm["i18n"] = i18n
        else:
            del fm["i18n"]
    reg = {k: x for k, x in (fm.get("scientific_registry") or {}).items() if not todo(x)}
    if "scientific_registry" in fm:
        if any(reg.get(k) for k in ("family", "genus")):
            fm["scientific_registry"] = reg
        else:
            del fm["scientific_registry"]
    return fm


def run(check, force):
    spec = yaml.safe_load(MAPPING.read_text(encoding="utf-8"))
    retrieved = spec.get("wikidata_retrieved") or spec["retrieved"]
    entries = {s: e for s, e in (spec.get("wikidata") or {}).items()
               if e.get("confidence") in ("high", "medium") and e.get("taxon_qid")}
    files = find_ingredient_files()
    taxa = fetch(e["taxon_qid"] for e in entries.values()) if entries else {}
    foods = fetch(e["food_qid"] for e in entries.values() if e.get("food_qid")) if entries else {}
    changed, written = [], 0
    for slug, path in sorted(files.items()):
        e = entries.get(slug)
        if e is None:
            continue
        text = path.read_text(encoding="utf-8")
        fm = apply(load(path), e["taxon_qid"], taxa[e["taxon_qid"]], e.get("food_qid"),
                   foods.get(e.get("food_qid")), retrieved, force)
        written += 1
        out = dump_json(strip_todos(fm))
        if out != text:
            changed.append(path)
            if not check:
                path.write_text(out, encoding="utf-8")
    missing = sorted(s for s in entries if s not in files)
    withsci = sum(bool(taxa[e["taxon_qid"]]["sci"]) for e in entries.values())
    withlab = sum(bool(foods.get(e.get("food_qid"), {}).get("labels")) for e in entries.values())
    print(f"mapped={len(entries)} applied={written} with_scientific_name={withsci} "
          f"with_food_labels={withlab} changed={len(changed)} missing_files={len(missing)}")
    if check and changed:
        print("would change:", *[str(p.relative_to(ROOT)) for p in changed[:10]], sep="\n  ")
        return 1
    return 0


def resolve():
    """Propose QIDs: exact scientific-name match, else unique exact English taxon label."""
    spec = yaml.safe_load(MAPPING.read_text(encoding="utf-8"))
    have = set(spec.get("wikidata") or {})
    lines = [] if have else ["wikidata_retrieved: '%s'" % time.strftime("%Y-%m-%d"), "wikidata:"]
    taxon = "?i wdt:P31 wd:Q16521 ; wdt:P225 ?n ."
    for slug, path in sorted(find_ingredient_files().items()):
        if slug in have:
            continue
        fm, _ = load(path)
        sci = fm.get("scientific_name")
        found = []
        if not todo(sci) and len(str(sci).split()) <= 3:
            s = str(sci).replace('"', "")
            found = [qid_of(r["i"]) for r in sparql(f'SELECT ?i WHERE {{ ?i wdt:P225 "{s}" . {taxon} }}')]
            conf = "high"
        else:
            full = str(fm.get("name") or "")
            if full.endswith(", raw"):
                full = full[:-5]
            name = full.strip()
            if "," in name:
                continue  # USDA descriptions with other qualifiers are not exact common names
            hits = http_json(API, {"action": "wbsearchentities", "search": name, "language": "en",
                                   "type": "item", "limit": 10, "format": "json"}).get("search", [])
            cands = [h["id"] for h in hits if h.get("label", "").casefold() == name.casefold()]
            if cands:
                rows = sparql(f"SELECT DISTINCT ?i WHERE {{ VALUES ?i {{ {values(cands)} }} {taxon} }}")
                found = [qid_of(r["i"]) for r in rows]
            conf = "medium"
        found = sorted(set(found), key=lambda q: int(q[1:]))
        if len(found) == 1:
            lines.append(f"  {slug}: {{taxon_qid: {found[0]}, confidence: {conf}}}")
    if len(lines) > (0 if have else 2):
        with open(MAPPING, "a", encoding="utf-8") as fh:
            fh.write("\n".join(lines) + "\n")
    print(f"proposed={len(lines) - (0 if have else 2)}")
    return 0


def selftest():
    # bad examples from the gos-d1 judge review
    bad = [("en", "Oryza molida"), ("en", "Bird's nest"), ("pt", "\u5bb6\u732a"), ("es", "\u5357\u9e64\u864e"),
           ("en", "Daucus carota"), ("fr", "Sus scrofa domesticus"), ("pt", "Oryza sativa subsp. japonica"),
           ("zh", "rice"), ("ja", "arroz")]
    for l, v in bad:
        if (l, v) != ("en", "Bird's nest"):
            assert not lang_ok(l, v), (l, v)
    assert lang_ok("en", "Bird's nest")  # script ok; real fix is taking names from the food item
    for l, v in [("en", "rice"), ("es", "az\u00facar"), ("pt", "arroz"), ("fr", "carotte"), ("zh", "\u80e1\u841d\u535c"),
                 ("ja", "\u30cb\u30f3\u30b8\u30f3")]:
        assert lang_ok(l, v), (l, v)
    taxon = {"sci": "Persea americana", "family": "Lauraceae", "genus": "Persea", "labels": {"en": "Oryza molida"},
             "aliases": {"en": ["Bird's nest"]}}
    food = {"labels": {"en": "avocado", "es": "Persea americana", "pt": "\u5bb6\u732a"},
            "aliases": {"en": ["alligator pear", "avocado", "x1", "x2"], "zh": ["rice", "\u9cc4\u68a8"]}}
    fm = apply({"scientific_name": "TODO", "i18n": {"en": {"common_name": "TODO"}}},
               "Q37153", taxon, "Q961769", food, "2026-01-01", False)
    assert fm["scientific_name"] == "Persea americana"
    assert fm["i18n"] == {"en": {"common_name": "avocado"}}  # taxon labels ignored; es==sci and pt CJK dropped
    assert fm["aliases"] == {"en": ["alligator pear"]}  # zh aliases not imported
    assert fm["scientific_registry"] == {"family": "Lauraceae", "genus": "Persea"}
    assert fm["sources"] == ["Wikidata (Q37153)", "Wikidata (Q961769)"]
    assert fm["data_sources"][0] == {"name": "Wikidata", "id": "Q37153", "licence": "CC0-1.0", "retrieved": "2026-01-01"}
    assert apply(fm, "Q37153", taxon, "Q961769", food, "2026-01-01", False) == fm  # idempotent
    nofood = apply({}, "Q37153", taxon, None, None, "d", False)  # no food item -> no labels
    assert "i18n" not in nofood and "aliases" not in nofood and nofood["scientific_name"] == "Persea americana"
    keep = apply({"scientific_name": "Curated", "i18n": {"en": {"common_name": "keep"}}}, "Q1", taxon, "Q2", food, "d", False)
    assert keep["scientific_name"] == "Curated" and keep["i18n"]["en"]["common_name"] == "keep"
    s = strip_todos({"i18n": {"en": {"common_name": "TODO", "other_names": []}, "es": {"common_name": "A"}},
                     "scientific_registry": {"family": "TODO", "genus": "TODO"}})
    assert s == {"i18n": {"es": {"common_name": "A"}}}
    print("selftest ok")
    return 0


if __name__ == "__main__":
    a = sys.argv[1:]
    if "--selftest" in a:
        sys.exit(selftest())
    if "--check" in a and selftest():
        sys.exit(1)
    if "--resolve" in a:
        sys.exit(resolve())
    sys.exit(run("--check" in a, "--force" in a))
