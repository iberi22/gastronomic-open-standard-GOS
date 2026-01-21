import os
import subprocess
import shutil
import re
from pathlib import Path

# Configuration
REPO_URL = "https://github.com/Anduin2017/HowToCook.git"
TEMP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK_DIR = os.path.join(TEMP_DIR, ".cache", "HowToCook")
DISHES_DIR = os.path.join(TEMP_DIR, "dishes", "china")

def sync_repo():
    """Clones or pulls the HowToCook repo."""
    try:
        if not os.path.exists(WORK_DIR):
            print(f"Cloning {REPO_URL}...")
            os.makedirs(os.path.dirname(WORK_DIR), exist_ok=True)
            subprocess.run(["git", "clone", "--depth", "1", REPO_URL, WORK_DIR], check=True)
        else:
            print("Pulling latest changes...")
            # subprocess.run(["git", "-C", WORK_DIR, "pull"], check=True)
            pass
    except subprocess.CalledProcessError as e:
        if os.path.exists(os.path.join(WORK_DIR, "dishes")):
            print(f"Warning: Git command failed ({e}), but 'dishes' directory exists. Proceeding...")
        else:
            raise e

def parse_markdown_recipe(file_path):
    """
    Simulates parsing the Chinese recipe markdown.
    Extracts: Title, Ingredients, Difficulty.
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract title
    title_match = re.search(r'^#\s+(.+)', content, re.MULTILINE)
    title = title_match.group(1) if title_match else "Unknown Recipe"

    # Extract Difficulty (e.g., 预估烹饪难度：★★★★)
    difficulty = "Unknown"
    diff_match = re.search(r'预估烹饪难度[：:]\s*([★☆]+)', content)
    if diff_match:
        difficulty = diff_match.group(1)

    # Extract Main Ingredients (Simple Heuristic: first 5 items in the first list found)
    ingredients = []
    # Find list block after "原料" or "工具"
    ing_match = re.search(r'(?:必备原料|原料).*?(\n\s*[-*].*?)(?:##|\n\n)', content, re.DOTALL | re.IGNORECASE)
    if ing_match:
        items = re.findall(r'[-*]\s+(.+)', ing_match.group(1))
        # Cleanup: remove qty
        clean_items = [re.sub(r'[\d\./]+[a-zA-Z\u4e00-\u9fff]*', '', i).strip() for i in items]
        ingredients = [i for i in clean_items if i][:6] # Take top 6

    return {
        "title": title,
        "difficulty": difficulty,
        "ingredients": ingredients,
        "content": content,
        "original_path": file_path
    }

def convert_to_ai_chef_format(recipe_data, category):
    """
    Converts raw data to gastronomic-open-standard-GOS Markdown format with RICH metadata.
    """

    # Structure for gastronomic-open-standard-GOS
    ingredient_list = "\n".join([f"  - {i}" for i in recipe_data['ingredients']]) if recipe_data['ingredients'] else "  - Unknown"

    front_matter = f"""---
title: "{recipe_data['title']}"
region: "China"
language: "zh"
license: "MIT"
source_repo: "Anduin2017/HowToCook"
category: "{category}"

# --- Classification ---
difficulty: "{recipe_data['difficulty']}"
prep_time: "Unknown"
cook_time: "Unknown"
tags:
  - chinese_cuisine
  - {category}

# --- Ingredients ---
main_ingredients:
{ingredient_list}

# --- Sensory Profile (TODO) ---
sensory:
  flavor: []
  texture: []
  aroma: []

# --- Nutrition (TODO) ---
nutrition:
  calories: 0
  macros:
    protein_g: 0
    fat_g: 0
    carbs_g: 0
---
"""
    return front_matter + "\n" + recipe_data['content']

def process_recipes():
    """Main processing loop."""
    # The folder structure in HowToCook is like: dishes/meat, dishes/aquatic, etc.
    category_map = {
        "meat": "carnes",
        "aquatic": "mariscos",
        "vegetable": "vegetales",
        "soup": "sopas",
        "staple": "principales",
    }

    base_dishes_path = os.path.join(WORK_DIR, "dishes")
    if not os.path.exists(base_dishes_path):
        print("Dishes folder not found in HowToCook repo. Structure might have changed.")
        return

    for original_cat, target_cat in category_map.items():
        cat_path = os.path.join(base_dishes_path, original_cat)
        if not os.path.exists(cat_path):
            continue

        for file in os.listdir(cat_path):
            if file.endswith(".md") and file != "README.md":
                full_path = os.path.join(cat_path, file)
                print(f"Processing: {file}...")

                recipe_data = parse_markdown_recipe(full_path)
                formatted_content = convert_to_ai_chef_format(recipe_data, target_cat)

                # DEBUG: Check if metadata is present
                print(f"DEBUG Front Matter:\n{formatted_content[:200]}...")

                # Output Path
                safe_name = re.sub(r'\.md$', '', file)
                output_dir = os.path.join(DISHES_DIR, target_cat, safe_name)
                os.makedirs(output_dir, exist_ok=True)

                output_file = os.path.join(output_dir, f"{safe_name}.md")

                # Check if file exists to prevent overwriting enriched data
                if os.path.exists(output_file):
                    print(f"Skipping existing file: {output_file}")
                    continue

                with open(output_file, 'w', encoding='utf-8') as out:
                    out.write(formatted_content)
                print(f"Created: {output_file}")

if __name__ == "__main__":
    sync_repo()
    process_recipes()
