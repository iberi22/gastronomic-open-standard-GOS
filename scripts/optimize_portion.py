
import os
import argparse
import re
import yaml
import math

# Configuration
INGREDIENTS_DIR = r"e:\scripts-python\gastronomic-open-standard-GOS\ingredients"
RECIPES_DIR = r"e:\scripts-python\gastronomic-open-standard-GOS\dishes\colombian"

INGREDIENT_DB = {}

def load_ingredient_db():
    print(f"Loading ingredients from {INGREDIENTS_DIR}...")
    for root, dirs, files in os.walk(INGREDIENTS_DIR):
        for file in files:
            if file.endswith(".md") and not file.startswith("_"):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    fm = re.search(r'^---\n(.*?)\n---', content, re.DOTALL)
                    if fm:
                        data = yaml.safe_load(fm.group(1))
                        # Create keys for both filename and nice name
                        slug = file.replace('.md', '').lower()
                        INGREDIENT_DB[slug] = data
                        INGREDIENT_DB[data.get('name', '').lower()] = data

def find_ingredient(raw_text):
    raw_text = raw_text.lower()
    # Simple mapping strategy (Same as enrichment script)
    # In a real app, this would be a shared module
    mappings = {
        "tomate": "tomate", "cebolla": "cebolla_cabezona", "ajo": "ajo",
        "arroz": "arroz", "pollo": "pollo", "carne": "carne_res",
        "huevo": "huevo", "papa criolla": "papa_criolla",
        "papa pastusa": "papa_pastusa", "papa": "papa_pastusa",
        "yuca": "yuca", "plátano": "platano_verde", "platano": "platano_verde",
        "lenteja": "lentejas", "frijol": "frijol", "aguacate": "aguacate",
        "leche": "leche", "maiz": "maiz", "mazorca": "maiz",
        "cilantro": "cilantro", "limon": "limon"
    }

    # Try exact slug match first
    for slug in INGREDIENT_DB:
        if slug in raw_text:
            return INGREDIENT_DB[slug]

    # Try manual mappings
    for key, slug in mappings.items():
        if key in raw_text:
            return INGREDIENT_DB.get(slug)

    return None

def parse_recipe_ingredients(recipe_path):
    with open(recipe_path, 'r', encoding='utf-8') as f:
        content = f.read()

    ingredients = []

    # Extract Ingredientes section
    ing_section = re.search(r'##\s+.*?Ingredientes(.*?)(?:##|---)', content, re.DOTALL | re.IGNORECASE)
    if not ing_section:
        print("No ingredients section found.")
        return []

    lines = ing_section.group(1).split('\n')
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('-') or stripped.startswith('*'):
            # Parse Quantity using Regex
            qty = 1.0
            num_match = re.search(r'^[\-\*]\s*(\d+(?:[.,]\d+)?)', stripped)
            if num_match:
                qty = float(num_match.group(1).replace(',', '.'))

            # Identify ingredient
            ing_data = find_ingredient(stripped)
            if ing_data:
                # Naive unit parsing for prototype (Assumes grams if not specifed, or converts)
                weight_g = qty
                lower_line = stripped.lower()

                # Unit conversion logic (Simplified)
                base_unit = ing_data.get('portions', {}).get('default_g', 100)

                if "lb" in lower_line or "libra" in lower_line: weight_g = qty * 500
                elif "kg" in lower_line or "kilo" in lower_line: weight_g = qty * 1000
                elif "taza" in lower_line: weight_g = qty * 200 # Approx
                elif "cda" in lower_line or "cuchara" in lower_line: weight_g = qty * 15
                elif "g " not in lower_line and "gramos" not in lower_line:
                    # If no unit found, assume it means "units" (e.g. 2 potatoes)
                    weight_g = qty * base_unit

                # Get Macros
                nut = ing_data.get('nutrition_per_100g', {})
                cal_per_g = nut.get('calories', 0) / 100.0
                prot_per_g = nut.get('protein_g', 0) / 100.0

                ingredients.append({
                    "original_text": stripped,
                    "name": ing_data['name'],
                    "weight_g": weight_g,
                    "calories": weight_g * cal_per_g,
                    "protein": weight_g * prot_per_g,
                    "cal_per_g": cal_per_g,
                    "prot_per_g": prot_per_g
                })

    return ingredients

def optimize(recipe_name, target_cal=None, target_protein=None):
    # Find recipe file
    target_file = None
    for root, dirs, files in os.walk(RECIPES_DIR):
        for file in files:
            if recipe_name.lower() in file.lower() and file.endswith(".md"):
                target_file = os.path.join(root, file)
                break

    if not target_file:
        print(f"Recipe '{recipe_name}' not found.")
        return

    print(f"Optimizing '{os.path.basename(target_file)}'...")
    ingredients = parse_recipe_ingredients(target_file)

    if not ingredients:
        print("Could not parse ingredients.")
        return

    total_current_cal = sum(i['calories'] for i in ingredients)
    total_current_prot = sum(i['protein'] for i in ingredients)

    print(f"Current Recipe Totals: {int(total_current_cal)} kcal, {int(total_current_prot)}g Protein")

    scaler = 1.0
    mode = ""

    if target_cal:
        scaler = target_cal / total_current_cal
        mode = f"{target_cal} kcal"
    elif target_protein:
        scaler = target_protein / total_current_prot
        mode = f"{target_protein}g Protein"

    print(f"\n--- OPTIMIZED PRESCRIPTION (Target: {mode}) ---")
    print(f"Scaling Factor: {scaler:.2f}x\n")

    for ing in ingredients:
        new_weight = ing['weight_g'] * scaler
        print(f"- {int(new_weight)}g {ing['name']} (Original: {ing['original_text']})")

    print(f"\nNew Totals: {int(total_current_cal * scaler)} kcal, {int(total_current_prot * scaler)}g Protein")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Optimize recipe portions for health goals.")
    parser.add_argument("recipe", help="Partial name of the recipe file (e.g., 'ajiaco')")
    parser.add_argument("--calories", type=float, help="Target total calories")
    parser.add_argument("--protein", type=float, help="Target total protein (g)")

    args = parser.parse_args()

    load_ingredient_db()
    optimize(args.recipe, args.calories, args.protein)
