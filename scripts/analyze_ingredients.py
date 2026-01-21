#!/usr/bin/env python3
"""
Ingredient Analysis Script for GOS (Gastronomic Open Standard)

This script analyzes all ingredients in the repository:
1. Identifies ingredients that are still in pending_review/
2. Counts ingredients by category
3. Identifies which ingredients need scientific data completion
4. Generates a report for action items
"""

import os
import re
import yaml
from pathlib import Path
from collections import defaultdict

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
INGREDIENTS_DIR = PROJECT_ROOT / 'ingredients'
PENDING_DIR = INGREDIENTS_DIR / 'pending_review'

def parse_frontmatter(content: str) -> dict:
    """Extract YAML frontmatter from markdown content."""
    match = re.match(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
    if match:
        try:
            return yaml.safe_load(match.group(1))
        except yaml.YAMLError:
            return {}
    return {}

def analyze_ingredient(filepath: Path) -> dict:
    """Analyze a single ingredient file for completeness."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    fm = parse_frontmatter(content)

    # Check completeness indicators
    issues = []

    if fm.get('scientific_name') in ['TODO', '', None]:
        issues.append('missing_scientific_name')

    if fm.get('group') in ['Uncategorized', '', None]:
        issues.append('missing_group')

    nutrition = fm.get('nutrition_per_100g', {})
    if all(v == 0 for v in nutrition.values() if isinstance(v, (int, float))):
        issues.append('missing_nutrition')

    if 'TODO' in content or '*Aun no hay descripción*' in content:
        issues.append('incomplete_description')

    return {
        'name': fm.get('name', filepath.stem),
        'path': str(filepath.relative_to(PROJECT_ROOT)),
        'group': fm.get('group', 'Unknown'),
        'has_scientific_name': fm.get('scientific_name') not in ['TODO', '', None],
        'has_nutrition': not all(v == 0 for v in nutrition.values() if isinstance(v, (int, float))),
        'issues': issues,
        'completeness_score': max(0, 100 - len(issues) * 25)
    }

def get_category_from_path(filepath: Path) -> str:
    """Determine ingredient category from file path."""
    relative = filepath.relative_to(INGREDIENTS_DIR)
    parts = relative.parts
    if len(parts) > 1 and parts[0] != 'pending_review':
        return parts[0]
    return 'pending_review'

def main():
    print("=" * 60)
    print("🍳 GOS Ingredient Analysis Report")
    print("=" * 60)

    # Collect all ingredient files
    all_ingredients = []
    category_counts = defaultdict(int)

    for md_file in INGREDIENTS_DIR.rglob('*.md'):
        if md_file.name == '_template.md':
            continue

        category = get_category_from_path(md_file)
        category_counts[category] += 1

        analysis = analyze_ingredient(md_file)
        analysis['category'] = category
        all_ingredients.append(analysis)

    # Summary statistics
    total = len(all_ingredients)
    pending = category_counts.get('pending_review', 0)
    organized = total - pending

    print(f"\n📊 Summary Statistics")
    print("-" * 40)
    print(f"   Total Ingredients: {total}")
    print(f"   ✅ Organized:      {organized}")
    print(f"   ⏳ Pending Review: {pending}")
    print(f"   Completion:        {organized/total*100:.1f}%")

    # Category breakdown
    print(f"\n📁 By Category")
    print("-" * 40)
    for cat, count in sorted(category_counts.items(), key=lambda x: -x[1]):
        emoji = "📂" if cat != 'pending_review' else "⏳"
        print(f"   {emoji} {cat}: {count}")

    # Quality analysis
    print(f"\n🔬 Data Quality Analysis")
    print("-" * 40)

    missing_scientific = sum(1 for i in all_ingredients if not i['has_scientific_name'])
    missing_nutrition = sum(1 for i in all_ingredients if not i['has_nutrition'])

    print(f"   Missing scientific name: {missing_scientific}/{total}")
    print(f"   Missing nutrition data:  {missing_nutrition}/{total}")

    # Priority items (organized but incomplete)
    organized_incomplete = [
        i for i in all_ingredients
        if i['category'] != 'pending_review' and i['issues']
    ]

    if organized_incomplete:
        print(f"\n⚠️ Priority: Organized but Incomplete ({len(organized_incomplete)})")
        print("-" * 40)
        for ing in organized_incomplete[:10]:
            issues_str = ', '.join(ing['issues'])
            print(f"   - {ing['name']}: {issues_str}")

    # Sample pending items for categorization
    print(f"\n📝 Sample Pending Ingredients (first 20)")
    print("-" * 40)
    pending_items = [i for i in all_ingredients if i['category'] == 'pending_review']
    for ing in pending_items[:20]:
        print(f"   - {ing['name']}")

    # Generate actionable report
    report_path = PROJECT_ROOT / 'ingredients_audit_report.txt'
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write("GOS Ingredient Audit Report\n")
        f.write(f"Generated: {__import__('datetime').datetime.now().isoformat()}\n")
        f.write("=" * 60 + "\n\n")

        f.write(f"Total: {total}\n")
        f.write(f"Organized: {organized}\n")
        f.write(f"Pending: {pending}\n\n")

        f.write("PENDING INGREDIENTS (need categorization):\n")
        for ing in pending_items:
            f.write(f"  - {ing['name']}\n")

    print(f"\n✅ Full report saved to: {report_path}")
    print("=" * 60)

if __name__ == "__main__":
    main()
