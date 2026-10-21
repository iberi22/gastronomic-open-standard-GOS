#!/usr/bin/env python3
"""Fill EU-14 `allergens` on every canonical ingredient and derive dish allergens.

Canonical trees (see site/scripts/copy-content.js):
  - ingredients: site/src/content/ingredients/**/*.json (JSON, body in body_md)
  - dishes:      dishes/**/*.md (ROOT, copied to site/src/content/dishes by
                 `node site/scripts/copy-content.js`; do not edit the copy)

Rules live in allergens-map.yml (reviewed). Ambiguous items get ['unknown'],
never an implied empty list. Dish allergens = union over main ingredients:
a resolved slug contributes the ingredient's list; an unresolved ingredient
contributes its positive text matches and always 'unknown' (never allergen-free).

Usage:
  python3 scripts/enrich/allergens.py             # write (idempotent)
  python3 scripts/enrich/allergens.py --check     # exit 1 if any file would change
  python3 scripts/enrich/allergens.py --selftest  # regression tests
"""

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
MAP_PATH = HERE / 'allergens-map.yml'
INGREDIENTS_DIR = REPO / 'site' / 'src' / 'content' / 'ingredients'
DISHES_DIR = REPO / 'dishes'
UNKNOWN = 'unknown'
FM_RE = re.compile(r'^---\n(.*?\n)---\n', re.S)
TOP_KEY_RE = re.compile(r'^([A-Za-z_][A-Za-z0-9_]*):')
# Aliases joining two foods ("aceite o mantequilla") name two items: never match them.
CONNECTORS = (' o ', ' y ', ' e ', ' or ', ' and ')


def norm(text):
    t = unicodedata.normalize('NFKD', str(text)).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', ' ', t.lower()).strip()


def _padded(text):
    return f' {norm(text)} '


def load_config(path=MAP_PATH):
    raw = yaml.safe_load(Path(path).read_text(encoding='utf8'))
    cats = set(raw['categories'])
    for phrase in raw['phrase_overrides']:
        assert set(phrase['allergens'] or []) <= cats, phrase
    for cat in raw['keywords']:
        assert cat in cats, cat
    return {
        'categories': cats,
        'phrases': [
            (f' {norm(p["phrase"])} ', sorted(p['allergens'] or []))
            for p in raw['phrase_overrides']
        ],
        'keywords': {
            cat: [f' {norm(t)} ' for t in terms]
            for cat, terms in raw['keywords'].items()
        },
        'none': [f' {norm(t)} ' for t in raw['none_keywords']],
        'slug_overrides': {
            slug: (None if v is None else sorted(v))
            for slug, v in (raw['slug_overrides'] or {}).items()
        },
        'group_defaults': raw['group_defaults'],
    }


def classify_text(text, cfg, positive_only=False):
    """Return sorted EU-14 categories, [] (reviewed none) or None (unknown).

    positive_only=True ignores reviewed-none results ([] phrases and none_keywords),
    so an unresolved item can only add known allergens, never claim none.
    """
    t = _padded(text)
    for phrase, cats in cfg['phrases']:
        if phrase in t:
            if positive_only and not cats:
                continue
            return list(cats)
    hits = {cat for cat, terms in cfg['keywords'].items() if any(x in t for x in terms)}
    if hits:
        return sorted(hits)
    if positive_only:
        return None
    if any(x in t for x in cfg['none']):
        return []
    return None


def is_two_food_alias(alias):
    text = str(alias)
    return '/' in text or any(c in _padded(text) for c in CONNECTORS)


def ingredient_allergens(slug, data, cfg):
    """Return sorted categories, [] or None (unknown)."""
    if slug in cfg['slug_overrides']:
        return cfg['slug_overrides'][slug]
    aliases = data.get('aliases') or {}
    parts = [slug.replace('_', ' '), str(data.get('name') or '')]
    for values in aliases.values() if isinstance(aliases, dict) else []:
        parts.extend(str(v) for v in (values or []) if not is_two_food_alias(v))
    found = classify_text(' '.join(parts), cfg)
    if found is not None:
        return found
    group = data.get('group')
    if group in cfg['group_defaults']:
        default = cfg['group_defaults'][group]
        return None if default is None else sorted(default)
    return None


def dish_allergens(data, index, cfg):
    mains = data.get('main_ingredients') or []
    if not mains:
        return [UNKNOWN]
    slugs = data.get('main_ingredient_slugs') or []
    out = set()
    for i, name in enumerate(mains):
        slug = slugs[i] if i < len(slugs) else None
        if slug and slug in index:
            resolved = index[slug]
            out.update([UNKNOWN] if resolved is None else resolved)
            continue
        # Unresolved: keep positive text matches, but the rest stays unknown.
        out.update(classify_text(str(name), cfg, positive_only=True) or [])
        out.add(UNKNOWN)
    return sorted(out)


def split_frontmatter(text):
    m = FM_RE.match(text)
    if not m:
        return None, None
    return m.group(1), text[m.end():]


def set_block(fm, key, values):
    """Replace or insert `key:` as a top-level block, keeping key order sorted."""
    lines = fm.splitlines()
    block = [f'{key}: []'] if not values else [f'{key}:'] + [f'- {v}' for v in values]
    start = next((i for i, l in enumerate(lines) if l.startswith(f'{key}:')), None)
    if start is not None:
        end = start + 1
        while end < len(lines) and not TOP_KEY_RE.match(lines[end]):
            end += 1
        lines[start:end] = block
    else:
        pos = len(lines)
        for i, line in enumerate(lines):
            m = TOP_KEY_RE.match(line)
            if m and m.group(1) > key:
                pos = i
                break
        lines[pos:pos] = block
    return '\n'.join(lines) + '\n'


def set_json_key(data, key, values):
    """Set `key` keeping sorted key order (body_md stays last)."""
    if key in data:
        data[key] = values
        return data
    out, inserted = {}, False
    for k, v in data.items():
        if not inserted and k != 'body_md' and k > key:
            out[key] = values
            inserted = True
        out[k] = v
    if not inserted:
        out[key] = values
    if 'body_md' in out:
        out['body_md'] = out.pop('body_md')
    return out


def load_ingredients():
    """Map slug -> parsed canonical ingredient JSON."""
    return {p.stem: json.loads(p.read_text(encoding='utf8')) for p in sorted(INGREDIENTS_DIR.rglob('*.json'))}


def run_ingredients(cfg, check):
    stats = {'files': 0, 'changed': 0, 'known': 0, 'unknown': 0, 'errors': []}
    index = {}
    for path in sorted(INGREDIENTS_DIR.rglob('*.json')):
        stats['files'] += 1
        text = path.read_text(encoding='utf8')
        try:
            data = json.loads(text)
        except json.JSONDecodeError as exc:
            stats['errors'].append(f'{path}: {exc}')
            continue
        values = ingredient_allergens(path.stem, data, cfg)
        final = [UNKNOWN] if values is None else values
        index[path.stem] = values
        stats['unknown' if UNKNOWN in final else 'known'] += 1
        new_text = json.dumps(set_json_key(data, 'allergens', final), indent=2, ensure_ascii=False) + '\n'
        if new_text != text:
            stats['changed'] += 1
            if not check:
                path.write_text(new_text, encoding='utf8')
    return stats, index


def run_dishes(cfg, index, check):
    stats = {'files': 0, 'changed': 0, 'known': 0, 'unknown': 0, 'errors': []}
    for path in sorted(DISHES_DIR.rglob('*.md')):
        stats['files'] += 1
        text = path.read_text(encoding='utf8')
        fm, body = split_frontmatter(text)
        if fm is None:
            stats['errors'].append(f'{path}: no frontmatter')
            continue
        try:
            data = yaml.safe_load(fm) or {}
        except yaml.YAMLError as exc:
            stats['errors'].append(f'{path}: {exc}')
            continue
        final = dish_allergens(data, index, cfg)
        stats['unknown' if UNKNOWN in final else 'known'] += 1
        new_text = '---\n' + set_block(fm, 'allergens', final) + '---\n' + body
        if new_text != text:
            stats['changed'] += 1
            if not check:
                path.write_text(new_text, encoding='utf8')
    return stats


def run_selftest():
    """Regression tests (run with --selftest). Returns a list of failures."""
    cfg = load_config()
    failures = []

    def expect(ok, msg):
        if not ok:
            failures.append(msg)

    oil = {'name': 'Aceite Vegetal', 'group': 'Oil', 'aliases': {'es': ['aceite o mantequilla']}}
    expect('milk' not in (ingredient_allergens('aceite', oil, cfg) or []),
           'alias naming two foods ("aceite o mantequilla") leaks milk into an oil')

    got = dish_allergens({'main_ingredients': ['Carne molida'], 'main_ingredient_slugs': [None]}, {}, cfg)
    expect(UNKNOWN in got, f'unresolved dish ingredient must be unknown, got {got}')
    expect(got != [], 'unresolved dish ingredient must never be allergen-free []')

    got = dish_allergens({'main_ingredients': ['Huevo'], 'main_ingredient_slugs': ['huevo']}, {'huevo': ['eggs']}, cfg)
    expect(got == ['eggs'], f'resolved slug must use the ingredient allergens, got {got}')

    for slug, data in load_ingredients().items():
        if data.get('group') == 'Oil':
            expect('milk' not in (ingredient_allergens(slug, data, cfg) or []),
                   f'canonical oil {slug} has milk')
    return failures


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--check', action='store_true', help='exit 1 if files are not up to date; write nothing')
    ap.add_argument('--selftest', action='store_true', help='run regression tests')
    args = ap.parse_args(argv)
    if args.selftest:
        fails = run_selftest()
        for f in fails:
            print(f'FAIL {f}')
        print('selftest OK' if not fails else f'selftest FAILED ({len(fails)})')
        return 1 if fails else 0
    cfg = load_config()

    ing_stats, index = run_ingredients(cfg, args.check)
    dish_stats = run_dishes(cfg, index, args.check)

    for label, s in (('ingredients', ing_stats), ('dishes', dish_stats)):
        print(f"{label}: files={s['files']} known={s['known']} unknown={s['unknown']} "
              f"would_change={s['changed']} errors={len(s['errors'])}")
        for err in s['errors'][:10]:
            print(f'  ERROR {err}')
    bad = ing_stats['errors'] or dish_stats['errors']
    if args.check and (ing_stats['changed'] or dish_stats['changed'] or bad):
        print('CHECK FAILED: run `python3 scripts/enrich/allergens.py` to update.')
        return 1
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
