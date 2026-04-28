# Recipe Metadata Audit Script
import os
import sys
import random
import re
import yaml
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

BASE = r"E:\scripts-python\gastronomic-open-standard-GOS"
AUTOMATION_DIR = os.path.join(BASE, "automation")

def get_md_files(dirpath):
    files = []
    for root, dirs, files_list in os.walk(dirpath):
        for f in files_list:
            if f.endswith('.md') and f not in ['README.md', 'COLOMBIAN_RECIPES_PLAN.md']:
                files.append(os.path.join(root, f))
    return files

colombian = get_md_files(os.path.join(BASE, 'dishes', 'colombian'))
china = get_md_files(os.path.join(BASE, 'dishes', 'china'))
peruvian = get_md_files(os.path.join(BASE, 'dishes', 'peruvian'))

print(f"Total files: Colombian={len(colombian)}, China={len(china)}, Peruvian={len(peruvian)}")

random.seed(42)
sample_colombian = random.sample(colombian, min(12, len(colombian)))
sample_china = random.sample(china, min(7, len(china)))
sample_peruvian = peruvian
all_samples = sample_colombian + sample_china + sample_peruvian
random.shuffle(all_samples)

print(f"Sampled {len(all_samples)} recipes\n")

def parse_frontmatter(content):
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if match:
        try:
            return yaml.safe_load(match.group(1))
        except Exception as e:
            return {'_parse_error': str(e)}
    return {}

def extract_ingredients_section(content):
    # Match ##[emoji]? [Ii]ngredientes heading
    match = re.search(r'^#{2,3}\s*.*?[Ii]ngredientes\s*\n(.*?)(?=^#{1,3}\s|\Z)', content, re.MULTILINE | re.DOTALL)
    if not match:
        return []
    section = match.group(1)
    ingredients = []
    for line in section.split('\n'):
        line = line.strip()
        if line.startswith('- ') or line.startswith('* '):
            item = line[2:].strip()
            item = re.sub(r'^[\d\/\.\s]+', '', item)
            item = re.sub(r'\s*\([^)]*\)', '', item)
            item = item.strip(' ,:-')
            if item:
                ingredients.append(item.lower())
        elif line and not line.startswith('#'):
            item = line.strip(' ,:-')
            if item:
                ingredients.append(item.lower())
    return ingredients

def normalize_ingredient(name):
    if not isinstance(name, str):
        name = str(name) if name else ''
    name = re.sub(r'\s*\([^)]*\)', '', name)
    name = re.sub(r'^[\d\/\.\s]+', '', name)
    name = name.strip(' ,:-').lower()
    return name

def check_ingredient_match(frontmatter_ingredients, content_ingredients):
    if not frontmatter_ingredients:
        return False, []
    fm_normalized = []
    for i in frontmatter_ingredients:
        if isinstance(i, dict):
            name = i.get('name', '') or i.get('ingredient', '')
        else:
            name = str(i)
        fm_normalized.append(normalize_ingredient(name))
    content_normalized = [normalize_ingredient(i) for i in content_ingredients]
    matched = []
    unmatched_content = []
    for ci in content_normalized:
        found = False
        for fi in fm_normalized:
            if ci and fi and (ci in fi or fi in ci or (ci.split() and fi.split() and ci.split()[0] == fi.split()[0])):
                found = True
                break
        if found:
            matched.append(ci)
        else:
            unmatched_content.append(ci)
    if not content_normalized:
        return True, []
    match_ratio = len(matched) / len(content_normalized)
    return match_ratio >= 0.7, unmatched_content

def get_image_status(fm):
    # Handle both 'image' (string) and 'images' (array)
    img = fm.get('image')
    if img:
        return True
    imgs = fm.get('images', [])
    if isinstance(imgs, list) and len(imgs) > 0:
        return True
    return False

# Audit each recipe
results = []
for filepath in all_samples:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        results.append({'file': filepath, 'error': str(e)})
        continue
    
    fm = parse_frontmatter(content)
    content_ingredients = extract_ingredients_section(content)
    
    region = fm.get('region')
    difficulty = fm.get('difficulty')
    prep_time = fm.get('prep_time')
    cook_time = fm.get('cook_time')
    has_image = get_image_status(fm)
    main_ingredients = fm.get('main_ingredients', [])
    sensory = fm.get('sensory', {})
    
    has_main_ingredients = bool(main_ingredients)
    has_sensory_flavor = bool(sensory.get('flavor'))
    has_sensory_texture = bool(sensory.get('texture'))
    has_sensory_aroma = bool(sensory.get('aroma'))
    has_sensory = has_sensory_flavor and has_sensory_texture and has_sensory_aroma
    has_region = bool(region)
    has_difficulty = bool(difficulty)
    has_prep_time = bool(prep_time)
    has_cook_time = bool(cook_time)
    
    ing_list = main_ingredients if isinstance(main_ingredients, list) else []
    ingredient_match, unmatched = check_ingredient_match(ing_list, content_ingredients)
    has_content_ingredients = len(content_ingredients) > 0
    has_fm_main_ingredients = bool(main_ingredients)
    content_has_but_fm_not = has_content_ingredients and not has_fm_main_ingredients
    recipe_name = os.path.basename(os.path.dirname(filepath)) if filepath else 'unknown'
    
    results.append({
        'file': filepath,
        'recipe_name': recipe_name,
        'folder': os.path.basename(os.path.dirname(os.path.dirname(filepath))),
        'fm': fm,
        'has_main_ingredients': has_main_ingredients,
        'has_sensory_flavor': has_sensory_flavor,
        'has_sensory_texture': has_sensory_texture,
        'has_sensory_aroma': has_sensory_aroma,
        'has_sensory': has_sensory,
        'has_region': has_region,
        'has_difficulty': has_difficulty,
        'has_prep_time': has_prep_time,
        'has_cook_time': has_cook_time,
        'has_image': has_image,
        'ingredient_match': ingredient_match,
        'content_has_ingredients': has_content_ingredients,
        'fm_has_main_ingredients': has_fm_main_ingredients,
        'content_has_but_fm_not': content_has_but_fm_not,
        'content_ingredients': content_ingredients,
        'main_ingredients': ing_list,
        'unmatched_content_ingredients': unmatched,
        'sensory': sensory,
    })

# Generate report
errors = sum(1 for r in results if 'error' in r)
valid = [r for r in results if 'error' not in r]
n = len(valid)

if n > 0:
    complete_fm = sum(1 for r in valid if r['has_main_ingredients'] and r['has_region'] and r['has_difficulty'] and r['has_prep_time'] and r['has_cook_time'] and r['has_image'])
    has_sensory_count = sum(1 for r in valid if r['has_sensory'])
    has_sensory_flavor_count = sum(1 for r in valid if r['has_sensory_flavor'])
    has_sensory_texture_count = sum(1 for r in valid if r['has_sensory_texture'])
    has_sensory_aroma_count = sum(1 for r in valid if r['has_sensory_aroma'])
    has_main_ing = sum(1 for r in valid if r['has_main_ingredients'])
    has_region_count = sum(1 for r in valid if r['has_region'])
    has_difficulty_count = sum(1 for r in valid if r['has_difficulty'])
    has_prep_time_count = sum(1 for r in valid if r['has_prep_time'])
    has_cook_time_count = sum(1 for r in valid if r['has_cook_time'])
    has_image_count = sum(1 for r in valid if r['has_image'])
    has_cooking_times = sum(1 for r in valid if r['has_prep_time'] and r['has_cook_time'])
    ing_match = sum(1 for r in valid if r['ingredient_match'])
    content_no_fm = sum(1 for r in valid if r['content_has_but_fm_not'])
    has_content_ing = sum(1 for r in valid if r['content_has_ingredients'])
    
    missing_main_ing = [r for r in valid if r['content_has_ingredients'] and not r['fm_has_main_ingredients']]

    report = f"""# Recipe Metadata Quality Audit Report

**Generated:** 2026-04-13  
**Repository:** gastronomic-open-standard-GOS  
**Auditor:** Automated Python Script  

---

## Summary

| Metric | Count |
|--------|-------|
| Total recipes sampled | {n} |
| Colombian | {len(sample_colombian)} |
| China | {len(sample_china)} |
| Peruvian | {len(sample_peruvian)} |
| Parse errors | {errors} |

---

## TASK 2: Aggregate Statistics

### Frontmatter Completeness

| Field | Filled | Missing | % Filled |
|-------|--------|---------|----------|
| `main_ingredients` | {has_main_ing} | {n - has_main_ing} | {round(has_main_ing/n*100,1)}% |
| `region` | {has_region_count} | {n - has_region_count} | {round(has_region_count/n*100,1)}% |
| `difficulty` | {has_difficulty_count} | {n - has_difficulty_count} | {round(has_difficulty_count/n*100,1)}% |
| `prep_time` | {has_prep_time_count} | {n - has_prep_time_count} | {round(has_prep_time_count/n*100,1)}% |
| `cook_time` | {has_cook_time_count} | {n - has_cook_time_count} | {round(has_cook_time_count/n*100,1)}% |
| `image` (or `images` array) | {has_image_count} | {n - has_image_count} | {round(has_image_count/n*100,1)}% |

**Complete frontmatter** (all 6 fields present): {complete_fm}/{n} = **{round(complete_fm/n*100,1)}%**

### Sensory Profile

| Field | Filled | % |
|-------|--------|---|
| `sensory.flavor` | {has_sensory_flavor_count}/{n} | {round(has_sensory_flavor_count/n*100,1)}% |
| `sensory.texture` | {has_sensory_texture_count}/{n} | {round(has_sensory_texture_count/n*100,1)}% |
| `sensory.aroma` | {has_sensory_aroma_count}/{n} | {round(has_sensory_aroma_count/n*100,1)}% |
| **All 3 sensory fields** | {has_sensory_count}/{n} | {round(has_sensory_count/n*100,1)}% |

### Cooking Times

| Metric | Count | % |
|--------|-------|---|
| Has **both** `prep_time` AND `cook_time` | {has_cooking_times}/{n} | **{round(has_cooking_times/n*100,1)}%** |
| Has `prep_time` | {has_prep_time_count}/{n} | {round(has_prep_time_count/n*100,1)}% |
| Has `cook_time` | {has_cook_time_count}/{n} | {round(has_cook_time_count/n*100,1)}% |

### Content Ingredients Section

| Metric | Count | % |
|-------|-------|---|
| Has `## Ingredients` content section | {has_content_ing}/{n} | {round(has_content_ing/n*100,1)}% |

### Ingredient Matching (Frontmatter vs Content)

| Metric | Count | % |
|--------|-------|------|
| Content ## Ingredients matches frontmatter `main_ingredients` | {ing_match}/{n} | {round(ing_match/n*100,1)}% |
| Content has ingredients but **NO** frontmatter `main_ingredients` | {content_no_fm}/{n} | {round(content_no_fm/n*100,1)}% |

---

## TASK 1: Per-Recipe Audit Detail

Y=Yes (present), N=No (missing), P=Partial (some subfields present)

| Recipe | Folder | main_ing | sensory | region | diff | prep | cook | img | ing_match | Notes |
|--------|--------|----------|---------|--------|------|------|------|-----|-----------|-------|
"""
    for r in valid:
        folder = r['folder']
        name = r['recipe_name']
        sensory = r['sensory']
        
        def s(val): return "Y" if val else "N"
        status_main = "Y" if r['has_main_ingredients'] else "N"
        status_sensory = "Y" if r['has_sensory'] else ("P" if (r['has_sensory_flavor'] or r['has_sensory_texture'] or r['has_sensory_aroma']) else "N")
        status_region = "Y" if r['has_region'] else "N"
        status_diff = "Y" if r['has_difficulty'] else "N"
        status_prep = "Y" if r['has_prep_time'] else "N"
        status_cook = "Y" if r['has_cook_time'] else "N"
        status_img = "Y" if r['has_image'] else "N"
        status_ing_match = "Y" if r['ingredient_match'] else ("P" if r['content_has_ingredients'] and r['fm_has_main_ingredients'] else "N")
        
        notes = []
        if r['content_has_but_fm_not']:
            notes.append("MISSING main_ingredients")
        if r['unmatched_content_ingredients']:
            notes.append("ing_match=P")
        if not r['content_has_ingredients']:
            notes.append("no content ##Ing")
        
        notes_str = "; ".join(notes) if notes else "-"
        content_ings = r['content_ingredients'][:3] if r['content_ingredients'] else []
        main_ings = r['main_ingredients'][:3] if r['main_ingredients'] else []
        
        report += f"| {name} | {folder} | {status_main} | {status_sensory} | {status_region} | {status_diff} | {status_prep} | {status_cook} | {status_img} | {status_ing_match} | {notes_str} |\n"

    # TASK 3: Recipes with content ingredients but no frontmatter main_ingredients
    report += f"""

---

## TASK 3: Recipes with Content Ingredients but Missing frontmatter `main_ingredients`

**Total affected:** {len(missing_main_ing)} recipes

"""
    if missing_main_ing:
        report += """| # | Recipe | Folder | Content Ingredients Count |
|---|--------|--------|---------------------------|
"""
        for i, r in enumerate(missing_main_ing, 1):
            report += f"| {i} | `{r['recipe_name']}` | {r['folder']} | {len(r['content_ingredients'])} |\n"
    else:
        report += "No recipes found with content ingredients missing frontmatter `main_ingredients`.\n"

    report += f"""
---

## Most Common Missing Fields

| Field | Missing | Total | % Missing |
|-------|---------|-------|-----------|
"""
    missing_counts = {
        'image': n - has_image_count,
        'sensory.flavor': n - has_sensory_flavor_count,
        'sensory.texture': n - has_sensory_texture_count,
        'sensory.aroma': n - has_sensory_aroma_count,
        'main_ingredients': n - has_main_ing,
        'difficulty': n - has_difficulty_count,
        'prep_time': n - has_prep_time_count,
        'cook_time': n - has_cook_time_count,
        'region': n - has_region_count,
    }
    
    sorted_missing = sorted(missing_counts.items(), key=lambda x: x[1], reverse=True)
    for field, count in sorted_missing:
        pct = round(count/n*100, 1)
        report += f"| `{field}` | {count}/{n} | {pct}% |\n"

    report += f"""
---

## Notes on Methodology

- **Sample:** 20 random recipes (12 Colombian, 7 Chinese, 1 Peruvian) with seed=42 for reproducibility
- **`image` field check:** Also checks `images` array field (schema variation)
- **Ingredient matching:** Flexible matching - content ingredient considered matched if any word overlaps with frontmatter `main_ingredients`; threshold 70%
- **`## Ingredients` parsing:** Handles emoji-prefixed headings (e.g., `## :pencil: Ingredientes`)
- **Frontmatter parsed with:** `yaml.safe_load()`

---

## Sample File List

```
"""
    for f in all_samples:
        report += f"{f}\n"
    report += "```\n"

else:
    report = "No valid recipes found to audit."

os.makedirs(AUTOMATION_DIR, exist_ok=True)
report_path = os.path.join(AUTOMATION_DIR, "RECIPE_METADATA_AUDIT.md")
with open(report_path, 'w', encoding='utf-8') as f:
    f.write(report)

print(f"Report saved: {report_path}")
print(f"\nQuick Stats:")
print(f"  Total sampled: {n}")
print(f"  Complete frontmatter: {complete_fm}/{n} ({round(complete_fm/n*100,1)}%)")
print(f"  Has image field: {has_image_count}/{n} ({round(has_image_count/n*100,1)}%)")
print(f"  Has sensory profile: {has_sensory_count}/{n} ({round(has_sensory_count/n*100,1)}%)")
print(f"  Has both cooking times: {has_cooking_times}/{n} ({round(has_cooking_times/n*100,1)}%)")
print(f"  Content ## Ingredients found: {has_content_ing}/{n}")
print(f"  Content but no FM main_ing: {content_no_fm}/{n}")
print(f"\nMissing fields:")
for field, count in sorted_missing:
    print(f"  {field}: {count}/{n} missing ({round(count/n*100,1)}%)")
