import json
from collections import Counter

import os
os.chdir(r'E:\scripts-python\gastronomic-open-standard-GOS')
with open('site/graph-data.json', 'r', encoding='utf-8') as f:
    g = json.load(f)

# Count node types
node_types = Counter(n['type'] for n in g['nodes'])
edge_types = Counter(e['type'] for e in g['edges'])

print('=== NODE TYPES ===')
for t, c in sorted(node_types.items()):
    print(f'  {t}: {c}')
print()
print('=== EDGE TYPES ===')
for t, c in sorted(edge_types.items()):
    print(f'  {t}: {c}')
print()
print(f'Total nodes: {len(g["nodes"])}')
print(f'Total edges: {len(g["edges"])}')

# Find recipe nodes
recipe_nodes = [n for n in g['nodes'] if n['type'] == 'recipe']
print(f'\nRecipe nodes: {len(recipe_nodes)}')

# Find ingredient nodes
ingredient_nodes = [n for n in g['nodes'] if n['type'] == 'ingredient']
print(f'Ingredient nodes: {len(ingredient_nodes)}')

# Find region nodes
region_nodes = [n for n in g['nodes'] if n['type'] == 'region']
print(f'Region nodes: {len(region_nodes)}')

# Check recipes with ingredients
recipes_with_ingredients = set()
edges_by_type = {}
for e in g['edges']:
    t = e['type']
    if t not in edges_by_type:
        edges_by_type[t] = []
    edges_by_type[t].append(e)
    if t == 'USES':
        recipes_with_ingredients.add(e['source'])

print(f'\nRecipes with USES edges: {len(recipes_with_ingredients)}')
print(f'Recipes without any USES edge: {len(recipe_nodes) - len(recipes_with_ingredients)}')

# Check ingredient categories
cat_nodes = [n for n in g['nodes'] if n['type'] == 'category']
print(f'\nCategory nodes: {len(cat_nodes)}')
print(f'  Categories: {[n["label"] for n in cat_nodes]}')

# Check BELONGS_TO edges
belongs_to_edges = edges_by_type.get('BELONGS_TO', [])
print(f'BELONGS_TO edges: {len(belongs_to_edges)}')
ingredients_with_category = set(e['source'] for e in belongs_to_edges)
print(f'Ingredients with BELONGS_TO: {len(ingredients_with_category)}')
ingredients_without_category = set(n['id'] for n in ingredient_nodes) - ingredients_with_category
print(f'Ingredients WITHOUT BELONGS_TO: {len(ingredients_without_category)}')

# Check RELATED_DISHES
related_edges = edges_by_type.get('RELATED_DISHES', [])
print(f'\nRELATED_DISHES edges: {len(related_edges)}')

# Check PLACE edges
place_edges = edges_by_type.get('PLACE', [])
print(f'PLACE edges: {len(place_edges)}')

# Check TECHNIQUE edges
tech_edges = edges_by_type.get('TECHNIQUE', [])
print(f'TECHNIQUE edges: {len(tech_edges)}')

# Check recipes per region
region_recipes = {}
for e in edges_by_type.get('FROM_REGION', []):
    r = e['target']
    if r not in region_recipes:
        region_recipes[r] = []
    region_recipes[r].append(e['source'])

print(f'\nRecipes per region:')
for rid, rlist in sorted(region_recipes.items()):
    region_label = next((n['label'] for n in g['nodes'] if n['id'] == rid), rid)
    print(f'  {region_label}: {len(rlist)}')

# Sample some recipe connections
print('\n=== Sample Recipe Connections ===')
for r in recipe_nodes[:5]:
    rid = r['id']
    my_edges = [e for e in g['edges'] if e['source'] == rid or e['target'] == rid]
    edge_summary = Counter(e['type'] for e in my_edges)
    print(f"  {r['label']}: {dict(edge_summary)}")
