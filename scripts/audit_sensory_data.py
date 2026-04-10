#!/usr/bin/env python3
"""
Audit Sensory Data for GOS Recipes

This script scans all recipes and identifies which ones are missing
sensory data (flavor, texture, aroma, presentation).

Usage:
    python scripts/audit_sensory_data.py
"""

import json
import os
import sys
from pathlib import Path

def scan_recipes():
    """Scan all recipe files and extract sensory data status."""
    base_dir = Path('E:/scripts-python/gastronomic-open-standard-GOS')
    dishes_dir = base_dir / 'dishes'
    
    recipes = []
    
    for md_file in dishes_dir.rglob('*.md'):
        if md_file.name == 'README.md':
            continue
            
        try:
            with open(md_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Simple frontmatter parsing
            if content.startswith('---'):
                parts = content.split('---', 2)
                if len(parts) >= 3:
                    frontmatter = parts[1]
                    body = parts[2]
                    
                    # Extract title
                    title = None
                    for line in frontmatter.split('\n'):
                        if line.startswith('title:'):
                            title = line.replace('title:', '').strip().strip('"\'')
                            break
                    
                    if not title:
                        for line in body.split('\n')[:10]:
                            if line.startswith('# '):
                                title = line.replace('# ', '').strip()
                                break
                    
                    # Check for sensory data
                    has_sensory = 'sensory:' in frontmatter
                    has_flavor = 'flavor:' in frontmatter
                    has_texture = 'texture:' in frontmatter
                    has_aroma = 'aroma:' in frontmatter
                    has_presentation = 'presentation:' in frontmatter
                    
                    # Determine country from path
                    parts_path = str(md_file).replace('\\', '/').split('/')
                    dishes_idx = parts_path.index('dishes') if 'dishes' in parts_path else -1
                    country = parts_path[dishes_idx + 1] if dishes_idx >= 0 and dishes_idx + 1 < len(parts_path) else 'unknown'
                    
                    # Calculate relative path as ID
                    rel_path = str(md_file.relative_to(dishes_dir)).replace('\\', '/').replace('.md', '')
                    
                    recipes.append({
                        'id': rel_path,
                        'title': title or 'Untitled',
                        'country': country,
                        'has_sensory': has_sensory,
                        'has_flavor': has_flavor,
                        'has_texture': has_texture,
                        'has_aroma': has_aroma,
                        'has_presentation': has_presentation,
                        'file_path': str(md_file.relative_to(base_dir))
                    })
        except Exception as e:
            print(f"Error processing {md_file}: {e}", file=sys.stderr)
    
    return recipes

def analyze_sensory_data(recipes):
    """Analyze sensory data coverage."""
    
    total = len(recipes)
    with_sensory = sum(1 for r in recipes if r['has_sensory'])
    without_sensory = total - with_sensory
    
    # By country
    by_country = {}
    for r in recipes:
        c = r['country']
        if c not in by_country:
            by_country[c] = {'total': 0, 'with_sensory': 0, 'without_sensory': 0}
        by_country[c]['total'] += 1
        if r['has_sensory']:
            by_country[c]['with_sensory'] += 1
        else:
            by_country[c]['without_sensory'] += 1
    
    # Recipes missing specific fields
    missing_flavor = [r for r in recipes if not r['has_flavor']]
    missing_texture = [r for r in recipes if not r['has_texture']]
    missing_aroma = [r for r in recipes if not r['has_aroma']]
    missing_presentation = [r for r in recipes if not r['has_presentation']]
    
    return {
        'total': total,
        'with_sensory': with_sensory,
        'without_sensory': without_sensory,
        'coverage_percent': round(with_sensory / total * 100, 1) if total > 0 else 0,
        'by_country': by_country,
        'missing_fields': {
            'flavor': len(missing_flavor),
            'texture': len(missing_texture),
            'aroma': len(missing_aroma),
            'presentation': len(missing_presentation)
        },
        'missing_recipes': {
            'flavor': [r['id'] for r in missing_flavor],
            'texture': [r['id'] for r in missing_texture],
            'aroma': [r['id'] for r in missing_aroma],
            'presentation': [r['id'] for r in missing_presentation]
        }
    }

def generate_todo_list(analysis, recipes):
    """Generate a TODO list for adding sensory data."""
    
    todos = []
    
    todos.append("# Sensory Data TODO List for GOS Recipes")
    todos.append("")
    todos.append(f"Generated automatically")
    todos.append("")
    todos.append("## Summary")
    todos.append(f"- Total recipes: {analysis['total']}")
    todos.append(f"- With sensory data: {analysis['with_sensory']} ({analysis['coverage_percent']}%)")
    todos.append(f"- Missing sensory data: {analysis['without_sensory']}")
    todos.append("")
    todos.append("## By Country")
    for country, stats in analysis['by_country'].items():
        coverage = round(stats['with_sensory'] / stats['total'] * 100, 1) if stats['total'] > 0 else 0
        todos.append(f"- {country}: {stats['with_sensory']}/{stats['total']} ({coverage}%)")
    todos.append("")
    todos.append("## Priority Recipes (Missing Sensory Data)")
    todos.append("")
    todos.append("### High Priority - Colombian Recipes (Native Language)")
    
    colombian_missing = [r for r in recipes if r['country'] == 'colombian' and not r['has_sensory']]
    for r in sorted(colombian_missing, key=lambda x: x['title'])[:20]:
        todos.append(f"- [ ] `{r['id']}` - {r['title']}")
    
    todos.append("")
    todos.append("### Medium Priority - Chinese Recipes")
    chinese_missing = [r for r in recipes if r['country'] == 'china' and not r['has_sensory']]
    for r in sorted(chinese_missing, key=lambda x: x['title'])[:20]:
        todos.append(f"- [ ] `{r['id']}` - {r['title']}")
    
    todos.append("")
    todos.append("### Low Priority - Other Recipes")
    other_missing = [r for r in recipes if r['country'] not in ['colombian', 'china'] and not r['has_sensory']]
    for r in sorted(other_missing, key=lambda x: x['title'])[:20]:
        todos.append(f"- [ ] `{r['id']}` - {r['title']}")
    
    todos.append("")
    todos.append("## Required Fields for Sensory Data")
    todos.append("")
    todos.append("Each recipe needs a `sensory:` section with:")
    todos.append("")
    todos.append("```yaml")
    todos.append("sensory:")
    todos.append("  flavor:")
    todos.append("    - Umami")
    todos.append("    - Salty")
    todos.append("    - etc.")
    todos.append("  texture:")
    todos.append("    - Crispy")
    todos.append("    - Tender")
    todos.append("    - etc.")
    todos.append("  aroma:")
    todos.append("    - Smoky")
    todos.append("    - Herbal")
    todos.append("    - etc.")
    todos.append("  presentation: \"Description of how the dish looks when served\"")
    todos.append("```")
    
    return '\n'.join(todos)

def main():
    print("Scanning recipes...")
    recipes = scan_recipes()
    print(f"Found {len(recipes)} recipes")
    
    print("\nAnalyzing sensory data...")
    analysis = analyze_sensory_data(recipes)
    
    print("\n" + "="*60)
    print("SENSORY DATA AUDIT REPORT")
    print("="*60)
    print(f"\nTotal Recipes: {analysis['total']}")
    print(f"With Sensory Data: {analysis['with_sensory']} ({analysis['coverage_percent']}%)")
    print(f"Missing Sensory Data: {analysis['without_sensory']}")
    
    print("\nBy Country:")
    for country, stats in analysis['by_country'].items():
        coverage = round(stats['with_sensory'] / stats['total'] * 100, 1) if stats['total'] > 0 else 0
        print(f"  {country}: {stats['with_sensory']}/{stats['total']} ({coverage}%)")
    
    print("\nMissing Fields:")
    for field, count in analysis['missing_fields'].items():
        print(f"  {field}: {count} recipes")
    
    # Generate TODO list
    base_dir = Path('E:/scripts-python/gastronomic-open-standard-GOS')
    todo_file = base_dir / 'SENSORY_DATA_TODO.md'
    todo_content = generate_todo_list(analysis, recipes)
    
    with open(todo_file, 'w', encoding='utf-8') as f:
        f.write(todo_content)
    
    print(f"\nTODO list saved to: {todo_file}")
    
    # Also save JSON analysis
    json_file = base_dir / 'sensory_audit.json'
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(analysis, f, indent=2, ensure_ascii=False)
    
    print(f"JSON analysis saved to: {json_file}")
    
    return analysis

if __name__ == '__main__':
    main()
