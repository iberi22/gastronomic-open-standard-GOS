# 📡 gastronomic-open-standard-GOS Recipe API

A RESTful JSON API serving **473 recipes** from multiple cuisines, automatically generated from markdown files.

> **Note on scope**: `generate-api.js` skips the `dishes/china/` directory and any
> file whose name contains CJK characters, so the legacy Chinese collection
> (118 files) is **not** part of the served API. The site copy
> (`copy-content.js`) applies the same filter.

## Quick Start

```bash
# Get all recipes
curl https://gos.swal.network/api/all.json

# Get Colombian recipes
curl https://gos.swal.network/api/spanish/colombia.json

# Get recipes by country
curl https://gos.swal.network/api/by-country/colombia.json
```

## 📊 Statistics

- **Total Recipes**: 473
- **Languages**: Spanish (473)
- **Countries**: Colombia (109), India (35), Japan (35), Mexico (35), United States (35), Brazil (25), and 13 more
- **With Metadata**: 473 recipes (all scanned recipes carry YAML frontmatter)
- **Without Metadata**: 0 recipes

> **Endpoint paths**: countries are served under `/api/by-country/<slug>.json`
> (not `/api/countries/`). Language buckets live under `/api/<language>/<country>.json`.

## 🌐 Endpoints

### Main Endpoints

| Endpoint | Description | Count |
|----------|-------------|-------|
| `/api/index.json` | API index with all available endpoints | - |
| `/api/all.json` | All recipes | 473 |
| `/api/with-metadata.json` | Recipes with YAML frontmatter | 473 |
| `/api/without-metadata.json` | Recipes without metadata | 0 |

### By Language

| Endpoint | Description | Count |
|----------|-------------|-------|
| `/api/spanish/index.json` | All Spanish recipes | 473 |
| `/api/spanish/colombia.json` | Colombian recipes | 109 |
| `/api/spanish/peru.json` | Peruvian recipes | 14 |

### By Country

| Endpoint | Description | Count |
|----------|-------------|-------|
| `/api/by-country/colombia.json` | All Colombian recipes | 109 |
| `/api/by-country/united-states.json` | All United States recipes | 35 |
| `/api/by-country/india.json` | All Indian recipes | 35 |
| `/api/by-country/japan.json` | All Japanese recipes | 35 |
| `/api/by-country/mexico.json` | All Mexican recipes | 35 |
| `/api/by-country/brazil.json` | All Brazilian recipes | 25 |

### Translation & i18n

| Endpoint | Description |
|----------|-------------|
| `/api/v1/translate?entity=ajo&locale=en` | Get canonical name and localized aliases across dishes, ingredients, and substances |

### Vector Embeddings Snapshot

| Endpoint | Description |
|----------|-------------|
| `/api/vectors/index.json` | Vector embeddings manifest (model, dimensions, counts, shards) |
| `/api/vectors/vectors-1.json` | Sharded vector embeddings snapshot (`{id, type, text, embedding}`) |

## 🧠 Vector Embeddings Snapshot Download

GOS exports a bulk versioned embeddings snapshot of the entire database (ingredients + dishes + substances).

### Manifest Schema (`/api/vectors/index.json`)

```json
{
  "version": "1.0.0",
  "generated_at": "2026-09-05T03:00:10.060Z",
  "model": "Xenova/all-MiniLM-L6-v2",
  "dim": 384,
  "count": {
    "total": 1055,
    "ingredients": 552,
    "dishes": 473,
    "substances": 30
  },
  "shards": [
    { "file": "vectors-1.json", "count": 500, "size_bytes": 5514286 },
    { "file": "vectors-2.json", "count": 500, "size_bytes": 5754547 },
    { "file": "vectors-3.json", "count": 55, "size_bytes": 631513 }
  ]
}
```

### Vector Object Schema (`/api/vectors/vectors-*.json`)

```json
{
  "id": "condiments/ajo",
  "type": "ingredient",
  "text": "Ajo (garlic) - Allium sativum. Group: Condiment...",
  "embedding": [0.0123, -0.0456, 0.0789]
}
```

## 🌐 Translation API (`/api/v1/translate`)

GOS provides multi-language translation and alias lookup across 20 canonical locales (`es`, `en`, `zh`, `hi`, `ar`, `pt`, `bn`, `ru`, `ja`, `pa`, `de`, `jv`, `wu`, `ms`, `te`, `vi`, `ko`, `fr`, `ta`, `ur`).

### Parameters

- `entity` (or `q`): Entity ID or search term (e.g. `ajo`, `alicina`, `bandeja_paisa`).
- `locale` (or `lang`): Target locale code (e.g. `en`, `fr`). Optional.
- `type`: Filter by `dish`, `ingredient`, or `substance`. Optional.

### Example Request

```bash
curl "https://gos.swal.network/api/v1/translate?entity=ajo&locale=en"
```

> Nota de despliegue: GOS es 100% estático (sin SSR), así que este endpoint
> se prerenderiza como **catálogo completo** (`count` ~987 con `all_aliases`
> por locale). El filtrado por `entity`/`locale` se hace en cliente:

```js
const catalog = await fetch(
  'https://gos.swal.network/api/v1/translate',
).then((r) => r.json())
const ajoEn = catalog.results.filter(
  (r) =>
    r.id.includes('ajo') || r.name.toLowerCase().includes('ajo'),
)
```

### Response Schema

```json
{
  "query": {
    "entity": "ajo",
    "locale": "en"
  },
  "count": 1,
  "results": [
    {
      "id": "condiments/ajo",
      "type": "ingredient",
      "name": "Ajo",
      "locale": "en",
      "aliases": ["garlic", "allium"],
      "all_aliases": {
        "en": ["garlic", "allium"]
      }
    }
  ],
  "supported_locales": [
    "es", "en", "zh", "hi", "ar", "pt", "bn", "ru", "ja", "pa",
    "de", "jv", "wu", "ms", "te", "vi", "ko", "fr", "ta", "ur"
  ]
}
```

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
  "count": 109
}
```

## 💻 Usage Examples

### JavaScript / Fetch API

```javascript
fetch('https://gos.swal.network/api/spanish/colombia.json')
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
    'https://gos.swal.network/api/spanish/colombia.json'
)
data = response.json()

print(f"Found {data['count']} Colombian recipes")
for recipe in data['recipes']:
    print(f"- {recipe['title']}")
```

### cURL + jq

```bash
# Get all languages
curl https://gos.swal.network/api/index.json | jq '.languages'

# Get recipe titles from Colombia
curl https://gos.swal.network/api/spanish/colombia.json | jq '.recipes[].title'

# Filter recipes by difficulty
curl https://gos.swal.network/api/spanish/colombia.json | jq '.recipes[] | select(.difficulty == "★★☆☆☆")'
```

## 🔧 How It Works

1. **Scanning**: The `generate-api.js` script scans `.md` files in `/dishes`
   (skipping `dishes/china/`, CJK-named files and `README.md`)
2. **Detection**:
   - Language detected by character patterns (accents → Spanish)
   - Country inferred from directory structure
   - Metadata parsed using `gray-matter` (YAML frontmatter)
3. **Grouping**: Recipes organized by language, country, and metadata presence
4. **Generation**: Static JSON files created in `/public/api/`
5. **Deployment**: Published to Cloudflare Pages (`deploy-cloudflare.yml`)

## 📝 Notes

- The legacy Chinese collection under `dishes/china/` is **excluded** from the
  API (skipped by the generator), so there are no recipes without frontmatter
- Every served recipe has complete structured metadata
- All endpoints support **CORS** - use from any domain
- Data is **static JSON** - fast and cacheable
- Updated automatically on every deployment
- No authentication required - free and open

## 🔗 Links

- **API Documentation**: <https://gos.swal.network/api-docs>
- **Main Site**: <https://gos.swal.network/>
- **GitHub Repository**: <https://github.com/iberi22/gastronomic-open-standard-GOS>

## 📄 License

MIT - Same as the recipe collection
