# 📡 gastronomic-open-standard-GOS Recipe API

A RESTful JSON API serving **428 recipes** from multiple cuisines, automatically generated from markdown files.

## Quick Start

```bash
# Get all recipes
curl https://gos-site.pages.dev/api/all.json

# Get Colombian recipes
curl https://gos-site.pages.dev/api/spanish/colombia.json

# Get Chinese recipes
curl https://gos-site.pages.dev/api/chinese/china.json
```

## 📊 Statistics

- **Total Recipes**: 428
- **Languages**: Chinese (325), Spanish (103)
- **Countries**: China (324), Colombia (101), Peru (1)
- **With Metadata**: 103 recipes (Colombian & Peruvian)
- **Without Metadata**: 325 recipes (Chinese)

## 🌐 Endpoints

### Main Endpoints

| Endpoint | Description | Count |
|----------|-------------|-------|
| `/api/index.json` | API index with all available endpoints | - |
| `/api/all.json` | All recipes | 428 |
| `/api/with-metadata.json` | Recipes with YAML frontmatter | 103 |
| `/api/without-metadata.json` | Recipes without metadata (Chinese) | 325 |

### By Language

| Endpoint | Description | Count |
|----------|-------------|-------|
| `/api/spanish/index.json` | All Spanish recipes | 103 |
| `/api/spanish/colombia.json` | Colombian recipes | 101 |
| `/api/spanish/peru.json` | Peruvian recipes | 1 |
| `/api/chinese/index.json` | All Chinese recipes | 325 |
| `/api/chinese/china.json` | Chinese recipes | 324 |

### By Country

| Endpoint | Description | Count |
|----------|-------------|-------|
| `/api/countries/colombia.json` | All Colombian recipes | 101 |
| `/api/countries/china.json` | All Chinese recipes | 324 |
| `/api/countries/peru.json` | All Peruvian recipes | 1 |

## 📦 Response Schema

```json
{
  "recipes": [
    {
      "id": "colombian/nacionales/chuzo",
      "title": "Chuzo Colombiano (Brocheta Callejera)",
      "language": "spanish",
      "country": "colombia",
      "hasMetadata": true,
      "metadata": {
        "title": "Chuzo Colombiano...",
        "region": "Nacional",
        "categories": ["Snack", "Comida callejera"],
        "difficulty": "★★☆☆☆",
        "prep_time": "40 minutos",
        "cook_time": "30 minutos",
        "servings": 6
      },
      "category": ["Snack", "Comida callejera"],
      "difficulty": "★★☆☆☆",
      "prepTime": "40 minutos",
      "cookTime": "30 minutos",
      "servings": 6,
      "mainIngredients": ["Carne de res", "Pollo", "Papa salada"],
      "tags": ["colombiano", "tradicional", "chuzo"],
      "filePath": "dishes/colombian/nacionales/chuzo.md"
    }
  ],
  "count": 101
}
```

## 💻 Usage Examples

### JavaScript / Fetch API

```javascript
fetch('https://gos-site.pages.dev/api/spanish/colombia.json')
  .then(res => res.json())
  .then(data => {
    console.log(`Found ${data.count} Colombian recipes`);
    data.recipes.forEach(recipe => {
      console.log(`- ${recipe.title} (${recipe.difficulty})`);
    });
  });
```

### Python / Requests

```python
import requests

response = requests.get(
    'https://gos-site.pages.dev/api/chinese/china.json'
)
data = response.json()

print(f"Found {data['count']} Chinese recipes")
for recipe in data['recipes']:
    print(f"- {recipe['title']}")
```

### cURL + jq

```bash
# Get all languages
curl https://gos-site.pages.dev/api/index.json | jq '.languages'

# Get recipe titles from Colombia
curl https://gos-site.pages.dev/api/spanish/colombia.json | jq '.recipes[].title'

# Filter recipes by difficulty
curl https://gos-site.pages.dev/api/spanish/colombia.json | jq '.recipes[] | select(.difficulty == "★★☆☆☆")'
```

## 🔧 How It Works

1. **Scanning**: The `generate-api.js` script scans all `.md` files in `/dishes`
2. **Detection**:
   - Language detected by character patterns (Chinese vs Spanish)
   - Country inferred from directory structure
   - Metadata parsed using `gray-matter` (YAML frontmatter)
3. **Grouping**: Recipes organized by language, country, and metadata presence
4. **Generation**: Static JSON files created in `/public/api/`
5. **Deployment**: Published with GitHub Pages

## 📝 Notes

- **Chinese recipes** don't have YAML frontmatter metadata (legacy format)
- **Colombian & Peruvian recipes** have complete structured metadata
- All endpoints support **CORS** - use from any domain
- Data is **static JSON** - fast and cacheable
- Updated automatically on every deployment
- No authentication required - free and open

## 🔗 Links

- **API Documentation**: <https://gos-site.pages.dev/api-docs>
- **Main Site**: <https://gos-site.pages.dev/>
- **GitHub Repository**: <https://github.com/iberi22/gastronomic-open-standard-GOS>

## 📄 License

MIT - Same as the recipe collection
