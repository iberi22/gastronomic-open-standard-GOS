import os
import glob
import json
import time
import argparse
import frontmatter
import yaml
import google.generativeai as genai
from typing import List, Optional
from pydantic import BaseModel, Field

# --- PYDANTIC MODELS (Structured Output) ---

class IngredientRef(BaseModel):
    name: str = Field(description="Name of the ingredient as it appears in the recipe")
    quantity: float = Field(description="Numerical quantity")
    unit: str = Field(description="Unit of measure (g, ml, cup, unit, etc.)")
    quantity_g_estimate: float = Field(description="Estimated mass in grams for the total quantity. ESSENTIAL for nutrition calc.")
    english_name_key: str = Field(description="English name in snake_case for ID generation (e.g. kidney_bean)")
    category: str = Field(description="Category folder name (proteins, vegetables, grains, legumes, fruits, spices, dairy, oils, sauces, other)")
    notes: Optional[str] = Field(description="Preparation notes (e.g. 'finely chopped')")

class IngredientNutrition(BaseModel):
    calories: float
    protein_g: float
    fat_total_g: float
    carbs_total_g: float
    fiber_g: float
    sugar_g: float
    sodium_mg: float
    iron_mg: Optional[float]
    calcium_mg: Optional[float]
    vitamin_a_iu: Optional[float]
    vitamin_c_mg: Optional[float]

class IngredientFile(BaseModel):
    id: str
    name: str
    common_names: List[str]
    scientific_name: str
    group: str
    state: str = Field(description="State of the ingredient for nutrition data (raw, cooked, dried)")
    nutrition_per_100g: IngredientNutrition
    flavor_profile: dict
    flavor_notes: List[str]
    description: str = Field(description="Scientific and culinary description")
    culinary_uses: List[str]

class SensoryProfile(BaseModel):
    salty: int = Field(description="0-10 scale")
    sweet: int = Field(description="0-10 scale")
    sour: int = Field(description="0-10 scale")
    bitter: int = Field(description="0-10 scale")
    umami: int = Field(description="0-10 scale")
    spicy: int = Field(description="0-10 scale")
    texture_tags: List[str]
    flavor_tags: List[str]

class RecipeAnalysis(BaseModel):
    ingredients_detailed: List[IngredientRef]
    servings: int
    sensory_profile: SensoryProfile
    tags: List[str]
    difficulty: str
    prep_time_minutes: int
    cook_time_minutes: int
    scientific_analysis_md: str = Field(description="Markdown content for the 'Análisis Científico' section")

# --- HELPER FUNCTIONS ---

def get_gemini_model(model_name, response_schema=None):
    return genai.GenerativeModel(
        model_name=model_name,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            response_schema=response_schema
        ) if response_schema else None
    )

def ensure_directory(path):
    if not os.path.exists(path):
        os.makedirs(path)

def create_ingredient_file(category, english_name, common_name, model_name):
    filepath = f"ingredients/{category}/{english_name}.md"
    if os.path.exists(filepath):
        print(f"   [INFO] Ingredient exists: {filepath}")
        return filepath, frontmatter.load(filepath)

    print(f"   [GEN] Creating new ingredient: {english_name} ({common_name})")

    prompt = f"""
    Create a detailed scientific ingredient file for "{common_name}" (English: {english_name}).
    Category: {category}.

    Return JSON matching the schema:
    - id: "{category}/{english_name}"
    - name: Spanish name
    - scientific_name: Latin name
    - nutrition_per_100g: Exact USDA data preferred.
    - state: "raw" unless specified otherwise.
    - description: Scientific botanical/biological description.
    """

    model = get_gemini_model(model_name, IngredientFile)
    response = model.generate_content(prompt)
    data = json.loads(response.text)

    # Construct Markdown
    fm = {
        'id': data['id'],
        'name': data['name'],
        'common_names': data['common_names'],
        'scientific_name': data['scientific_name'],
        'group': data['group'],
        'state': data['state'],
        'nutrition_per_100g': data['nutrition_per_100g'],
        'micronutrients': {
            'iron_mg': data['nutrition_per_100g'].get('iron_mg', 0),
            'calcium_mg': data['nutrition_per_100g'].get('calcium_mg', 0),
            'vitamin_c_mg': data['nutrition_per_100g'].get('vitamin_c_mg', 0)
        },
        'flavor_profile': data['flavor_profile'],
        'tags': data['flavor_notes']
    }

    content = f"""
# Scientific Analysis

## Description
{data['description']}

## Culinary Uses
{chr(10).join(['- ' + use for use in data['culinary_uses']])}
    """

    ensure_directory(os.path.dirname(filepath))
    with open(filepath, 'w') as f:
        f.write(frontmatter.dumps(frontmatter.Post(content, **fm)))

    return filepath, frontmatter.Post(content, **fm)

def calculate_recipe_nutrition(detailed_ingredients):
    total_nutrition = {
        'calories': 0, 'protein_g': 0, 'fat_total_g': 0, 'carbs_total_g': 0,
        'fiber_g': 0, 'sugar_g': 0, 'sodium_mg': 0,
        'iron_mg': 0, 'vitamin_a_iu': 0
    }

    for item in detailed_ingredients:
        ing_id = item['ingredient_id']
        # Use the estimated grams from AI to calculate factor relative to 100g
        qty_g = item.get('quantity_g_estimate', 0)

        if qty_g <= 0:
            print(f"   [WARN] No mass estimate for {item['name']}, skipping nutrition.")
            continue

        factor = qty_g / 100.0

        # Load ingredient file
        path = f"{ing_id}.md" if os.path.exists(f"{ing_id}.md") else f"ingredients/{ing_id}.md"
        if not os.path.exists(path):
            continue

        ing = frontmatter.load(path)
        nut = ing['nutrition_per_100g']

        for key in total_nutrition:
            val = nut.get(key, 0)
            if key in ['iron_mg', 'vitamin_a_iu']:
                 val = ing.get('micronutrients', {}).get(key, 0)

            total_nutrition[key] += (val * factor)

    return total_nutrition

def process_recipe(filepath, model_name):
    print(f"Processing: {filepath}")
    post = frontmatter.load(filepath)
    recipe_text = post.content
    old_fm = post.metadata

    # 1. Analyze Recipe
    print("   [AI] Analyzing recipe structure...")
    model = get_gemini_model(model_name, RecipeAnalysis)
    prompt = f"""
    Analyze this recipe text and extract structured data.

    Original Title: {old_fm.get('title')}
    Original Metadata: {old_fm}

    Recipe Content:
    {recipe_text}

    Task:
    1. Extract all ingredients into the 'IngredientRef' list.
       - CRITICAL: Provide 'quantity_g_estimate' (mass in grams) for every ingredient.
       - Example: "1 cup rice" -> quantity: 1, unit: "cup", quantity_g_estimate: 200.
       - Example: "1 onion" -> quantity: 1, unit: "unit", quantity_g_estimate: 150.
    2. Analyze sensory profile (0-10) and tags.
    3. Write a 'Scientific Analysis' section (markdown) covering chemistry, nutrition, and history.
    """

    response = model.generate_content(prompt)
    try:
        analysis = json.loads(response.text)
    except Exception as e:
        print(f"   [ERROR] Failed to parse AI response: {e}")
        return

    # 2. Process Ingredients
    detailed_ingredients = []

    for ref in analysis['ingredients_detailed']:
        # Ensure ingredient file exists
        ing_path, ing_data = create_ingredient_file(ref['category'], ref['english_name_key'], ref['name'], model_name)

        # Add to detailed list
        detailed_ingredients.append({
            'name': ref['name'],
            'quantity': ref['quantity'],
            'unit': ref['unit'],
            'quantity_g_estimate': ref['quantity_g_estimate'],
            'ingredient_id': ing_path.replace('.md', ''),
            'notes': ref['notes']
        })

    # 3. Calculate Nutrition
    servings = analysis['servings'] if analysis['servings'] > 0 else 4
    total_nut = calculate_recipe_nutrition(detailed_ingredients)
    nut_per_serving = {k: round(v / servings, 2) for k, v in total_nut.items()}

    # 4. Construct New Frontmatter
    new_fm = old_fm.copy()
    new_fm.update({
        'ingredients_detailed': detailed_ingredients,
        'servings': servings,
        'nutrition_per_serving': nut_per_serving,
        'sensory_profile': analysis['sensory_profile'],
        'tags': list(set(old_fm.get('tags', []) + analysis['tags'])),
        'difficulty': analysis['difficulty'],
        'prep_time_minutes': analysis['prep_time_minutes'],
        'cook_time_minutes': analysis['cook_time_minutes']
    })

    # 5. Construct New Content
    new_content = f"""
{recipe_text.split('## 🔬')[0].strip()}

## 🔬 Análisis Científico y Nutricional
{analysis['scientific_analysis_md']}
    """

    # Write file
    print("   [SAVE] Updating recipe file...")
    with open(filepath, 'w') as f:
        f.write(frontmatter.dumps(frontmatter.Post(new_content, **new_fm)))

# --- MAIN ---

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Standardize recipes using Gemini AI.")
    parser.add_argument("--target_directory", type=str, required=True, help="Directory containing recipes to process")
    parser.add_argument("--limit", type=int, default=5, help="Maximum number of recipes to process")
    parser.add_argument("--model", type=str, default="gemini-2.0-flash", help="Gemini model to use")

    args = parser.parse_args()

    # Configuration
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    genai.configure(api_key=GEMINI_API_KEY)

    files = glob.glob(os.path.join(args.target_directory, "**/*.md"), recursive=True)

    # Filter out READMEs
    files = [f for f in files if not f.endswith('README.md') and 'recetas_andinas' not in f]

    print(f"Found {len(files)} recipes in {args.target_directory}")

    # Limit
    files = files[:args.limit]

    for f in files:
        try:
            process_recipe(f, args.model)
            time.sleep(2)
        except Exception as e:
            print(f"Failed to process {f}: {e}")
            import traceback
            traceback.print_exc()
