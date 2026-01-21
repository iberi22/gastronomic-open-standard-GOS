import os
import glob
# import yaml (Removed unnecessary import as per code review)

def check_recipe_status(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check for Frontmatter
    has_frontmatter = content.startswith('---')

    # Check for New Standard Section
    has_new_standard = "### 📊 Perfil Sensorial Estandarizado" in content and "### ⚗️ Química y Física Culinaria" in content

    # Check for Old Standard Section
    has_old_standard = "### Categorización Sensorial y de Uso" in content

    # Check for Basic Structure
    has_ingredients = "## 📝 Ingredientes" in content or "## Ingredientes" in content

    return {
        "filepath": filepath,
        "has_frontmatter": has_frontmatter,
        "has_new_standard": has_new_standard,
        "has_old_standard": has_old_standard,
        "has_ingredients": has_ingredients
    }

def main():
    dishes_dir = "dishes"
    recipes = []

    for root, dirs, files in os.walk(dishes_dir):
        for file in files:
            if file.endswith(".md") and file not in ["README.md", "PLAN.md", "METODOLOGIA.md", "CONTRIBUTING.md"]:
                filepath = os.path.join(root, file)
                # Skip PLAN files or non-recipe files if any
                if "PLAN" in file: continue

                recipes.append(check_recipe_status(filepath))

    level_1 = [r for r in recipes if r['has_new_standard']]
    level_2 = [r for r in recipes if r['has_old_standard'] and not r['has_new_standard']]
    level_3 = [r for r in recipes if not r['has_new_standard'] and not r['has_old_standard']]

    print(f"Total Recipes: {len(recipes)}")
    print(f"Level 1 (Fully Updated): {len(level_1)}")
    print(f"Level 2 (Partially Updated): {len(level_2)}")
    print(f"Level 3 (Basic): {len(level_3)}")

    print("\n--- Level 1 Files ---")
    for r in level_1: print(r['filepath'])

    print("\n--- Level 2 Files ---")
    for r in level_2: print(r['filepath'])

    # Write details to a file
    with open("recipe_audit_report.txt", "w") as f:
        f.write(f"Total Recipes: {len(recipes)}\n")
        f.write(f"Level 1 (Fully Updated): {len(level_1)}\n")
        f.write(f"Level 2 (Partially Updated): {len(level_2)}\n")
        f.write(f"Level 3 (Basic): {len(level_3)}\n")
        f.write("\n--- Level 1 Files ---\n")
        for r in level_1: f.write(f"{r['filepath']}\n")
        f.write("\n--- Level 2 Files ---\n")
        for r in level_2: f.write(f"{r['filepath']}\n")
        f.write("\n--- Level 3 Files ---\n")
        for r in level_3: f.write(f"{r['filepath']}\n")

if __name__ == "__main__":
    main()
