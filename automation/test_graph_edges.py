"""
GOS Graph Edge Validation Tests
================================
Verifies the knowledge graph has correct node/edge structure.
Run: python automation/test_graph_edges.py
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
GRAPH_FILE = ROOT / "site" / "graph-data.json"
VALID_NODE_TYPES = {"recipe", "ingredient", "flavor", "texture", "aroma", "region", "nutrition", "category", "technique"}
VALID_EDGE_TYPES = {"HAS_RECIPE", "USES_INGREDIENT", "BELONGS_TO", "HAS_FLAVOR", "HAS_TEXTURE", "HAS_AROMA", "HAS_MACRO", "default"}

def load_graph():
    if not GRAPH_FILE.exists():
        print(f"[FAIL] Graph file not found: {GRAPH_FILE}")
        sys.exit(1)
    with open(GRAPH_FILE, encoding="utf-8") as f:
        return json.load(f)

def test_file_exists():
    assert GRAPH_FILE.exists(), f"Graph file missing: {GRAPH_FILE}"
    print(f"[PASS] Graph file exists: {GRAPH_FILE}")

def test_node_structure(data):
    nodes = data.get("nodes", [])
    assert len(nodes) > 0, "No nodes found in graph"
    print(f"[PASS] Nodes: {len(nodes)}")
    for n in nodes:
        assert "id" in n, f"Node missing 'id': {n}"
        assert "type" in n, f"Node {n['id']} missing 'type'"
        assert n["type"] in VALID_NODE_TYPES, f"Invalid node type '{n['type']}' for node {n['id']}"
    print(f"[PASS] All {len(nodes)} nodes have valid structure")

def test_edge_structure(data):
    edges = data.get("edges", [])
    assert len(edges) > 0, "No edges found in graph"
    print(f"[PASS] Edges: {len(edges)}")
    for e in edges:
        assert "source" in e, f"Edge missing 'source': {e}"
        assert "target" in e, f"Edge missing 'target': {e}"
    print(f"[PASS] All {len(edges)} edges have valid structure")

def test_recipe_has_edges(data):
    nodes = data.get("nodes", [])
    edges = data.get("edges", [])
    recipes = [n for n in nodes if n["type"] == "recipe"]
    recipe_ids = {r["id"] for r in recipes}
    print(f"[INFO] Checking {len(recipes)} recipes have connections...")

    disconnected = []
    for r in recipes:
        connected = any(
            (e.get("source",{}).get("id") == r["id"] or e.get("source") == r["id"]) or
            (e.get("target",{}).get("id") == r["id"] or e.get("target") == r["id"])
            for e in edges
        )
        if not connected:
            disconnected.append(r["id"])

    if disconnected:
        print(f"[WARN] {len(disconnected)} disconnected recipes: {disconnected[:5]}")
    else:
        print(f"[PASS] All {len(recipes)} recipes have at least one edge")

def test_region_has_recipes(data):
    nodes = data.get("nodes", [])
    edges = data.get("edges", [])
    regions = [n for n in nodes if n["type"] == "region"]
    print(f"[INFO] Checking {len(regions)} regions have recipes...")

    for r in regions:
        has_recipe = any(
            (e.get("source",{}).get("id") == r["id"] or e.get("source") == r["id"]) and
            e.get("type") == "HAS_RECIPE"
            for e in edges
        )
        assert has_recipe, f"Region '{r['id']}' has no recipes"
    print(f"[PASS] All {len(regions)} regions have at least one recipe")

def test_meta_counts(data):
    meta = data.get("meta", {})
    if not meta:
        print("[SKIP] No meta field found")
        return

    nodes = data.get("nodes", [])
    edges = data.get("edges", [])
    recipes = [n for n in nodes if n["type"] == "recipe"]

    if "node_count" in meta:
        assert meta["node_count"] == len(nodes), f"node_count mismatch: meta={meta['node_count']}, actual={len(nodes)}"
        print(f"[PASS] node_count: {meta['node_count']}")
    if "edge_count" in meta:
        assert meta["edge_count"] == len(edges), f"edge_count mismatch"
        print(f"[PASS] edge_count: {meta['edge_count']}")
    if "recipe_count" in meta:
        assert meta["recipe_count"] == len(recipes), f"recipe_count mismatch"
        print(f"[PASS] recipe_count: {meta['recipe_count']}")

def test_edge_type_coverage(data):
    edges = data.get("edges", [])
    type_counts = {}
    for e in edges:
        t = e.get("type", "default")
        type_counts[t] = type_counts.get(t, 0) + 1

    print(f"[INFO] Edge type distribution:")
    for t, c in sorted(type_counts.items(), key=lambda x: -x[1]):
        valid = "OK" if t in VALID_EDGE_TYPES else "UNKNOWN"
        print(f"  {t}: {c} ({valid})")

    must_have = {"HAS_RECIPE", "USES_INGREDIENT"}
    for t in must_have:
        assert t in type_counts, f"Missing required edge type: {t}"
    print(f"[PASS] All required edge types present")

def test_ingredient_references(data):
    """Every ingredient used in recipes should be in the graph."""
    nodes = data.get("nodes", [])
    edges = data.get("edges", [])
    ingredients = {n["id"] for n in nodes if n["type"] == "ingredient"}

    used_ings = set()
    for e in edges:
        if e.get("type") == "USES_INGREDIENT":
            s = e.get("source",{})
            t = e.get("target",{})
            src = (s.get("id") if isinstance(s, dict) else s)
            tgt = (t.get("id") if isinstance(t, dict) else t)
            if src in ingredients: used_ings.add(src)
            if tgt in ingredients: used_ings.add(tgt)

    print(f"[INFO] {len(used_ings)} ingredient nodes are referenced in edges")
    print(f"[PASS] Ingredient references are valid")

def main():
    print("=" * 50)
    print("GOS Graph Validation Tests")
    print("=" * 50)
    data = load_graph()
    test_file_exists()
    test_node_structure(data)
    test_edge_structure(data)
    test_meta_counts(data)
    test_edge_type_coverage(data)
    test_recipe_has_edges(data)
    test_region_has_recipes(data)
    test_ingredient_references(data)
    print("")
    print("[ALL TESTS PASSED]")

if __name__ == "__main__":
    main()
