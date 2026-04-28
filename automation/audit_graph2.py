import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import os
os.chdir(r'E:\scripts-python\gastronomic-open-standard-GOS')
import json
from collections import Counter
import pathlib

with open('site/graph-data.json', 'r', encoding='utf-8') as f:
    g = json.load(f)

nodes_by_id = {n['id']: n for n in g['nodes']}
edges_by_type = {}
for e in g['edges']:
    t = e['type']
    if t not in edges_by_type:
        edges_by_type[t] = []
    edges_by_type[t].append(e)

# === RECIPE ANALYSIS ===
recipe_nodes = [n for n in g['nodes'] if n['type'] == 'recipe']
uses_edges = edges_by_type.get('USES_INGREDIENT', [])
recipes_with_ingredients = set(e['source'] for e in uses_edges)
recipes_without_ingredients = [r for r in recipe_nodes if r['id'] not in recipes_with_ingredients]

print('=== RECIPES MISSING INGREDIENT CONNECTIONS ({}) ==='.format(len(recipes_without_ingredients)))
for r in recipes_without_ingredients[:20]:
    print('  [X] ' + r['label'])

ing_per_recipe = Counter(e['source'] for e in uses_edges)
print('\n=== INGREDIENT COUNT PER RECIPE ===')
counts = Counter(ing_per_recipe.values())
for c, n in sorted(counts.items()):
    print('  {} ingredients: {} recipes'.format(c, n))

recipes_few_ingredients = [rid for rid, c in ing_per_recipe.items() if c < 3]
print('\nRecipes with < 3 ingredients: {}'.format(len(recipes_few_ingredients)))
for rid in recipes_few_ingredients[:10]:
    rlabel = nodes_by_id.get(rid, {}).get('label', rid)
    print('  [!] ' + rlabel + ' ({} ingredients)'.format(ing_per_recipe[rid]))

# === INGREDIENT ANALYSIS ===
ingredient_nodes = [n for n in g['nodes'] if n['type'] == 'ingredient']
belongs_to_edges = edges_by_type.get('BELONGS_TO', [])
ingredients_with_category = set(e['source'] for e in belongs_to_edges)
ingredients_without_category = [n for n in ingredient_nodes if n['id'] not in ingredients_with_category]

print('\n=== INGREDIENTS MISSING CATEGORY ({}) ==='.format(len(ingredients_without_category)))
for n in ingredients_without_category[:30]:
    print('  [X] ' + n['label'])

# === REGION ANALYSIS ===
from_region_edges = edges_by_type.get('FROM_REGION', [])
recipes_with_region = set(e['source'] for e in from_region_edges)
recipes_without_region = [r for r in recipe_nodes if r['id'] not in recipes_with_region]

print('\n=== RECIPES MISSING REGION ({}) ==='.format(len(recipes_without_region)))
for r in recipes_without_region[:20]:
    print('  [X] ' + r['label'])

# === FLAVOR ANALYSIS ===
has_flavor_edges = edges_by_type.get('HAS_FLAVOR', [])
recipes_with_flavor = set(e['source'] for e in has_flavor_edges)
recipes_without_flavor = [r for r in recipe_nodes if r['id'] not in recipes_with_flavor]

print('\n=== RECIPES MISSING FLAVOR ({}) ==='.format(len(recipes_without_flavor)))
for r in recipes_without_flavor[:20]:
    print('  [X] ' + r['label'])

# === MISSING EDGE TYPES ===
print('\n=== MISSING EDGE TYPES ===')
print('  RELATED_DISHES: {}'.format(len(edges_by_type.get('RELATED_DISHES', []))))
print('  PLACE (city/state): {}'.format(len(edges_by_type.get('PLACE', []))))
print('  TECHNIQUE: {}'.format(len(edges_by_type.get('TECHNIQUE', []))))

# === Sample edges ===
print('\n=== Sample USES_INGREDIENT edges ===')
for e in uses_edges[:5]:
    src = nodes_by_id.get(e['source'], {}).get('label', e['source'])
    tgt = nodes_by_id.get(e['target'], {}).get('label', e['target'])
    print('  {} --[{}]--> {}'.format(src, e['type'], tgt))

print('\n=== Sample HAS_FLAVOR edges ===')
for e in has_flavor_edges[:5]:
    src = nodes_by_id.get(e['source'], {}).get('label', e['source'])
    tgt = nodes_by_id.get(e['target'], {}).get('label', e['target'])
    print('  {} --[{}]--> {}'.format(src, e['type'], tgt))

print('\n=== Sample BELONGS_TO edges ===')
for e in belongs_to_edges[:5]:
    src = nodes_by_id.get(e['source'], {}).get('label', e['source'])
    tgt = nodes_by_id.get(e['target'], {}).get('label', e['target'])
    print('  {} --[{}]--> {}'.format(src, e['type'], tgt))

# === Check dishes directory ===
dishes_dir = pathlib.Path('dishes')
md_files = [f for f in dishes_dir.rglob('*.md') if not f.name.startswith('_') and f.name != 'README.md']
print('\n=== DISHES DIRECTORY ===')
print('Total .md files: {}'.format(len(md_files)))
for f in sorted(md_files)[:5]:
    print('  ' + str(f))
