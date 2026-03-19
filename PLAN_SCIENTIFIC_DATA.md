# Gastronomic Open Standard (GOS) - Scientific Data Area

## Project Overview

Gastronomic Open Standard es un proyecto de código abierto para documentar y visualizar recetas, ingredientes y sus conexiones a nivel mundial.

## Current State

### Visualization
- ✅ D3.js graph explorer (`docs/graph-explorer.md`)
- ✅ Script para generar graph.json (`scripts/generate_graph.py`)
- ✅ 3 tipos de nodos: Recipes (rojo), Ingredients (verde), Regions (azul)

### Data Structure
```
dishes/
├── china/
├── colombian/
└── peruvian/

ingredients/
├── condiments/
├── dairy/
├── fruits/
├── grains/
├── legumes/
├── oils/
├── proteins/
├── sauces/
├── vegetables/
└── pending_review/
```

## Plan: Scientific Data Area

### Phase 1: Enhance Graph Visualization
1. **Interactive Filters**
   - Filter by region (China, Colombia, Perú)
   - Filter by ingredient category
   - Filter by cooking technique

2. **Node Details**
   - Show nutritional info on click
   - Show ingredient substitutions
   - Show seasonal availability

3. **Advanced Graph**
   - Force-directed layout improvements
   - Clustering by region
   - Edge thickness by connection strength

### Phase 2: Scientific Data
1. **Nutritional Database**
   - Calories, protein, carbs, fat per 100g
   - Vitamins and minerals
   - Glycemic index

2. **Ingredient Chemistry**
   - Flavor compounds
   - Cooking reactions
   - Molecular properties

3. **Recipe Analytics**
   - Cost per serving
   - Preparation time
   - Difficulty level

### Phase 3: Visualization Enhancements
1. **3D Graph View**
2. **Timeline of dish evolution**
3. **Region comparison charts**
4. **Ingredient network analysis**

## Technical Stack

- D3.js v7 for visualization
- Python for data generation
- Markdown + YAML frontmatter for data
- Static site generation

## Deliverables

1. Enhanced graph explorer with filters
2. Nutritional data for ingredients
3. Scientific data section in docs
4. Better node clustering

## Quick Wins

1. Add region filter to existing graph
2. Add nutritional info to ingredients
3. Create comparison charts
4. Add search by ingredient properties
