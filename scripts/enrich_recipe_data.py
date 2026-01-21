import os
import yaml
import re

INGREDIENT_DB = {}

def load_ingredient_db(base_dir):
    global INGREDIENT_DB
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith(".md") and not file.startswith("_"):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    fm = re.search(r'^---\n(.*?)\n---', content, re.DOTALL)
                    if fm:
                        data = yaml.safe_load(fm.group(1))
                        slug = file.replace('.md', '').lower()
                        INGREDIENT_DB[slug] = data
                        INGREDIENT_DB[data.get('name', '').lower()] = data
    print(f"Loaded {len(INGREDIENT_DB)} ingredient references.")

def find_ingredient(raw_text):
    raw_text = raw_text.lower()
    mappings = {
        "tomate": "tomate",
        "cebolla cabezona": "cebolla_cabezona",
        "cebolla larga": "cebolla_larga",
        "cebolla en rama": "cebolla_larga",
        "cebolla": "cebolla_cabezona",
        "ajo": "ajo",
        "arroz": "arroz",
        "pollo": "pollo",
        "pechuga": "pollo",
        "carne": "carne_res",
        "res": "carne_res",
        "huevo": "huevo",
        "aceite": "aceite",
        "papa criolla": "papa_criolla",
        "papa amarilla": "papa_criolla",
        "papa pastusa": "papa_pastusa",
        "papa sabanera": "papa_pastusa",
        "papa": "papa_pastusa",
        "patata": "papa_pastusa",
        "platano verde": "platano_verde",
        "patacon": "platano_verde",
        "platano maduro": "platano_maduro",
        "plátano verde": "platano_verde",
        "plátano maduro": "platano_maduro",
        "yuca": "yuca",
        "mandioca": "yuca",
        "almidon de yuca": "almidon_yuca",
        "almidón de yuca": "almidon_yuca",
        "almidon": "almidon_yuca",
        "almidón": "almidon_yuca",
        "cilantro": "cilantro",
        "panela": "panela",
        "azucar": "panela",
        "azúcar": "panela",
        "frijol": "frijol",
        "fríjol": "frijol",
        "lenteja": "lentejas",
        "maiz": "maiz",
        "maíz": "maiz",
        "mazorca": "maiz",
        "choclo": "maiz",
        "leche de coco": "sancocho_pescado_check_later_maybe_just_coco",
        "leche": "leche",
        "crema de leche": "crema_leche",
        "queso": "queso",
        "cuajada": "queso",
        "hogao": "hogao",
        "guiso": "hogao",
        "mantequilla": "mantequilla",
        # Pack 2
        "aguacate": "aguacate",
        "limon": "limon",
        "limón": "limon",
        "zumo de limon": "limon",
        "jugo de limon": "limon"
    }

    sorted_keys = sorted(mappings.keys(), key=len, reverse=True)

    for key in sorted_keys:
        if key in raw_text:
            return INGREDIENT_DB.get(mappings[key])

    return None

def parse_quantity(line):
    try:
        num_match = re.search(r'^[\-\*]\s*(\d+(?:[.,]\d+)?)', line)
        if not num_match:
            return 1.0

        qty = float(num_match.group(1).replace(',', '.'))
        lower_line = line.lower()

        if "taza" in lower_line:
            return qty * 200.0
        elif "cda" in lower_line or "cuchara" in lower_line:
            return qty * 15.0
        elif "cdta" in lower_line or "cucharadita" in lower_line:
            return qty * 5.0
        elif "g " in lower_line or "gramos" in lower_line:
            return qty
        elif "ml" in lower_line:
            return qty
        elif "l " in lower_line or "litro" in lower_line:
            return qty * 1000.0
        elif "lb" in lower_line or "libra" in lower_line:
            return qty * 500.0
        elif "kg" in lower_line or "kilo" in lower_line:
            return qty * 1000.0

        return qty
    except:
        return 1.0

def enrich_recipe(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    ing_section = re.search(r'##\s+.*?Ingredientes(.*?)(?:##|---)', content, re.DOTALL | re.IGNORECASE)
    if not ing_section:
        return

    total_stats = {
        'calories': 0,
        'protein_g': 0,
        'fat_g': 0,
        'carbs_g': 0
    }

    compounds = set()
    found_count = 0

    # print(f"--- enriching {os.path.basename(file_path)} ---")

    lines = ing_section.group(1).split('\n')
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('-') or stripped.startswith('*'):
            weight_g = 0
            ingredient_data = find_ingredient(stripped)

            if ingredient_data:
                found_count += 1
                qty_parsed = parse_quantity(stripped)
                base_unit_g = ingredient_data.get('portions', {}).get('default_g', 100)

                # Extended list of unit triggers to ensure we don't double-multiply
                unit_keywords = [
                    "taza", "cup",
                    "g ", "gramos", "gr ",
                    "cda", "cuchara",
                    "cdta", "cucharadita",
                    "lb", "libra",
                    "kg", "kilo",
                    "ml", "litro", "l "
                ]

                if any(x in stripped.lower() for x in unit_keywords):
                     weight_g = qty_parsed
                else:
                     weight_g = qty_parsed * base_unit_g

                ratio = weight_g / 100.0
                nut = ingredient_data.get('nutrition_per_100g', {})
                cals = nut.get('calories', 0) * ratio

                total_stats['calories'] += cals
                total_stats['protein_g'] += nut.get('protein_g', 0) * ratio
                total_stats['fat_g'] += nut.get('fat_g', 0) * ratio
                total_stats['carbs_g'] += nut.get('carbs_g', 0) * ratio

                # print(f"Matched: '{stripped[:20]}...' -> {ingredient_data['name']} | W: {weight_g}g | Cal: {cals}")

                for comp in ingredient_data.get('active_compounds', []):
                    compounds.add(comp['name'])

    if found_count == 0:
        return

    # Update Front Matter
    fm_match = re.search(r'^---\n(.*?)\n---', content, re.DOTALL)
    if fm_match:
        try:
            fm_data = yaml.safe_load(fm_match.group(1))
            fm_data['nutrition'] = {
                'calories': int(total_stats['calories']),
                'macros': {
                    'protein_g': round(total_stats['protein_g'], 1),
                    'fat_g': round(total_stats['fat_g'], 1),
                    'carbs_g': round(total_stats['carbs_g'], 1)
                }
            }
            new_fm = yaml.dump(fm_data, allow_unicode=True, sort_keys=False)
            content = content.replace(fm_match.group(0), f"---\n{new_fm}---")
        except:
            pass

    if "### Perfil Nutricional" in content:
         content = re.sub(r'- \*\*Calorías:\*\* [\d\w\s~\.\(\)]+kcal.*', f'- **Calorías:** {int(total_stats["calories"])} kcal (Total receta)', content)
         content = re.sub(r'- \*\*Proteína:\*\* [\d\.]+g', f'- **Proteína:** {round(total_stats["protein_g"], 1)}g', content)
         content = re.sub(r'- \*\*Grasas:\*\* [\d\.]+g', f'- **Grasas:** {round(total_stats["fat_g"], 1)}g', content)
         content = re.sub(r'- \*\*Carbohidratos:\*\* [\d\.]+g', f'- **Carbohidratos:** {round(total_stats["carbs_g"], 1)}g', content)
         comp_str = ", ".join(list(compounds))
         content = re.sub(r"- \*\*Perfil de sabor:\*\* Rico en nutrientes activos:.*", f"- **Perfil de sabor:** Rico en nutrientes activos: {comp_str}", content)


    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    # print(f"Enriched {file_path} - Cal: {int(total_stats['calories'])} (Matches: {found_count})")

def process_all(directory):
    load_ingredient_db(r"e:\scripts-python\gastronomic-open-standard-GOS\ingredients")
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(".md") and "README" not in file:
                 enrich_recipe(os.path.join(root, file))

if __name__ == "__main__":
    process_all(r"e:\scripts-python\gastronomic-open-standard-GOS\dishes\colombian")
