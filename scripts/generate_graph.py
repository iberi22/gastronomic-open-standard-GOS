"""
GOS Graph Generator - Creates graph.json for the ingredient/recipe network visualization.

Extracts nodes (ingredients, recipes, regions, flavors, techniques) and edges (connections between them)
from the markdown files in the repository.
"""

import json
import re
import sys
import yaml
from pathlib import Path
from collections import defaultdict

# Fix Windows console encoding for UTF-8 output
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')


# Common cooking techniques/verbs (Spanish and English)
COOKING_TECHNIQUES = {
    # Spanish
    'cocinar', 'hervir', 'freír', 'fritar', 'asar', 'hornear', 'cocir', 'saltear',
    'sofrito', 'sofreír', 'brasear', 'ahumar', 'cocer', 'guisar', 'estofar', 'pochar',
    'escalfar', 'gratinar', ' flambear', 'marinar', 'adobar', 'emperar', 'empanar',
    'rehogar', 'blanquear', 'broncear', 'dorar', 'caramelizar', 'glasear', 'glaseado',
    'trocear', 'picar', 'machacar', 'majar', 'triturar', 'licuar', 'batir', 'mezclar',
    'revolver', 'integrar', 'incorporar', 'agregar', 'añadir', 'verter', 'vaciar',
    'colar', 'filtrar', 'escurrir', 'escurrir', 'enfriar', 'congelar', 'refrigerar',
    'calentar', 'calentar', 'derretir', 'disolver', 'diluir',
    # English
    'cook', 'boil', 'fry', 'bake', 'roast', 'grill', 'broil', 'steam', 'simmer',
    'sauté', 'sear', 'braise', 'smoke', 'stew', 'poach', 'blanch', 'gratinate',
    'flambé', 'marinate', 'season', 'bread', 'fry', 'roast', 'dice', 'chop',
    'mince', 'crush', 'grind', 'blend', 'mix', 'stir', 'fold', 'whisk', 'beat',
    'pour', 'drain', 'cool', 'freeze', 'refrigerate', 'heat', 'melt', 'dissolve',
}

# Paths - use absolute paths based on script location
SCRIPT_DIR = Path(__file__).parent.parent
DISHES_DIR = SCRIPT_DIR / "dishes"
INGREDIENTS_DIR = SCRIPT_DIR / "ingredients"
OUTPUT_FILE_SITE = SCRIPT_DIR / "site" / "graph-data.json"
OUTPUT_FILE_DOCS = SCRIPT_DIR / "docs" / "graph.json"

# Node types with colors (brutalist palette)
NODE_COLORS = {
    "recipe": "#FF6B6B",      # Red
    "ingredient": "#4ECDC4",  # Teal
    "region": "#FFE66D",      # Yellow
    "flavor": "#95E1D3",      # Mint
    "texture": "#F38181",     # Coral
    "technique": "#AA96DA",   # Purple
    "place": "#B2E2F2",       # Light Blue
    "category": "#A8D8A8",   # Soft Green
}

# Ingredient category keyword mapping for auto-categorization (BELONGS_TO)
INGREDIENT_CATEGORIES = {
    'Proteins': ['pollo', 'carne', 'res', 'cerdo', 'pescado', 'mariscos', 'huevo', 'camarones', 'carnero', 'chivo', 'pavo', 'atun', 'salmon', 'bacalao', 'calamar', 'pulpo', 'langosta', 'cangrejo'],
    'Dairy': ['leche', 'crema', 'mantequilla', 'queso', 'cuajada', 'yogur', 'nata', 'suero', 'leche condensada', 'queso blanco', 'queso costeño', 'arequipe'],
    'Vegetables': ['cebolla', 'ajo', 'tomate', 'papa', 'yuca', 'platano', 'zanahoria', 'habichuela', 'coliflor', 'brocoli', 'espinaca', 'acelga', 'lechuga', 'remolacha', 'rabano', 'pimenton', 'pimiento', 'pepino', 'calabaza', 'berenjena', 'choclo', 'maiz', 'auyama'],
    'Fruits': ['limon', 'lima', 'naranja', 'mango', 'aguacate', 'papaya', 'banano', 'manzana', 'pera', 'uva', 'fresa', 'mora', 'guanabana', 'lulo', 'maracuya', 'sandia', 'melon', 'kiwi', 'coco', 'pina'],
    'Grains': ['arroz', 'maiz', 'trigo', 'harina', 'pan', 'fideos', 'pasta', 'tallarines', 'semola', 'avena', 'cebada', 'quinoa', 'chochorra', 'hojaldre', 'masa'],
    'Legumes': ['frijoles', 'lentejas', 'garbanzos', 'soya', 'caraotas', 'blanquillo', 'frijol'],
    'Oils_Fats': ['aceite', 'manteca', 'grasa', 'aceite de oliva', 'aceite vegetal', 'mantequilla', 'grasa de cerdo', 'tocino'],
    'Condiments': ['sal', 'pimienta', 'comino', 'achiote', 'culantro', 'cilantro', 'oregano', 'tomillo', 'romero', 'laurel', 'Mejorana', 'albahaca', 'hierbabuena', 'menta', 'eneldo', 'hinojo', 'azafran', 'canela', 'clavo', 'nuez moscada', 'jengibre', 'vanilla', 'vainilla'],
    'Sauces': ['salsa', 'aji', 'aji amarillo', 'chimichurri', 'hogao', 'sofrito', 'salsa de tomate', 'pasta de ajo', 'pasta de aji', 'merquen', 'pebre', 'guacamole', 'salsa criolla'],
    'Spices': ['comino', 'pimenton', 'paprika', 'cayena', 'chile', 'aji molido', 'curry', 'curcuma', 'cardamomo', 'gengibre', 'canela', 'clavo', 'pimienta negra', 'pimienta roja'],
    'Sweeteners': ['panela', 'azucar', 'miel', 'melaza', 'azucar morena', 'azucar glas', 'miel de cana'],
    'Liquids': ['agua', 'caldo', 'consome', 'vinagre', 'vino blanco', 'vino tinto', 'cerveza', 'aguardiente', 'ron', 'whisky', 'jugo', 'jugo de naranja', 'agua de azahar'],
    'Roots_Tubers': ['yuca', 'papa', 'name', 'arracacha', 'zanahoria', 'remolacha', 'rabano', 'nabo', 'tubérculos'],
    'Seafood': ['pescado', 'mariscos', 'camarones', 'cangrejo', 'langosta', 'pulpo', 'calamar', 'mejillones', 'almejas', 'atun', 'salmon', 'bacalao', 'trucha', 'mojarra', 'pargo', 'robalo', 'corvina', 'bagre'],
}

# Colombian regions and their departments/cities for PLACE edges
REGION_PLACES = {
    'Andina': ['Antioquia', 'Bogota', 'Cundinamarca', 'Risaralda', 'Quindio', 'Caldas', 'Huila', 'Tolima', 'Narino', 'Santander', 'Boyaca', 'Norte de Santander'],
    'Caribe': ['Barranquilla', 'Cartagena', 'Santa Marta', 'Monteria', 'Sincelejo', 'Valledupar', 'Riohacha', 'Cienaga', 'Maicao', 'Turbo'],
    'Pacifica': ['Cali', 'Buenaventura', 'Palmira', 'Pasto', 'Popayan', 'Tumaco', 'Guadalajara de Buga'],
    'Amazonia': ['Leticia', 'Florencia', 'San Jose del Guaviare', 'Puerto Loretoso', 'Puerto Inirida', 'Mitu', 'Vaupes'],
    'Orinoquia': ['Villavicencio', 'Yopal', 'Arauca', 'Tunja', 'Puerto Carreno', 'Meta', 'Casanare', 'Vichada'],
    'Valle del Cauca': ['Cali', 'Buga', 'Tulua', 'Palmira', 'Jamundi', 'Cartago', 'Buenaventura'],
    'Insular': ['San Andres', 'Providencia', 'Santa Catalina', 'Isla de San Andres'],
    'Nacional': ['Colombia'],
    'China': ['Beijing', 'Shanghai', 'Guangzhou', 'Sichuan', 'Hangzhou', 'Fujian', 'Shandong'],
    'Peruvian': ['Lima', 'Cusco', 'Arequipa', 'Trujillo', 'Chiclayo', 'Piura', 'Iquitos'],
}


def is_latin_text(text: str) -> bool:
    """Check if text contains Latin characters (Spanish/English alphabet)."""
    return bool(re.search(r'[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]', text))


def is_list_recipe(title: str, content: str) -> bool:
    """Detect aggregator 'list' recipe files that don't have real ingredients.

    These are files like '10 recetas mas emblematicas de la region X'
    that aggregate multiple recipes without having actual ingredients.
    """
    title_lower = title.lower()

    # Pattern 1: "10 recetas" or similar count + region/category in title
    list_title_patterns = [
        r'\d+\s+recetas?\s+(?:m[aá]s\s+)?(?:emblemáticas?|famosas?|populares?|tradicionales?)\s+(?:de(?:la)?|del)?\s*',
        r'\d+\s+platos?\s+(?:típicos?|tradicionales?|regionales?|famosos?)',
        r'\d+\s+recetas?\s+(?:de|del|para)\s+(?:la\s+)?(?:regi[oó]n|colombia|colombian|andina|caribe|pacifica|amazonia|orinoquia|insular|nacional)',
        r'^recetas?\s+de(?:la)?\s+(?:regi[oó]n|colombia)',
        r'^recetas\s+de\s+la\s+orinoquía$',
    ]

    for pattern in list_title_patterns:
        if re.search(pattern, title_lower):
            return True

    # Pattern 2: Content that looks like a list without ingredients section
    has_ingredientes = re.search(
        r'^##\s*(?:[\U0001F300-\U0001F9FF\s\d]*?)?\s*(?:Ingredientes|Ingredients)',
        content, re.IGNORECASE | re.MULTILINE
    )
    has_main_ingredients_fm = re.search(r'^main_ingredients:\s*\[', content, re.MULTILINE)

    if not has_ingredientes and not has_main_ingredients_fm:
        # Check if it looks like a list of recipe descriptions (many bullets but no ingredients)
        bullet_count = len(re.findall(r'^[-*+]+\s+["\'\w]', content, re.MULTILINE))
        if bullet_count > 5:
            return True

    return False


def auto_categorize_ingredient(ingredient_label: str) -> str | None:
    """Return category name if ingredient matches known category keywords."""
    ing_lower = ingredient_label.lower()
    for category, keywords in INGREDIENT_CATEGORIES.items():
        for kw in keywords:
            if kw in ing_lower:
                return category
    return None


def get_or_create_category_node(nodes: dict, category_name: str) -> str:
    """Get or create a category node and return its ID."""
    cat_id = f"category_{sanitize_id(category_name)}"
    if cat_id not in nodes:
        nodes[cat_id] = {
            "id": cat_id,
            "label": category_name,
            "type": "category",
            "color": NODE_COLORS.get("category", "#A8D8A8"),
            "size": 18,
        }
    return cat_id


def add_place_edges(nodes: dict, edges: list, region_id: str, region_label: str) -> int:
    """Add PLACE edges for cities/departments in a region. Returns count of places added."""
    places = REGION_PLACES.get(region_label, [])
    count = 0
    for place_name in places:
        place_id = f"place_{sanitize_id(place_name)}"
        if place_id not in nodes:
            nodes[place_id] = {
                "id": place_id,
                "label": place_name,
                "type": "place",
                "color": NODE_COLORS.get("place", "#B2E2F2"),
                "size": 12,
            }
        edges.append({
            "source": region_id,
            "target": place_id,
            "type": "PLACE",
            "weight": 1,
        })
        count += 1
    return count


def extract_ingredients_from_content(content: str) -> list:
    """Extract ingredients from markdown content sections.

    Matches headings like:
    - ## Ingredientes
    - ## 📝 Ingredientes
    - ## 🥕 Ingredientes
    - ## Ingredients
    - ## 🥕 Ingredients
    - Any emoji variant

    And extracts bullet list items and numbered list items after these headings.
    Filters out non-Latin text (e.g. Chinese characters).
    """
    ingredients = []

    heading_pattern = r'^##\s*(?:[\U0001F300-\U0001F9FF\s\d]*?)?\s*(?:Ingredientes|Ingredients)\s*$'

    lines = content.split('\n')
    in_ingredient_section = False

    for i, line in enumerate(lines):
        if re.search(heading_pattern, line, re.IGNORECASE):
            in_ingredient_section = True
            continue

        if in_ingredient_section:
            if re.match(r'^##\s+', line) or re.match(r'^---', line):
                in_ingredient_section = False
                continue

            bullet_match = re.match(r'^[-*+]\s+(.+?)(?:\s*[-–—]\s*(.+))?$', line)
            if bullet_match:
                ingredient_text = bullet_match.group(1).strip()
                ingredient_text = re.sub(
                    r'^[\d½¼¾⅓⅔⅛⅜⅝⅞/\s]+(?:g|kg|ml|l|taza|cucharada|cucharadita|cdta|cdas|kilo|libra|lb|oz|onza)s?\s+(?:de\s+)?',
                    '', ingredient_text, flags=re.IGNORECASE
                )
                ingredient_text = ingredient_text.strip()
                if ingredient_text and len(ingredient_text) > 1 and not re.match(r'^\d+$', ingredient_text):
                    # Filter non-Latin (Chinese chars, etc.)
                    if is_latin_text(ingredient_text):
                        ingredients.append(ingredient_text)
                continue

            numbered_match = re.match(r'^\d+\.\s+(.+?)(?:\s*[-–—]\s*(.+))?$', line)
            if numbered_match:
                ingredient_text = numbered_match.group(1).strip()
                ingredient_text = re.sub(
                    r'^[\d½¼¾⅓⅔⅛⅜⅝⅞/\s]+(?:g|kg|ml|l|taza|cucharada|cucharadita|cdta|cdas|kilo|libra|lb|oz|onza)s?\s+(?:de\s+)?',
                    '', ingredient_text, flags=re.IGNORECASE
                )
                ingredient_text = ingredient_text.strip()
                if ingredient_text and len(ingredient_text) > 1 and not re.match(r'^\d+$', ingredient_text):
                    if is_latin_text(ingredient_text):
                        ingredients.append(ingredient_text)

    return ingredients


def extract_techniques_from_content(content: str) -> list:
    """Extract cooking techniques/verbs from instructions section."""
    techniques = []

    instruction_pattern = r'^##\s*(?:[\U0001F300-\U0001F9FF\s\d]*?)?\s*(?:Instrucciones|Instructions|Preparaci(?:ó|o)n|Receta)\s*$'

    lines = content.split('\n')
    in_instruction_section = False

    for line in lines:
        if re.search(instruction_pattern, line, re.IGNORECASE):
            in_instruction_section = True
            continue

        if in_instruction_section:
            if re.match(r'^##\s+', line) or re.match(r'^---', line):
                in_instruction_section = False
                continue

            clean_line = re.sub(r'\*\*|__|\*|_', '', line)
            clean_line = re.sub(r'^\d+\.\s*', '', clean_line)
            clean_line = re.sub(r'^[-*+]\s*', '', clean_line)

            words = re.findall(r'\b[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]+\b', clean_line.lower())
            for word in words:
                if word in COOKING_TECHNIQUES:
                    technique_display = word.capitalize()
                    if technique_display not in techniques:
                        techniques.append(technique_display)

    return techniques


def extract_frontmatter(content: str) -> dict:
    """Extract YAML frontmatter from markdown content."""
    if not content.startswith("---"):
        return {}
    try:
        parts = content.split("---", 2)
        if len(parts) >= 3:
            return yaml.safe_load(parts[1]) or {}
    except yaml.YAMLError:
        pass
    return {}


def sanitize_id(text: str) -> str:
    """Create a safe ID from text."""
    return re.sub(r'[^a-z0-9_]', '_', text.lower().strip())


def build_graph():
    """Build the complete graph from all sources."""
    nodes = {}  # id -> node data
    edges = []  # list of {source, target, type, weight}
    recipe_ingredients = {}  # recipe_id -> list of ingredient_ids
    recipe_regions = {}  # recipe_id -> region_label
    ingredient_categories_added = set()  # track BELONGS_TO edges to avoid duplicates
    place_edges_count = 0
    belongs_to_count = 0
    skipped_list_recipes = 0

    # Quality gate tracking
    quality_gate_warnings = []

    # Track connections for edge weighting
    ingredient_recipes = defaultdict(list)

    # === PROCESS RECIPES ===
    print("[RECIPE] Processing recipes...")
    for recipe_file in DISHES_DIR.rglob("*.md"):
        if recipe_file.name.startswith("_") or recipe_file.name == "README.md":
            continue

        try:
            content = recipe_file.read_text(encoding="utf-8")
            fm = extract_frontmatter(content)

            if not fm.get("title"):
                continue

            title = fm.get("title", "")

            # === SKIP LIST RECIPES (aggregator files) ===
            if is_list_recipe(title, content):
                skipped_list_recipes += 1
                print(f"  [SKIP] List aggregator: {title}")
                continue

            recipe_id = f"recipe_{sanitize_id(title)}"

            # Add recipe node
            nodes[recipe_id] = {
                "id": recipe_id,
                "label": title,
                "type": "recipe",
                "color": NODE_COLORS["recipe"],
                "region": fm.get("region", ""),
                "image": None,
                "size": 30,
            }

            # Extract ingredients from markdown content sections
            content_ingredients = extract_ingredients_from_content(content)

            # Combine frontmatter ingredients with content ingredients
            all_ingredients = fm.get("main_ingredients", []).copy()
            for ing in content_ingredients:
                ing_lower = ing.lower()
                if not any(i.lower() == ing_lower for i in all_ingredients):
                    all_ingredients.append(ing)

            # Store recipe's ingredient IDs for RELATED_DISHES calculation
            recipe_ingredient_ids = []

            # Process all ingredients (from frontmatter + content)
            for ing in all_ingredients:
                ing_id = f"ingredient_{sanitize_id(ing)}"
                recipe_ingredient_ids.append(ing_id)

                # Create ingredient node if not exists
                if ing_id not in nodes:
                    nodes[ing_id] = {
                        "id": ing_id,
                        "label": ing,
                        "type": "ingredient",
                        "color": NODE_COLORS["ingredient"],
                        "image": None,
                        "size": 25,
                    }

                # Create edge: recipe -> ingredient (USES)
                edges.append({
                    "source": recipe_id,
                    "target": ing_id,
                    "type": "USES",
                    "weight": 2,
                })

                ingredient_recipes[ing_id].append(recipe_id)

                # === AUTO-CATEGORIZE: BELONGS_TO edge for ingredients ===
                category = auto_categorize_ingredient(ing)
                if category:
                    cat_id = get_or_create_category_node(nodes, category)
                    belongs_key = (ing_id, cat_id)
                    if belongs_key not in ingredient_categories_added:
                        edges.append({
                            "source": ing_id,
                            "target": cat_id,
                            "type": "BELONGS_TO",
                            "weight": 1,
                        })
                        ingredient_categories_added.add(belongs_key)
                        belongs_to_count += 1

            # Store for RELATED_DISHES calculation
            recipe_ingredients[recipe_id] = recipe_ingredient_ids

            # === QUALITY GATES ===
            ing_count = len(recipe_ingredient_ids)
            has_flavor = len(fm.get("sensory", {}).get("flavor", [])) > 0
            region_val = fm.get("region", "")

            if ing_count < 3:
                quality_gate_warnings.append(f"RECIPE <3 INGREDIENTS: {title} ({ing_count})")
            if not has_flavor:
                quality_gate_warnings.append(f"RECIPE NO FLAVOR: {title}")
            if not region_val:
                quality_gate_warnings.append(f"RECIPE NO REGION: {title}")

            # Process sensory profile
            sensory = fm.get("sensory", {})
            for flavor in sensory.get("flavor", []):
                flavor_id = f"flavor_{sanitize_id(flavor)}"

                if flavor_id not in nodes:
                    nodes[flavor_id] = {
                        "id": flavor_id,
                        "label": flavor,
                        "type": "flavor",
                        "color": NODE_COLORS["flavor"],
                        "size": 15,
                    }

                edges.append({
                    "source": recipe_id,
                    "target": flavor_id,
                    "type": "HAS_FLAVOR",
                    "weight": 1,
                })

            for texture in sensory.get("texture", []):
                texture_id = f"texture_{sanitize_id(texture)}"

                if texture_id not in nodes:
                    nodes[texture_id] = {
                        "id": texture_id,
                        "label": texture,
                        "type": "texture",
                        "color": NODE_COLORS["texture"],
                        "size": 15,
                    }

                edges.append({
                    "source": recipe_id,
                    "target": texture_id,
                    "type": "HAS_TEXTURE",
                    "weight": 1,
                })

            # Process region
            region = fm.get("region", "")
            if region:
                region_id = f"region_{sanitize_id(region)}"
                recipe_regions[recipe_id] = region

                if region_id not in nodes:
                    nodes[region_id] = {
                        "id": region_id,
                        "label": region,
                        "type": "region",
                        "color": NODE_COLORS["region"],
                        "size": 35,
                    }

                edges.append({
                    "source": recipe_id,
                    "target": region_id,
                    "type": "FROM_REGION",
                    "weight": 1.5,
                })

                # === ADD PLACE EDGES for Colombian regions ===
                place_count = add_place_edges(nodes, edges, region_id, region)
                place_edges_count += place_count

            # Extract and add cooking techniques
            techniques = extract_techniques_from_content(content)
            for technique in techniques:
                technique_id = f"technique_{sanitize_id(technique)}"

                if technique_id not in nodes:
                    nodes[technique_id] = {
                        "id": technique_id,
                        "label": technique,
                        "type": "technique",
                        "color": NODE_COLORS["technique"],
                        "size": 15,
                    }

                edges.append({
                    "source": recipe_id,
                    "target": technique_id,
                    "type": "USES_TECHNIQUE",
                    "weight": 1,
                })

        except Exception as e:
            print(f"  [WARN] Error processing {recipe_file}: {e}")

    print(f"\n[QUALITY GATES] Skipped {skipped_list_recipes} list aggregator recipes")

    # === PROCESS INGREDIENT FILES (if they exist) ===
    print("[INGREDIENT] Processing ingredient files...")
    if INGREDIENTS_DIR.exists():
        for ing_file in INGREDIENTS_DIR.rglob("*.md"):
            if ing_file.name.startswith("_") or ing_file.name == "README.md":
                continue

            try:
                content = ing_file.read_text(encoding="utf-8")
                fm = extract_frontmatter(content)

                if not fm.get("name"):
                    continue

                ing_id = f"ingredient_{sanitize_id(fm['name'])}"

                # Update or create ingredient node with more info
                if ing_id in nodes:
                    nodes[ing_id].update({
                        "scientific_name": fm.get("scientific_name", ""),
                        "origin": fm.get("origin", ""),
                    })
                else:
                    nodes[ing_id] = {
                        "id": ing_id,
                        "label": fm.get("name"),
                        "type": "ingredient",
                        "color": NODE_COLORS["ingredient"],
                        "scientific_name": fm.get("scientific_name", ""),
                        "origin": fm.get("origin", ""),
                        "size": 25,
                    }

                # Process substitutes
                for sub in fm.get("substitutes", []):
                    sub_id = f"ingredient_{sanitize_id(sub)}"
                    if sub_id != ing_id:
                        edges.append({
                            "source": ing_id,
                            "target": sub_id,
                            "type": "SUBSTITUTE_FOR",
                            "weight": 3,
                        })

                # Process pairs_with
                for pair in fm.get("pairs_with", []):
                    pair_id = f"ingredient_{sanitize_id(pair)}"
                    if pair_id != ing_id:
                        edges.append({
                            "source": ing_id,
                            "target": pair_id,
                            "type": "PAIRS_WITH",
                            "weight": 2.5,
                        })

            except Exception as e:
                print(f"  [WARN] Error processing {ing_file}: {e}")

    # === CREATE RELATED_DISHES EDGES (shared >=3 ingredients) ===
    print("[RELATED] Creating RELATED_DISHES edges (shared ingredients)...")
    related_by_ingredients = 0
    recipe_ids = list(recipe_ingredients.keys())
    for i, recipe1_id in enumerate(recipe_ids):
        for recipe2_id in recipe_ids[i+1:]:
            ingredients1 = set(recipe_ingredients[recipe1_id])
            ingredients2 = set(recipe_ingredients[recipe2_id])
            shared = ingredients1 & ingredients2
            if len(shared) >= 3:
                edges.append({
                    "source": recipe1_id,
                    "target": recipe2_id,
                    "type": "RELATED_DISHES",
                    "weight": len(shared),
                })
                related_by_ingredients += 1

    print(f"   -> Created {related_by_ingredients} RELATED_DISHES edges (shared ingredients)")

    # === CREATE RELATED_DISHES EDGES (same region) ===
    print("[REGION] Creating RELATED_DISHES edges (same region)...")
    related_by_region = 0
    region_recipes = defaultdict(list)
    for recipe_id, region_label in recipe_regions.items():
        region_id = f"region_{sanitize_id(region_label)}"
        region_recipes[region_id].append(recipe_id)

    for region_id, recipes in region_recipes.items():
        if len(recipes) < 2:
            continue
        for i, recipe1_id in enumerate(recipes):
            for recipe2_id in recipes[i+1:]:
                edges.append({
                    "source": recipe1_id,
                    "target": recipe2_id,
                    "type": "RELATED_DISHES",
                    "weight": 2,
                })
                related_by_region += 1

    print(f"   -> Created {related_by_region} RELATED_DISHES edges (same region)")

    # === CREATE INGREDIENT-TO-INGREDIENT CONNECTIONS ===
    print("[CONNECTION] Creating ingredient similarity connections...")
    often_together_count = 0
    for ing_id, recipes in ingredient_recipes.items():
        for other_ing_id, other_recipes in ingredient_recipes.items():
            if ing_id >= other_ing_id:
                continue

            shared = set(recipes) & set(other_recipes)
            if len(shared) >= 2:
                edges.append({
                    "source": ing_id,
                    "target": other_ing_id,
                    "type": "OFTEN_TOGETHER",
                    "weight": len(shared),
                })
                often_together_count += 1

    print(f"   -> Created {often_together_count} OFTEN_TOGETHER edges")

    # === FINALIZE ===
    graph = {
        "nodes": list(nodes.values()),
        "edges": edges,
        "metadata": {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "node_types": list(NODE_COLORS.keys()),
        }
    }

    # Save to both locations
    OUTPUT_FILE_SITE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE_SITE.write_text(json.dumps(graph, indent=2, ensure_ascii=False), encoding="utf-8")

    OUTPUT_FILE_DOCS.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE_DOCS.write_text(json.dumps(graph, indent=2, ensure_ascii=False), encoding="utf-8")

    # === EDGE TYPE COUNTS ===
    print(f"\n{'='*60}")
    print(f"[DONE] Graph generated successfully!")
    print(f"   Nodes: {len(nodes)}")
    print(f"   Edges: {len(edges)}")
    print(f"   Saved to: {OUTPUT_FILE_SITE}")
    print(f"   Saved to: {OUTPUT_FILE_DOCS}")

    # Node counts
    recipe_count = len([n for n in nodes.values() if n['type'] == 'recipe'])
    ingredient_count = len([n for n in nodes.values() if n['type'] == 'ingredient'])
    region_count = len([n for n in nodes.values() if n['type'] == 'region'])
    flavor_count = len([n for n in nodes.values() if n['type'] == 'flavor'])
    technique_count = len([n for n in nodes.values() if n['type'] == 'technique'])
    place_count = len([n for n in nodes.values() if n['type'] == 'place'])
    category_count = len([n for n in nodes.values() if n['type'] == 'category'])

    print(f"\n--- NODE COUNTS ---")
    print(f"   recipe:     {recipe_count}")
    print(f"   ingredient: {ingredient_count}")
    print(f"   region:     {region_count}")
    print(f"   flavor:     {flavor_count}")
    print(f"   texture:    {len([n for n in nodes.values() if n['type'] == 'texture'])}")
    print(f"   technique:  {technique_count}")
    print(f"   place:      {place_count}")
    print(f"   category:   {category_count}")

    # Edge type counts
    edge_types = defaultdict(int)
    for e in edges:
        edge_types[e['type']] += 1

    print(f"\n--- EDGE TYPE COUNTS ---")
    for edge_type, count in sorted(edge_types.items(), key=lambda x: -x[1]):
        status = "✓" if count > 0 else "✗ ZERO"
        print(f"   {status} {edge_type:25s}: {count}")

    print(f"\n--- EDGE TYPE VERIFICATION ---")
    critical_edges = ['FROM_REGION', 'RELATED_DISHES', 'BELONGS_TO', 'PLACE', 'USES_TECHNIQUE', 'USES', 'HAS_FLAVOR']
    all_ok = True
    for et in critical_edges:
        count = edge_types.get(et, 0)
        status = "✓" if count > 0 else "✗ ZERO - NEEDS FIX"
        if count == 0:
            all_ok = False
        print(f"   {status} {et}")

    print(f"\n--- QUALITY GATE WARNINGS ({len(quality_gate_warnings)}) ---")
    if quality_gate_warnings:
        for w in quality_gate_warnings[:20]:
            print(f"   ! {w}")
        if len(quality_gate_warnings) > 20:
            print(f"   ... and {len(quality_gate_warnings) - 20} more")

    print(f"\n--- SUMMARY ---")
    print(f"   BELONGS_TO edges (auto-categorized): {belongs_to_count}")
    print(f"   PLACE edges (cities/departments):     {place_edges_count}")
    print(f"   Skipped list aggregator recipes:     {skipped_list_recipes}")
    print(f"   Quality gate warnings:               {len(quality_gate_warnings)}")
    print(f"{'='*60}")

    return graph

if __name__ == "__main__":
    build_graph()
