"""
GOS Graph Generator - Creates graph.json for the ingredient/recipe network visualization.

Extracts nodes (ingredients, recipes, regions, flavors, techniques) and edges (connections between them)
from the markdown files in the repository.
"""

import json
import re
import yaml
from pathlib import Path
from collections import defaultdict


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
}


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
    """
    ingredients = []
    
    # Build pattern to match any emoji prefix before Ingredientes/Ingredients
    # The key is to match ## followed by any optional emoji/unicode and then the word
    heading_pattern = r'^##\s*(?:[\U0001F300-\U0001F9FF\s\d]*?)?\s*(?:Ingredientes|Ingredients)\s*$'
    
    lines = content.split('\n')
    in_ingredient_section = False
    
    for i, line in enumerate(lines):
        # Check if we're entering an ingredient section
        if re.search(heading_pattern, line, re.IGNORECASE):
            in_ingredient_section = True
            continue
        
        # Check if we've left the ingredient section (new heading or ---)
        if in_ingredient_section:
            if re.match(r'^##\s+', line) or re.match(r'^---', line):
                in_ingredient_section = False
                continue
            
            # Extract bullet list items (- item or * item)
            bullet_match = re.match(r'^[-*+]\s+(.+?)(?:\s*[-–—]\s*(.+))?$', line)
            if bullet_match:
                ingredient_text = bullet_match.group(1).strip()
                # Remove quantity/preparation prefix (e.g., "500 g de" -> "")
                ingredient_text = re.sub(
                    r'^[\d½¼¾⅓⅔⅛⅜⅝⅞/\s]+(?:g|kg|ml|l|taza|cucharada|cucharadita|cdta|cdas|kilo|libra|lb|oz|onza)s?\s+(?:de\s+)?',
                    '', ingredient_text, flags=re.IGNORECASE
                )
                ingredient_text = ingredient_text.strip()
                # Skip if it's just a quantity or too short
                if ingredient_text and len(ingredient_text) > 1 and not re.match(r'^\d+$', ingredient_text):
                    ingredients.append(ingredient_text)
                continue
            
            # Extract numbered list items (1. item, 2. item, etc.)
            numbered_match = re.match(r'^\d+\.\s+(.+?)(?:\s*[-–—]\s*(.+))?$', line)
            if numbered_match:
                ingredient_text = numbered_match.group(1).strip()
                # Remove quantity/preparation prefix
                ingredient_text = re.sub(
                    r'^[\d½¼¾⅓⅔⅛⅜⅝⅞/\s]+(?:g|kg|ml|l|taza|cucharada|cucharadita|cdta|cdas|kilo|libra|lb|oz|onza)s?\s+(?:de\s+)?',
                    '', ingredient_text, flags=re.IGNORECASE
                )
                ingredient_text = ingredient_text.strip()
                # Skip if it's just a quantity or too short
                if ingredient_text and len(ingredient_text) > 1 and not re.match(r'^\d+$', ingredient_text):
                    ingredients.append(ingredient_text)
    
    return ingredients


def extract_techniques_from_content(content: str) -> list:
    """Extract cooking techniques/verbs from instructions section.
    
    Looks for ## Instrucciones or similar headings and extracts cooking verbs.
    """
    techniques = []
    
    # Pattern to match instructions section (any language, any emoji)
    instruction_pattern = r'^##\s*(?:[\U0001F300-\U0001F9FF\s\d]*?)?\s*(?:Instrucciones|Instructions|Preparaci(?:ó|o)n|Receta)\s*$'
    
    lines = content.split('\n')
    in_instruction_section = False
    
    for line in lines:
        # Check if we're entering an instruction section
        if re.search(instruction_pattern, line, re.IGNORECASE):
            in_instruction_section = True
            continue
        
        # Check if we've left the section
        if in_instruction_section:
            if re.match(r'^##\s+', line) or re.match(r'^---', line):
                in_instruction_section = False
                continue
            
            # Clean the line of markdown formatting
            clean_line = re.sub(r'\*\*|__|\*|_', '', line)  # Remove bold/italic
            clean_line = re.sub(r'^\d+\.\s*', '', clean_line)  # Remove numbered list prefix
            clean_line = re.sub(r'^[-*+]\s*', '', clean_line)  # Remove bullet prefix
            
            # Split into words and check each against techniques
            words = re.findall(r'\b[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]+\b', clean_line.lower())
            for word in words:
                if word in COOKING_TECHNIQUES:
                    # Capitalize first letter for display
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
    recipe_regions = {}  # recipe_id -> region

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

            recipe_id = f"recipe_{sanitize_id(fm['title'])}"

            # Add recipe node
            nodes[recipe_id] = {
                "id": recipe_id,
                "label": fm.get("title", "Unknown"),
                "type": "recipe",
                "color": NODE_COLORS["recipe"],
                "region": fm.get("region", ""),
                "image": None,
                "size": 30,
            }

            # Extract ingredients from markdown content sections (if not in frontmatter)
            content_ingredients = extract_ingredients_from_content(content)
            
            # Combine frontmatter ingredients with content ingredients
            all_ingredients = fm.get("main_ingredients", []).copy()
            for ing in content_ingredients:
                # Avoid duplicates
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

                # Create edge: recipe -> ingredient
                edges.append({
                    "source": recipe_id,
                    "target": ing_id,
                    "type": "USES",
                    "weight": 2,
                })

                ingredient_recipes[ing_id].append(recipe_id)
            
            # Store for RELATED_DISHES calculation
            recipe_ingredients[recipe_id] = recipe_ingredient_ids

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
                recipe_regions[recipe_id] = region_id

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
                print(f"  ⚠️ Error processing {ing_file}: {e}")

    # === CREATE RELATED_DISHES EDGES (shared ≥3 ingredients) ===
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
    # Group recipes by region
    region_recipes = defaultdict(list)
    for recipe_id, region_id in recipe_regions.items():
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
    for ing_id, recipes in ingredient_recipes.items():
        for other_ing_id, other_recipes in ingredient_recipes.items():
            if ing_id >= other_ing_id:  # Avoid duplicates
                continue

            shared = set(recipes) & set(other_recipes)
            if len(shared) >= 2:  # At least 2 shared recipes
                edges.append({
                    "source": ing_id,
                    "target": other_ing_id,
                    "type": "OFTEN_TOGETHER",
                    "weight": len(shared),
                })

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

    print(f"\n[DONE] Graph generated successfully!")
    print(f"   Nodes: {len(nodes)}")
    print(f"   Edges: {len(edges)}")
    print(f"   Saved to: {OUTPUT_FILE_SITE}")
    print(f"   Saved to: {OUTPUT_FILE_DOCS}")

    # Count recipes
    recipe_count = len([n for n in nodes.values() if n['type'] == 'recipe'])
    print(f"   Recipes: {recipe_count}")
    
    # Count related dishes edges
    related_dishes_count = len([e for e in edges if e['type'] == 'RELATED_DISHES'])
    print(f"   RELATED_DISHES edges: {related_dishes_count}")
    
    # Count technique nodes
    technique_count = len([n for n in nodes.values() if n['type'] == 'technique'])
    print(f"   Technique nodes: {technique_count}")

    return graph

if __name__ == "__main__":
    build_graph()
