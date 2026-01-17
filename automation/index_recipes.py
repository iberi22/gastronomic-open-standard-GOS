import os
import glob
import json
import frontmatter
import datetime

def index_recipes(base_dir="dishes", output_file="output/all_recipes.json"):
    print(f"Indexing recipes from {base_dir}...")

    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    files = glob.glob(os.path.join(base_dir, "**/*.md"), recursive=True)
    all_recipes = []

    for f in files:
        if f.endswith("README.md") or "_template" in f:
            continue

        try:
            post = frontmatter.load(f)
            data = post.metadata

            # Enforce minimal schema
            recipe_entry = {
                'id': os.path.splitext(os.path.basename(f))[0],
                'filepath': f,
                'title': data.get('title', 'Untitled'),
                'country': data.get('country', 'Unknown'),
                'region': data.get('region', 'Unknown'),
                'type': data.get('dish_type', 'Unknown'),
                'tags': data.get('tags', []),
                'slug': data.get('slug', os.path.splitext(os.path.basename(f))[0]),

                # Scientific Data (May be missing in legacy recipes)
                'nutrition': data.get('nutrition_per_serving', data.get('nutrition', {})),
                'sensory': data.get('sensory_profile', {}),
                'ingredients': data.get('ingredients_detailed', []),

                # Metadata
                'last_updated': datetime.datetime.now().isoformat(),
                'standard_compliance': "GOLD" if 'ingredients_detailed' in data else "LEGACY"
            }

            all_recipes.append(recipe_entry)

        except Exception as e:
            print(f"Error parsing {f}: {e}")

    # Write JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'metadata': {
                'generated_at': datetime.datetime.now().isoformat(),
                'count': len(all_recipes),
                'version': '1.0'
            },
            'recipes': all_recipes
        }, f, indent=2, ensure_ascii=False)

    print(f"Successfully indexed {len(all_recipes)} recipes to {output_file}")

    # Also generate a minified version for low-bandwidth usage
    min_file = output_file.replace('.json', '.min.json')
    with open(min_file, 'w', encoding='utf-8') as f:
        json.dump({'recipes': all_recipes}, f, ensure_ascii=False)
    print(f"Minified index saved to {min_file}")

if __name__ == "__main__":
    index_recipes()
