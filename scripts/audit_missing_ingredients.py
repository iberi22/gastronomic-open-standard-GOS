
import os
import re
import yaml
from collections import Counter

# Configuration
INGREDIENTS_DIR = r"e:\scripts-python\gastronomic-open-standard-GOS\ingredients"
DISHES_DIR = r"e:\scripts-python\gastronomic-open-standard-GOS\dishes"

KNOWN_INGREDIENTS = set()

def load_known_ingredients():
    print(f"Loading known ingredients from {INGREDIENTS_DIR}...")
    for root, dirs, files in os.walk(INGREDIENTS_DIR):
        for file in files:
            if file.endswith(".md") and not file.startswith("_"):
                path = os.path.join(root, file)
                # Add filename slug
                slug = file.replace('.md', '').lower()
                KNOWN_INGREDIENTS.add(slug)
                # Add name from frontmatter
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        fm = re.search(r'^---\n(.*?)\n---', content, re.DOTALL)
                        if fm:
                            data = yaml.safe_load(fm.group(1))
                            if 'name' in data:
                                KNOWN_INGREDIENTS.add(data['name'].lower())
                except:
                    pass

def clean_line(line):
    # Remove bullets
    line = re.sub(r'^[\-\*]\s+', '', line)
    # Remove quantities (heuristic)
    line = re.sub(r'^\d+[\d\.,]*\s*(g|kg|lb|oz|ml|l|taza|cda|cdta|gramos|libras)?\s*(de)?\s+', '', line, flags=re.IGNORECASE)
    # Remove trailing details in parens
    line = re.sub(r'\s*\(.*?\)', '', line)
    # Lowercase
    return line.strip().lower()

def scan_recipes():
    print(f"Scanning recipes in {DISHES_DIR}...")
    missing_counter = Counter()

    for root, dirs, files in os.walk(DISHES_DIR):
        for file in files:
            if file.endswith(".md"):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()

                    ing_section = re.search(r'##\s+.*?Ingredientes(.*?)(?:##|---)', content, re.DOTALL | re.IGNORECASE)
                    if ing_section:
                        lines = ing_section.group(1).split('\n')
                        for line in lines:
                            line = line.strip()
                            if line.startswith('-') or line.startswith('*'):
                                potential_ing = clean_line(line)
                                if len(potential_ing) < 3: continue

                                # Check if mapped
                                found = False
                                for known in KNOWN_INGREDIENTS:
                                    if known in potential_ing: # Simple containment check
                                        found = True
                                        break

                                if not found:
                                    # Normalize simple plural s
                                    if potential_ing.endswith('s') and potential_ing[:-1] in KNOWN_INGREDIENTS:
                                        continue

                                    missing_counter[potential_ing] += 1
                except Exception as e:
                    print(f"Error reading {file}: {e}")

    print("\n--- TOP MISSING INGREDIENTS (Potential) ---")
    for ing, count in missing_counter.most_common(50):
        print(f"{count}: {ing}")

if __name__ == "__main__":
    load_known_ingredients()
    scan_recipes()
