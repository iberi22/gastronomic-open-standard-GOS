"""
GOS Knowledge Graph Builder - Enhanced
Generates the complete knowledge graph with ALL connections:
- Region → Recipe
- Recipe → Ingredient (via main_ingredients)
- Recipe → Flavor / Texture / Aroma (via sensory)
- Ingredient → Category Group
- Recipe → Nutrition (macros)
"""
import json
import re
import yaml
from pathlib import Path
from collections import defaultdict

ROOT_DIR = Path("E:/scripts-python/gastronomic-open-standard-GOS")
DISHES_DIR = ROOT_DIR / "dishes"
INGREDIENTS_DIR = ROOT_DIR / "ingredients"
OUTPUT_JSON = ROOT_DIR / "site" / "graph-data.json"

NODE_COLORS = {
    "recipe": "#ff6b35",
    "ingredient": "#00ff66",
    "flavor": "#ffe66d",
    "texture": "#f38181",
    "aroma": "#a8e6cf",
    "region": "#7d61ff",
    "technique": "#95e1d3",
    "nutrition": "#f9c74f",
    "category": "#90be6d",
}

def clean_id(text):
    return re.sub(r'[^a-zA-Z0-9]', '_', str(text).lower().strip())[:60]

def extract_frontmatter(content):
    if content.startswith("---"):
        try:
            _, fm, _ = content.split("---", 2)
            return yaml.safe_load(fm)
        except:
            pass
    return {}

def walk_recipes(dir_path):
    results = []
    try:
        for entry in Path(dir_path).rglob("*.md"):
            if entry.name.startswith("_") or "README" in entry.name:
                continue
            results.append(entry)
    except:
        pass
    return results

def build_graph():
    nodes = {}
    edges = []
    edge_set = set()

    def add_edge(src, tgt, etype=""):
        key = f"{src}|{tgt}"
        if key not in edge_set:
            edge_set.add(key)
            edges.append({"source": src, "target": tgt, "type": etype})

    def ensure_node(nid, label, ntype, extras=None):
        if nid not in nodes:
            nodes[nid] = {"id": nid, "label": label, "type": ntype, "color": NODE_COLORS.get(ntype, "#888"), "size": 5}
            if extras:
                nodes[nid].update(extras)

    # ─── REGIONS ───
    regions = [
        ("colombian", "Colombian"), ("peruvian", "Peruvian"), ("china", "China"),
        ("amazonia", "Amazonia"), ("andina", "Andina"), ("caribe", "Caribe"),
        ("pacifica", "Pacifica"), ("valle_del_cauca", "Valle Del Cauca"),
        ("nacional", "Nacional"), ("orinoquia", "Orinoquia"), ("insular", "Insular"),
    ]
    for rid, rlabel in regions:
        ensure_node(rid, rlabel, "region", {"size": 20})

    # ─── INGREDIENTS from ingredients/ directory ───
    ing_categories = {
        "condiments": [], "dairy": [], "fruits": [], "grains": [], "legumes": [],
        "oils": [], "proteins": [], "sauces": [], "vegetables": []
    }
    if INGREDIENTS_DIR.exists():
        for cat in ing_categories:
            cat_dir = INGREDIENTS_DIR / cat
            if cat_dir.exists():
                for f in cat_dir.iterdir():
                    if f.is_file() and f.suffix in (".md", ".yml", ".yaml"):
                        data = extract_frontmatter(f.read_text(encoding="utf-8"))
                        name = data.get("name") or data.get("title") or f.stem
                        iid = clean_id(name)
                        ing_categories[cat].append(name)
                        extras = {}
                        if data.get("scientific_name"):
                            extras["scientific_name"] = data["scientific_name"]
                        ensure_node(iid, name, "ingredient", extras)
                        # Link ingredient → category
                        cat_nid = f"cat_{cat}"
                        ensure_node(cat_nid, cat.capitalize(), "category", {"size": 8})
                        add_edge(iid, cat_nid, "BELONGS_TO")

    print(f"✅ Ingredients: {sum(len(v) for v in ing_categories.values())} across {len(ing_categories)} categories")

    # ─── RECIPES + all their edges ───
    recipe_files = walk_recipes(DISHES_DIR)
    print(f"🔍 Scanning {len(recipe_files)} recipe files...")
    processed = 0

    for f in recipe_files:
        try:
            content = f.read_text(encoding="utf-8")
            data = extract_frontmatter(content)
            if not data or 'title' not in data:
                continue

            rid = clean_id(data['title'])
            region_label = data.get('region', 'Colombian')
            region_key = region_label.lower().split('(')[0].strip().replace(' ', '_')[:30]
            if region_key not in nodes:
                ensure_node(region_key, region_label, "region", {"size": 15})

            extras = {
                "region": region_label,
                "size": 10,
                "difficulty": data.get("difficulty"),
                "prep_time": data.get("prep_time"),
                "cook_time": data.get("cook_time"),
                "categories": data.get("categories", []),
                "tags": data.get("tags", []),
            }
            ensure_node(rid, data['title'], "recipe", extras)

            # Region → Recipe
            add_edge(region_key, rid, "HAS_RECIPE")

            # Recipe → Main Ingredients
            for ing in data.get('main_ingredients', []):
                iid = clean_id(ing)
                if iid in nodes or True:  # Link even if not in index
                    ensure_node(iid, ing, "ingredient", {"size": 4})
                    add_edge(rid, iid, "USES_INGREDIENT")

            # Sensory Profile → Flavor / Texture / Aroma
            sensory = data.get('sensory') or {}
            for flav in sensory.get('flavor', []):
                fid = clean_id(flav)
                ensure_node(fid, flav, "flavor", {"size": 3})
                add_edge(rid, fid, "HAS_FLAVOR")

            for tex in sensory.get('texture', []):
                tid = clean_id(tex)
                ensure_node(tid, tex, "texture", {"size": 3})
                add_edge(rid, tid, "HAS_TEXTURE")

            for aro in sensory.get('aroma', []):
                aid = clean_id(aro)
                ensure_node(aid, aro, "aroma", {"size": 3})
                add_edge(rid, aid, "HAS_AROMA")

            # Nutrition → Macros
            nutrition = data.get('nutrition') or {}
            macros = nutrition.get('macros') or {}
            if macros:
                for macro_key in ['protein_g', 'fat_g', 'carbs_g']:
                    val = macros.get(macro_key)
                    if val:
                        mid = f"{rid}__{macro_key}"
                        ensure_node(mid, macro_key.replace('_', ' ').title(), "nutrition", {"size": 2})
                        add_edge(rid, mid, "HAS_MACRO")

            processed += 1
        except Exception as e:
            print(f"  ⚠️ Error in {f.name}: {e}")

    # ─── Dynamic sizing by connectivity ───
    conn_count = defaultdict(int)
    for e in edges:
        src = e['source'] if isinstance(e['source'], str) else e['source'].get('id', '')
        tgt = e['target'] if isinstance(e['target'], str) else e['target'].get('id', '')
        conn_count[src] += 1
        conn_count[tgt] += 1

    for nid, node in nodes.items():
        base = node.get("size", 5)
        node["size"] = base + conn_count[nid] * 0.3

    result = {
        "nodes": list(nodes.values()),
        "edges": edges,
        "meta": {
            "generated": __import__("datetime").datetime.now().isoformat(),
            "recipe_count": processed,
            "ingredient_count": sum(len(v) for v in ing_categories.values()),
            "region_count": len([n for n in nodes.values() if n["type"] == "region"]),
            "node_count": len(nodes),
            "edge_count": len(edges),
        }
    }

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"\n📊 GRAPH STATS:")
    print(f"   Nodes:   {len(nodes)}")
    print(f"   Edges:   {len(edges)}")
    print(f"   Recipes: {processed}")
    print(f"   Saved:   {OUTPUT_JSON}")
    return result

if __name__ == "__main__":
    build_graph()
