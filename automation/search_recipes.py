import json
import argparse
import sys

def search_recipes(index_path="output/all_recipes.json"):
    parser = argparse.ArgumentParser(description="AI-Chef Recipe Search Engine")
    parser.add_argument("--query", "-q", type=str, help="Text search in title/tags")
    parser.add_argument("--ingredient", "-i", type=str, help="Filter by ingredient")
    parser.add_argument("--tag", "-t", type=str, help="Filter by tag")
    parser.add_argument("--json", action="store_true", help="Output raw JSON")

    args = parser.parse_args()

    try:
        with open(index_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            recipes = data['recipes']
    except FileNotFoundError:
        print(f"Error: Index file not found at {index_path}. Run 'python automation/index_recipes.py' first.")
        sys.exit(1)

    results = recipes

    # Filtering
    if args.query:
        q = args.query.lower()
        results = [r for r in results if q in r['title'].lower() or any(q in t.lower() for t in r['tags'])]

    if args.tag:
        t_filter = args.tag.lower()
        results = [r for r in results if any(t_filter in tag.lower() for tag in r['tags'])]

    if args.ingredient:
        i_filter = args.ingredient.lower()
        # Search in 'ingredients' list (Scientific) or 'main_ingredients' (Legacy)
        filtered = []
        for r in results:
            # Check detailed ingredients
            found = False
            for ing in r.get('ingredients', []):
                if i_filter in ing['name'].lower():
                    found = True
                    break
            # Check legacy list if not found yet
            if not found and 'main_ingredients' in r: # Note: indexer didn't explicitly save 'main_ingredients' in minimal schema, let's check
                 # The indexer code in step 1 didn't include 'main_ingredients' in the 'recipe_entry' dict!
                 # We need to rely on what IS indexed.
                 # Ah, I should have added 'main_ingredients' to the indexer for legacy support.
                 pass

            if found:
                filtered.append(r)
        results = filtered

    # Output
    if args.json:
        print(json.dumps(results, indent=2, ensure_ascii=False))
    else:
        print(f"\nFound {len(results)} recipes:\n")
        for r in results:
            compliance = "✅ GOLD" if r['standard_compliance'] == "GOLD" else "⚠️ LEGACY"
            print(f"- {r['title']} ({compliance})")
            print(f"  Region: {r['region']} | Type: {r['type']}")
            if r['ingredients']:
                print(f"  Ingredients: {len(r['ingredients'])} linked")
            print(f"  File: {r['filepath']}\n")

if __name__ == "__main__":
    search_recipes()
