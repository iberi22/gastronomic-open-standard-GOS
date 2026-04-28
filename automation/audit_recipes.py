# Recipe Metadata Audit Script — CI Quality Gate
import os
import sys
import re
import yaml
import argparse
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

# Detect repo root dynamically
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(SCRIPT_DIR)
AUTOMATION_DIR = os.path.join(BASE, "automation")
EXIT_CODE = 0

def get_md_files(dirpath):
    files = []
    for root, dirs, files_list in os.walk(dirpath):
        for f in files_list:
            if f.endswith('.md') and f not in ['README.md', 'COLOMBIAN_RECIPES_PLAN.md'] and not f.startswith('recetas_'):
                files.append(os.path.join(root, f))
    return files

def parse_frontmatter(content):
    # Handle both \n and \r\n
    content = content.replace('\r\n', '\n')
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if match:
        try:
            return yaml.safe_load(match.group(1))
        except Exception as e:
            return {'_parse_error': str(e)}
    return {}

def extract_ingredients_section(content):
    content = content.replace('\r\n', '\n')
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
        return True, []
    fm_normalized = [normalize_ingredient(i) for i in frontmatter_ingredients]
    content_normalized = [normalize_ingredient(i) for i in content_ingredients]
    matched = []
    for ci in content_normalized:
        found = any(ci and fi and (ci in fi or fi in ci or (ci.split() and fi.split() and ci.split()[0] == fi.split()[0])) for fi in fm_normalized)
        if found:
            matched.append(ci)
    if not content_normalized:
        return True, []
    match_ratio = len(matched) / len(content_normalized)
    return match_ratio >= 0.7, []

def get_image_status(fm):
    img = fm.get('image')
    if img:
        return True
    imgs = fm.get('images', [])
    if isinstance(imgs, list) and len(imgs) > 0:
        return True
    return False

def main():
    global EXIT_CODE
    parser = argparse.ArgumentParser(description='GOS Recipe Metadata Quality Gate')
    parser.add_argument('--strict', action='store_true', help='Exit code 1 on any missing required field')
    parser.add_argument('--format', choices=['text', 'json'], default='text', help='Output format')
    parser.add_argument('--sample', type=int, metavar='N', help='Audit N random recipes instead of 100%%')
    parser.add_argument('--min-score', type=float, default=0.7, help='Minimum required metadata completeness score (0.0-1.0)')
    args = parser.parse_args()

    colombian = get_md_files(os.path.join(BASE, 'dishes', 'colombian'))
    china = get_md_files(os.path.join(BASE, 'dishes', 'china'))
    peruvian = get_md_files(os.path.join(BASE, 'dishes', 'peruvian'))
    all_recipes = colombian + china + peruvian

    print(f"Total files: Colombian={len(colombian)}, China={len(china)}, Peruvian={len(peruvian)}, Total={len(all_recipes)}")

    if args.sample and args.sample > 0:
        import random
        random.seed(42)
        all_recipes = random.sample(all_recipes, min(args.sample, len(all_recipes)))
        print(f"Sampled {len(all_recipes)} recipes (seed=42 for reproducibility)")
    else:
        print(f"Auditing 100% of recipes: {len(all_recipes)} files")

    results = []
    parse_errors = 0

    for filepath in all_recipes:
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            results.append({'file': filepath, 'error': str(e), 'recipe_name': os.path.basename(os.path.dirname(filepath))})
            parse_errors += 1
            EXIT_CODE = 1
            continue

        fm = parse_frontmatter(content)
        if '_parse_error' in fm:
            results.append({'file': filepath, 'error': fm['_parse_error'], 'recipe_name': os.path.basename(os.path.dirname(filepath))})
            parse_errors += 1
            EXIT_CODE = 1
            continue

        content_ingredients = extract_ingredients_section(content)
        region = fm.get('region')
        difficulty = fm.get('difficulty')
        prep_time = fm.get('prep_time')
        cook_time = fm.get('cook_time')
        has_image = get_image_status(fm)
        main_ingredients = fm.get('main_ingredients', [])
        sensory = fm.get('sensory', {})

        has_main_ingredients = bool(main_ingredients)
        has_sensory = bool(sensory.get('flavor') and sensory.get('texture') and sensory.get('aroma'))
        has_region = bool(region)
        has_difficulty = bool(difficulty)
        has_prep_time = bool(prep_time)
        has_cook_time = bool(cook_time)
        has_image = get_image_status(fm)

        ing_list = main_ingredients if isinstance(main_ingredients, list) else []
        ingredient_match, _ = check_ingredient_match(ing_list, content_ingredients)

        required = ['title', 'region', 'main_ingredients', 'prep_time', 'cook_time']
        missing_required = [f for f in required if not fm.get(f)]

        score_fields = ['main_ingredients', 'region', 'difficulty', 'prep_time', 'cook_time', 'image']
        score = sum(1 for f in score_fields if fm.get(f)) / len(score_fields)

        result = {
            'file': filepath,
            'recipe_name': os.path.basename(os.path.dirname(filepath)),
            'folder': os.path.basename(os.path.dirname(os.path.dirname(filepath))),
            'has_main_ingredients': has_main_ingredients,
            'has_sensory': has_sensory,
            'has_region': has_region,
            'has_difficulty': has_difficulty,
            'has_prep_time': has_prep_time,
            'has_cook_time': has_cook_time,
            'has_image': has_image,
            'ingredient_match': ingredient_match,
            'missing_required': missing_required,
            'score': score,
        }
        results.append(result)

        if args.strict and missing_required:
            print(f"BLOCKER: {filepath} — missing required fields: {missing_required}")
            EXIT_CODE = 1

    valid = [r for r in results if 'error' not in r]
    n = len(valid)

    if n == 0:
        print("FATAL: No valid recipes found to audit.")
        if results:
            print(f"{len(results)} files had parse errors:")
            for r in results:
                print(f"  {r['file']}: {r.get('error')}")
        sys.exit(1)

    # Aggregate stats
    complete_fm = sum(1 for r in valid if r['has_main_ingredients'] and r['has_region'] and r['has_difficulty'] and r['has_prep_time'] and r['has_cook_time'] and r['has_image'])
    has_sensory_count = sum(1 for r in valid if r['has_sensory'])
    has_main_ing = sum(1 for r in valid if r['has_main_ingredients'])
    has_region_count = sum(1 for r in valid if r['has_region'])
    has_image_count = sum(1 for r in valid if r['has_image'])
    avg_score = sum(r['score'] for r in valid) / n

    low_score_recipes = [r for r in valid if r['score'] < args.min_score]
    missing_required_recipes = [r for r in valid if r['missing_required']]

    if args.format == 'json':
        import json
        output = {
            'total': n,
            'parse_errors': parse_errors,
            'complete_frontmatter': complete_fm,
            'complete_pct': round(complete_fm/n*100, 1),
            'has_sensory': has_sensory_count,
            'has_image': has_image_count,
            'avg_score': round(avg_score, 3),
            'low_score_recipes': [r['recipe_name'] for r in low_score_recipes],
            'missing_required': [r['recipe_name'] for r in missing_required_recipes],
        }
        print(json.dumps(output, indent=2))
        os.makedirs(AUTOMATION_DIR, exist_ok=True)
        with open(os.path.join(AUTOMATION_DIR, "audit_recipes.json"), 'w') as f:
            json.dump(output, f, indent=2)
    else:
        print(f"\n=== Recipe Metadata Quality Gate ===")
        print(f"Total audited: {n}")
        print(f"Parse errors: {parse_errors}")
        print(f"Complete frontmatter (6 fields): {complete_fm}/{n} ({round(complete_fm/n*100,1)}%)")
        print(f"Has sensory profile: {has_sensory_count}/{n} ({round(has_sensory_count/n*100,1)}%)")
        print(f"Has image field: {has_image_count}/{n} ({round(has_image_count/n*100,1)}%)")
        print(f"Average metadata score: {round(avg_score*100,1)}%")

        if low_score_recipes:
            print(f"\nWARNING: {len(low_score_recipes)} recipes scored below {args.min_score*100:.0f}%:")
            for r in low_score_recipes[:10]:
                print(f"  {r['recipe_name']} ({r['folder']}) — score={round(r['score']*100,0)}%")
            if len(low_score_recipes) > 10:
                print(f"  ... and {len(low_score_recipes) - 10} more")

        if missing_required_recipes:
            print(f"\nERROR: {len(missing_required_recipes)} recipes missing REQUIRED fields:")
            for r in missing_required_recipes[:10]:
                print(f"  {r['recipe_name']} ({r['folder']}) — missing: {r['missing_required']}")
            if len(missing_required_recipes) > 10:
                print(f"  ... and {len(missing_required_recipes) - 10} more")

    if args.strict and missing_required_recipes:
        print(f"\nSTRICT MODE: {len(missing_required_recipes)} recipes blocked (missing required fields)")
        EXIT_CODE = 1

    # Save report
    os.makedirs(AUTOMATION_DIR, exist_ok=True)
    report_path = os.path.join(AUTOMATION_DIR, "RECIPE_METADATA_AUDIT.md")
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(f"# Recipe Metadata Quality Audit Report\n\n")
        f.write(f"**Generated:** 2026-04-27\n**Repository:** gastronomic-open-standard-GOS\n\n")
        f.write(f"## Summary\n\n")
        f.write(f"| Metric | Value |\n|--------|-------|\n")
        f.write(f"| Total recipes | {n} |\n")
        f.write(f"| Parse errors | {parse_errors} |\n")
        f.write(f"| Complete frontmatter (6 fields) | {complete_fm}/{n} ({round(complete_fm/n*100,1)}%) |\n")
        f.write(f"| Average metadata score | {round(avg_score*100,1)}% |\n")
        f.write(f"| Recipes below min score | {len(low_score_recipes)} |\n")
    print(f"\nReport saved: {report_path}")

    if EXIT_CODE == 1:
        print(f"\nEXIT CODE: 1 (FAIL)")
    else:
        print(f"\nEXIT CODE: 0 (PASS)")

    sys.exit(EXIT_CODE)

if __name__ == '__main__':
    main()
