# API & Data Access Documentation

The **AI-Chef** project exposes its culinary database through structured JSON artifacts and CLI tools. This allows external applications (e.g., e-commerce, health apps) to consume our scientific recipe data.

## 📂 Data Artifacts

We generate a static JSON index of all recipes. This is available in the `output/` directory after running the indexing script.

*   **Full Index**: `output/all_recipes.json` (Human readable)
*   **Minified**: `output/all_recipes.min.json` (Bandwidth optimized)

### JSON Schema

```json
{
  "metadata": {
    "generated_at": "2023-10-27T10:00:00",
    "count": 150,
    "version": "1.0"
  },
  "recipes": [
    {
      "id": "bandeja_paisa",
      "title": "Bandeja Paisa",
      "country": "Colombia",
      "standard_compliance": "GOLD", // or "LEGACY"
      "nutrition": {
        "calories": 850,
        "protein_g": 45
      },
      "sensory": {
        "salty": 7,
        "umami": 8
      },
      "ingredients": [
        {
          "name": "Red Beans",
          "quantity": 200,
          "unit": "g",
          "ingredient_id": "legumes/kidney_bean"
        }
      ]
    }
  ]
}
```

## 🛠️ CLI Tools

### 1. Indexing (Generate the JSON)

Run this to refresh the database after editing recipes.

```bash
python automation/index_recipes.py
```

### 2. Search Engine

Query the local database.

```bash
# Search by text
python automation/search_recipes.py --query "chicken"

# Search by tag
python automation/search_recipes.py --tag "Vegetarian"

# Output as JSON (for piping to other tools)
python automation/search_recipes.py --query "soup" --json
```

## 🔄 Integration Guide

To use this data in your application:

1.  **GitHub Pages**: The `all_recipes.min.json` file is deployed to our `gh-pages` branch. You can fetch it directly via HTTP.
    *   URL: `https://[username].github.io/[repo]/output/all_recipes.min.json`
2.  **Submodule**: Add this repo as a submodule and read the `output/` directory.

## 📊 Scientific Standard

Recipes marked as `GOLD` compliance contain:
*   Exact nutritional data calculated from ingredient mass.
*   Links to the `ingredients/` taxonomy.
*   Sensory profiles (0-10) for intelligent matching.
