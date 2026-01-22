"""
GOS Graph Generator - Creates graph.json for the ingredient/recipe network visualization.

Extracts nodes (ingredients, recipes, regions, flavors) and edges (connections between them)
from the markdown files in the repository.
"""

import json
import re
import yaml
from pathlib import Path
from collections import defaultdict

# Paths
DISHES_DIR = Path("dishes")
INGREDIENTS_DIR = Path("ingredients")
OUTPUT_FILE = Path("docs/graph.json")

# Node types with colors (brutalist palette)
NODE_COLORS = {
    "recipe": "#FF6B6B",      # Red
    "ingredient": "#4ECDC4",  # Teal
    "region": "#FFE66D",      # Yellow
    "flavor": "#95E1D3",      # Mint
    "texture": "#F38181",     # Coral
    "technique": "#AA96DA",   # Purple
}

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

    # Track connections for edge weighting
    ingredient_recipes = defaultdict(list)
    flavor_ingredients = defaultdict(list)

    # === PROCESS RECIPES ===
    print("📖 Processing recipes...")
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
                "image": None,  # Could add recipe images later
                "size": 30,
            }

            # Process main ingredients
            for ing in fm.get("main_ingredients", []):
                ing_id = f"ingredient_{sanitize_id(ing)}"

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
            if fm.get("region"):
                region_id = f"region_{sanitize_id(fm['region'])}"

                if region_id not in nodes:
                    nodes[region_id] = {
                        "id": region_id,
                        "label": fm["region"],
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

        except Exception as e:
            print(f"  ⚠️ Error processing {recipe_file}: {e}")

    # === PROCESS INGREDIENT FILES (if they exist) ===
    print("🥕 Processing ingredient files...")
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

    # === CREATE INGREDIENT-TO-INGREDIENT CONNECTIONS ===
    print("🔗 Creating ingredient similarity connections...")
    # Connect ingredients that appear together in many recipes
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

    # Save to file
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(json.dumps(graph, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"\n✅ Graph generated successfully!")
    print(f"   📊 Nodes: {len(nodes)}")
    print(f"   🔗 Edges: {len(edges)}")
    print(f"   📁 Saved to: {OUTPUT_FILE}")

    return graph

if __name__ == "__main__":
    build_graph()
