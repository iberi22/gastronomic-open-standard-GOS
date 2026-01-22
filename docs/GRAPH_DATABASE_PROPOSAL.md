# 🔗 Propuesta: Base de Datos de Grafos para GOS

## Objetivo

Implementar un **buscador de nodos de información** que conecte recetas, ingredientes, técnicas culinarias y datos nutricionales utilizando una base de datos de grafos visualizable en la web.

---

## 🏗️ Arquitectura Propuesta

### Opción 1: **Cliente-side con D3.js + JSON Graph** (Recomendada para MVP)

```
┌─────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA LIGERA                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │ Markdown    │───▶│ Build Script │───▶│ graph.json    │  │
│  │ Files       │    │ (Python)     │    │               │  │
│  └─────────────┘    └──────────────┘    └───────┬───────┘  │
│                                                   │         │
│                                                   ▼         │
│                                          ┌───────────────┐  │
│                                          │ D3.js Force   │  │
│                                          │ Graph Viewer  │  │
│                                          └───────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Ventajas:**
- Sin backend adicional
- Funciona en GitHub Pages
- Exporta datos estáticos
- Fácil de mantener

**Tecnologías:**
- `D3.js` para visualización force-directed
- `Cytoscape.js` alternativa más fácil
- JSON como formato de datos

---

### Opción 2: **Neo4j + GraphQL** (Para escala mayor)

```
┌─────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA COMPLETA                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │ Markdown    │───▶│ Sync Script  │───▶│ Neo4j Aura   │  │
│  │ Files       │    │ (Python)     │    │ (Cloud Free) │  │
│  └─────────────┘    └──────────────┘    └───────┬───────┘  │
│                                                   │         │
│                           ┌───────────────────────┘         │
│                           ▼                                 │
│                    ┌──────────────┐    ┌───────────────┐   │
│                    │ GraphQL API  │◀──▶│ React/Svelte  │   │
│                    │ (Deno Edge)  │    │ Frontend      │   │
│                    └──────────────┘    └───────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Ventajas:**
- Consultas Cypher potentes
- Escalable
- Relaciones complejas

**Desventajas:**
- Requiere hosting
- Más complejo

---

## 📊 Modelo de Datos (Nodos y Relaciones)

```cypher
// Nodos principales
(:Recipe {id, title, region, difficulty, prep_time})
(:Ingredient {id, name, scientific_name, group})
(:Technique {id, name, description})
(:NutritionProfile {calories, protein_g, fat_g, carbs_g})
(:Region {name, country, continent})
(:Tag {name, category})

// Relaciones
(Recipe)-[:USES {quantity, unit}]->(Ingredient)
(Recipe)-[:APPLIES]->(Technique)
(Recipe)-[:HAS_NUTRITION]->(NutritionProfile)
(Recipe)-[:FROM_REGION]->(Region)
(Recipe)-[:TAGGED_WITH]->(Tag)
(Ingredient)-[:SUBSTITUTE_FOR {similarity}]->(Ingredient)
(Ingredient)-[:PAIRS_WELL_WITH]->(Ingredient)
(Ingredient)-[:CONTAINS]->(NutritionProfile)
```

---

## 🛠️ Implementación Recomendada (Fase 1 - MVP)

### Script de Generación de Grafo

```python
# scripts/generate_graph.py
import json
import yaml
from pathlib import Path

def build_graph():
    nodes = []
    edges = []

    # Procesar recetas
    for recipe_file in Path('dishes').rglob('*.md'):
        # Extraer frontmatter y relaciones
        pass

    # Procesar ingredientes
    for ingredient_file in Path('ingredients').rglob('*.md'):
        # Agregar nodos de ingredientes
        pass

    return {"nodes": nodes, "edges": edges}
```

### Componente de Visualización

```html
<!-- graph-explorer.html -->
<div id="graph-container" style="width: 100%; height: 600px;"></div>
<script src="https://d3js.org/d3.v7.min.js"></script>
<script>
  // Force-directed graph visualization
  fetch('/graph.json')
    .then(r => r.json())
    .then(data => {
      // Render interactive graph
    });
</script>
```

---

## 📅 Fases de Implementación

| Fase | Descripción | Tiempo Est. |
|------|-------------|-------------|
| 1 | Script generador de `graph.json` | 2-3 días |
| 2 | Visualizador D3.js básico | 2-3 días |
| 3 | Búsqueda y filtros | 1-2 días |
| 4 | Integración en MkDocs | 1 día |
| 5 | (Opcional) Backend Neo4j | 1 semana |

---

## 🎯 Casos de Uso

1. **"¿Qué puedo cocinar con...?"** - Buscar recetas por ingredientes disponibles
2. **"Sustitutos para..."** - Ver ingredientes alternativos conectados
3. **"Recetas similares a..."** - Explorar recetas con ingredientes compartidos
4. **"Mapa nutricional"** - Visualizar perfiles nutricionales por clusters
5. **"Árbol de técnicas"** - Ver qué técnicas se usan en qué recetas

---

## ✅ Recomendación

Para el estado actual del proyecto, recomiendo **Opción 1 (D3.js + JSON)** porque:

1. ✅ No requiere infraestructura adicional
2. ✅ Compatible con GitHub Pages / MkDocs
3. ✅ Los datos ya están en Markdown con frontmatter YAML
4. ✅ Puede evolucionar a Neo4j si crece la demanda
5. ✅ Se puede implementar incrementalmente

---

## 🚀 Próximos Pasos

1. [ ] Aprobar arquitectura propuesta
2. [ ] Crear script `generate_graph.py`
3. [ ] Diseñar visualizador brutalista
4. [ ] Integrar en página dedicada `/explorar-grafo/`
5. [ ] Documentar API de datos
