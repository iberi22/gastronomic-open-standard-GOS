# GOS Graph Interconnections Audit

**Date:** 2026-04-13
**Project:** E:\scripts-python\gastronomic-open-standard-GOS
**File Analyzed:** `site/graph-data.json`

---

## EXECUTIVE SUMMARY

The `site/graph-data.json` was generated from an **older version** of `scripts/generate_graph.py`. The current script has been significantly updated but the graph data file has **not been regenerated**. This caused major interconnection gaps.

| Metric | Value |
|--------|-------|
| Total Nodes | 1,186 |
| Total Edges | 1,463 |
| Recipes | 114 |
| Ingredients | 306 |
| Regions | 24 |

---

## TASK 1: Current Graph Analysis

### Node Types (1,186 total)

| Type | Count | Color |
|------|-------|-------|
| nutrition | 292 | N/A |
| texture | 162 | Coral |
| aroma | 143 | N/A |
| flavor | 136 | Mint |
| recipe | 114 | Red |
| ingredient | 306 | Teal |
| region | 24 | Yellow |
| category | 9 | Green |

### Edge Types (1,463 total)

| Edge Type | Count | Notes |
|-----------|-------|-------|
| USES_INGREDIENT | 390 | recipe -> ingredient |
| HAS_FLAVOR | 227 | recipe -> flavor |
| HAS_TEXTURE | 211 | recipe -> texture |
| HAS_AROMA | 191 | recipe -> aroma |
| HAS_MACRO | 292 | recipe -> nutrition |
| HAS_RECIPE | 115 | category -> recipe (wrong direction) |
| BELONGS_TO | 37 | ingredient -> category (underconnected) |

### Critical Issues Found

1. **Recipes NOT connected to regions** — `FROM_REGION` edge type is **absent** (0 edges)
   - All 114 recipes are missing region connections
   - Instead, `HAS_RECIPE` edges exist from categories to recipes (backwards)

2. **36 recipes have NO ingredients** (USES_INGREDIENT edges)

3. **269 of 306 ingredients have NO category** (BELONGS_TO missing)

4. **RELATED_DISHES edges: 0** — No recipe-to-recipe connections

5. **PLACE edges: 0** — No city/state location connections

6. **TECHNIQUE edges: 0** — No cooking technique connections

7. **5 recipes have fewer than 3 ingredients**

8. **36 recipes have NO flavor** (HAS_FLAVOR missing)

---

## TASK 2: What the Graph SHOULD Have

The **updated** `scripts/generate_graph.py` has the following capabilities that the current graph is **missing**:

### Should-Have vs Has (Comparison)

| Feature | Should Have | Currently Has | Status |
|---------|-------------|---------------|--------|
| FROM_REGION edges | 114 (one per recipe) | 0 | **MISSING** |
| RELATED_DISHES (shared ingredients >= 3) | Varies | 0 | **MISSING** |
| RELATED_DISHES (same region) | Varies | 0 | **MISSING** |
| TECHNIQUE nodes | Auto-extracted from instructions | 0 | **MISSING** |
| Content-extracted ingredients | Extracted from markdown sections | Only frontmatter | **PARTIAL** |
| USES_INGREDIENT edges | 390+ (backed by 160 recipe files) | 390 | OK |
| BELONGS_TO edges | 306 (all ingredients) | 37 | **UNDERCONNECTED** |

### Region Mapping (Dishes Directory)

```
dishes/
├── colombian/    (110 .md files)
│   ├── andina/
│   ├── caribe/
│   ├── pacifica/
│   ├── amazonia/
│   ├── orinoquia/
│   ├── valle_del_cauca/
│   ├── nacional/
│   └── insular/
├── china/        (~50 .md files)
│   └── mariscos/
└── peru/         (peruvian recipes)
```

---

## TASK 3: What's MISSING (Detailed)

### 3.1 Recipes Missing ALL Ingredient Connections (36 recipes)

These recipes exist as nodes but have zero USES_INGREDIENT edges:

- 10 recetas mas emblematicas de la region Amazonica de Colombia
- 10 recetas mas emblematicas de la region Andina de Colombia
- 10 recetas mas emblematicas de la region Caribe de Colombia
- 10 recetas mas emblematicas de la region Insular de Colombia
- Recetas de la Orinoquia
- Cayeye
- Envueltos de Mazorca
- Mazamorra Antioquena
- Postre de Natas
- 10 recetas mas emblematicas de la region Pacifica de Colombia
- Arroz Llanero
- Cachama Asada
- Carne a la Perra
- Chigüiro Asado
- Entreverado
- Hervido de Gumarra
- Pan de Arroz
- Pabellon Llanero
- Arroz con Pollo Colombiano
- Bolas de Pescado (Fish Balls)
- *(...and 16 more)*

**Root Cause:** These are "list" recipe files (aggregating 10 recipes each) that don't have `main_ingredients` in frontmatter. The script needs to either skip these or extract ingredients from their nested content.

### 3.2 Ingredients Missing Category (269 of 306)

Sample missing:
- Pollo, Arroz, Culantro, Aji Amarillo, Cerveza Negra
- Maiz Pilado, Carnes, Guiso, Hojas de Platano
- Leche Agria, Panela, Clavos, NAME
- Queso Costeño, Suero, Hogao, Queso, Masa de hojaldre

**Root Cause:** BELONGS_TO edges are only created from ingredients processed via `ingredients/` directory files (37 ingredients). Most ingredients come from recipe `main_ingredients` frontmatter and never get categorized.

### 3.3 Recipes Missing Region (114 — ALL)

All 114 recipes lack FROM_REGION edges. This means the **entire region graph layer is disconnected** from recipes.

**Root Cause:** The graph-data.json uses edge type `HAS_RECIPE` (from category to recipe) instead of `FROM_REGION` (from recipe to region). The script writes `FROM_REGION` but the data file shows `HAS_RECIPE`.

### 3.4 Missing Edge Types Summary

| Edge Type | Expected | Actual | Gap |
|-----------|----------|--------|-----|
| FROM_REGION | ~114 | 0 | -114 |
| RELATED_DISHES | Varies (hundreds) | 0 | ALL missing |
| PLACE | Varies | 0 | ALL missing |
| TECHNIQUE | Varies | 0 | ALL missing |
| BELONGS_TO | ~306 | 37 | -269 |

---

## TASK 4: Proposed Fixes to `scripts/generate_graph.py`

### 4.1 Add Region Inference for Colombian Recipes

The script already reads `region` from frontmatter, but many Colombian recipe files use sub-region paths like `dishes/colombian/andina/...` that imply the region. Add path-based region inference:

```python
def infer_region_from_path(file_path: Path, fm_region: str) -> str:
    """Infer region from directory path if not in frontmatter."""
    path_str = str(file_path).lower()
    
    # If already has region in frontmatter, use it
    if fm_region:
        return fm_region
    
    # Colombian sub-regions
    if 'colombian' in path_str:
        if 'andina' in path_str: return 'Andina'
        if 'caribe' in path_str: return 'Caribe'
        if 'pacifica' in path_str: return 'Pacifica'
        if 'amazonia' in path_str: return 'Amazonia'
        if 'orinoquia' in path_str: return 'Orinoquia'
        if 'valle' in path_str: return 'Valle del Cauca'
        if 'insular' in path_str: return 'Insular'
        return 'Nacional'  # default colombian
    
    # Other countries
    if 'china' in path_str: return 'China'
    if 'peru' in path_str: return 'Peruvian'
    
    return fm_region
```

### 4.2 Auto-Categorize Ingredients by Type

Add automatic BELONGS_TO edges for ingredients based on known category mappings:

```python
INGREDIENT_CATEGORIES = {
    'Proteins': ['pollo', 'carne', 'res', 'cerdo', 'pescado', 'mariscos', 'huevo', 'camarones'],
    'Dairy': ['leche', 'crema', 'mantequilla', 'queso', 'cuajada', 'yogurt'],
    'Vegetables': ['cebolla', 'ajo', 'tomate', 'papa', 'yuca', 'platano', 'zanahoria'],
    'Fruits': ['limon', 'lima', 'naranja', 'mango', 'aguacate', 'papaya'],
    'Grains': ['arroz', 'maiz', 'trigo', 'harina', 'pan', 'fideos'],
    'Legumes': ['frijoles', 'lentejas', 'garbanzos', 'soya'],
    'Oils': ['aceite', 'manteca', 'grasa'],
    'Condiments': ['sal', 'pimienta', 'comino', 'achiote', 'culantro', 'cilantro'],
    'Sauces': ['salsa', 'ají', 'chimichurri', 'hogao', 'sofrito'],
}

def auto_categorize_ingredient(ing_id: str) -> str:
    """Return category name if ingredient matches known patterns."""
    ing_lower = ing_id.lower()
    for category, keywords in INGREDIENT_CATEGORIES.items():
        for kw in keywords:
            if kw in ing_lower:
                return category
    return None
```

### 4.3 Extract Ingredients from Body Content (Already Implemented but Needs Fixes)

The current script already has `extract_ingredients_from_content()`. Issues:

1. **List recipe files** (e.g., "10 recetas de la region Caribe") should either:
   - Be skipped from graph generation, OR
   - Have their nested recipe names extracted and linked

2. **Chinese characters** in `main_ingredients` need transliteration or exclusion:
   - The Chinese recipes have ingredients like `青蟹`, `咖喱块` that create unconnected ingredient nodes

**Fix:** Add filtering for non-Latin ingredients and flag list-style recipes:

```python
def is_latin_text(text: str) -> bool:
    """Check if text contains Latin characters."""
    return bool(re.search(r'[a-zA-Záéíóúñ]', text))

def extract_ingredients_from_content(content: str) -> list:
    """Extract and filter Latin ingredients from markdown."""
    ingredients = []
    # ... existing extraction logic ...
    return [ing for ing in ingredients if is_latin_text(ing)]
```

### 4.4 Add RELATED_DISHES by Shared Ingredients (Already Implemented)

The script already creates RELATED_DISHES for recipes sharing >= 3 ingredients. Ensure this fires for Colombian recipes:

```python
# Group recipes by region for RELATED_DISHES
region_recipes = defaultdict(list)
for recipe_id, region_id in recipe_regions.items():
    region_recipes[region_id].append(recipe_id)

for region_id, recipes in region_recipes.items():
    if len(recipes) < 2:
        continue
    for i, recipe1_id in enumerate(recipes):
        for recipe2_id in recipes[i+1:]:
            edges.append({
                "source": recipe1_id,
                "target": recipe2_id,
                "type": "RELATED_DISHES",
                "weight": 2,
            })
```

### 4.5 Add PLACE Edges (Cities/States from Regions)

Map Colombian regions to their departments/cities:

```python
REGION_PLACES = {
    'Andina': ['Antioquia', 'Bogotá', 'Cundinamarca', 'Risaralda', 'Quindío', 'Caldas', 'Huila', 'Tolima', 'Nariño'],
    'Caribe': ['Barranquilla', 'Cartagena', 'Santa Marta', 'Montería', 'Sincelejo', 'Valledupar', 'Riohacha'],
    'Pacifica': ['Cali', 'Buenaventura', 'Palmira', 'Pasto', 'Popayán'],
    'Amazonia': ['Leticia', ' Florencia', 'San José del Guaviare'],
    'Orinoquia': ['Villavicencio', 'Yopal', 'Arauca', 'Tuné'],
    'Valle del Cauca': ['Cali', 'Buga', 'Tuluá', 'Palmira'],
    'Insular': ['San Andrés', 'Providencia', 'Santa Marta (Islas)'],
    'Nacional': ['Colombia'],
}

def add_place_edges(nodes, edges, recipe_id, region_label):
    """Add PLACE edges for cities/states in a region."""
    region_id = f"region_{sanitize_id(region_label)}"
    for place_name in REGION_PLACES.get(region_label, []):
        place_id = f"place_{sanitize_id(place_name)}"
        if place_id not in nodes:
            nodes[place_id] = {
                "id": place_id,
                "label": place_name,
                "type": "place",
                "color": "#B2E2F2",
                "size": 12,
            }
        edges.append({
            "source": region_id,
            "target": place_id,
            "type": "PLACE",
            "weight": 1,
        })
```

### 4.6 Add TECHNIQUE Nodes and Edges (Already Implemented)

The script already extracts techniques from instructions. Ensure it fires for all recipes:

```python
techniques = extract_techniques_from_content(content)
for technique in techniques:
    technique_id = f"technique_{sanitize_id(technique)}"
    if technique_id not in nodes:
        nodes[technique_id] = {
            "id": technique_id,
            "label": technique,
            "type": "technique",
            "color": NODE_COLORS["technique"],
            "size": 15,
        }
    edges.append({
        "source": recipe_id,
        "target": technique_id,
        "type": "USES_TECHNIQUE",
        "weight": 1,
    })
```

---

## RECOMMENDED ACTIONS

### Priority 1: Regenerate the Graph

Run the current `generate_graph.py` to produce a fresh `site/graph-data.json`:

```bash
cd E:\scripts-python\gastronomic-open-standard-GOS
python scripts/generate_graph.py
```

### Priority 2: Fix Ingredient Categories

Implement auto-categorization (Section 4.2) so all 306 ingredients get BELONGS_TO edges.

### Priority 3: Fix "List Recipe" Files

The 10 recipes-per-region aggregator files don't have ingredients. Either:
- Skip them from graph generation, OR
- Parse them to extract individual recipe names and link those

### Priority 4: Add PLACE Edges

Implement the region-to-place mapping (Section 4.5) for Colombian departments/cities.

### Priority 5: Quality Gates

Ensure every recipe node has at least:
- 1 region connection (FROM_REGION)
- 3+ ingredient connections (USES_INGREDIENT)
- 1+ flavor connection (HAS_FLAVOR)

Flag recipes that don't meet these thresholds with a warning during generation.

---

## CURRENT SCRIPT CAPABILITIES vs DATA FILE

| Feature | In Script | In graph-data.json |
|---------|-----------|-------------------|
| FROM_REGION | Yes | No (uses HAS_RECIPE) |
| RELATED_DISHES (shared ingredients) | Yes | No |
| RELATED_DISHES (same region) | Yes | No |
| TECHNIQUE extraction | Yes | No |
| Content ingredient extraction | Yes | Partial |
| Auto-categorize ingredients | **No** (needs adding) | No |
| PLACE edges | **No** (needs adding) | No |

**Conclusion:** The graph-data.json is stale. Running `generate_graph.py` will significantly improve the graph, but auto-categorization and PLACE edges still need to be added to the script.

---

*Audit generated by SWAL Company Agent | 2026-04-13*
