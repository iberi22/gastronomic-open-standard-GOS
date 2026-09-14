# Knowledge Graph Invariants

This document describes the hard integrity invariants enforced on the Gastronomic Open Standard (GOS) Knowledge Graph (`site/public/graph-data.json`). The integrity gate is implemented as a Vitest suite located at `site/src/lib/graph-integrity.test.ts`.

---

## 1. Core Graph Invariants

1. **Artifact Structure & Metadata Counts**:
   - The JSON artifact must parse correctly.
   - `nodes.length` must strictly equal `metadata.total_nodes`.
   - `edges.length` must strictly equal `metadata.total_edges`.

2. **Zero Orphan References**:
   - Every edge's `source` and `target` node IDs must exist in the `nodes` list.

3. **Zero Self-Loops**:
   - No edge can connect a node to itself (`edge.source !== edge.target`).

4. **Closed Edge Type Vocabulary**:
   - Every edge's `type` must belong to an explicit allowlist.
   - A new edge type will trigger a test failure to ensure deliberate schema extension (see [How to Add a New Edge Type](#how-to-add-a-new-edge-type)).

5. **No Placeholder IDs**:
   - No node ID may consist solely of lowercase letters followed by underscores (e.g. `/^[a-z]+_+$/`).
   - No node ID may contain `"unknown"` as a substring (e.g. `substance_unknown` or `ingredient_unknown`).

6. **ID Format & Type Prefix Alignment**:
   - Every node ID must match `^[a-z]+_[a-z0-9_]+$`.
   - The ID prefix (the part before the first underscore) must strictly match the node's `type` field (e.g., node type `recipe` must have ID `recipe_*`, `ingredient` -> `ingredient_*`).

7. **Structural Minimums**:
   - Every `recipe` node must have at least 1 outgoing `USES` edge.
   - Every `region`, `category`, `place`, and `technique` node must have at least 1 edge (degree $\ge 1$).

8. **Wave Contract Minimums** *(Enforced post Wave C.02/C.03)*:
   - Every `diet` node must have at least 1 incoming/outgoing `FITS_DIET` edge.
   - `SUBSTITUTE_FOR` edges count $\ge 20$.
   - `CONTAINS_VITAMIN` edges count $\ge 105$.
   - All nodes across the graph must have degree $\ge 1$ (zero isolated nodes).

---

## 2. Allowed Edge Types (Allowlist)

The standard vocabulary of edge types currently allowed in the graph is:

- `USES`: Connects a recipe to an ingredient it uses.
- `BELONGS_TO`: Connects an ingredient to a food category.
- `HAS_FLAVOR`: Connects a recipe to a flavor attribute.
- `HAS_TEXTURE`: Connects a recipe to a texture attribute.
- `FROM_REGION`: Connects a recipe to its origin region.
- `PLACE`: Connects a region to a key place/city within it.
- `USES_TECHNIQUE`: Connects a recipe to a cooking technique.
- `CONTAINS_VITAMIN`: Connects an ingredient to a vitamin or micronutrient.
- `HAS_NUTRIENT`: Connects an ingredient to a macronutrient.
- `HAS_SUBSTANCE`: Connects an ingredient to an active chemical compound/substance.
- `FOUND_IN`: Reverse link from substance to ingredient.
- `HELPS_CONDITION`: Connects an ingredient to a health condition.
- `TREATS`: Connects a substance to a health condition.
- `RELATED_DISHES`: Connects two recipes sharing $\ge 3$ ingredients or same region.
- `OFTEN_TOGETHER`: Connects two ingredients co-occurring across multiple recipes.
- `FITS_DIET`: Connects an ingredient/recipe to a dietary pattern.
- `SUBSTITUTE_FOR`: Connects an ingredient to another ingredient it can replace.

---

## How to Add a New Edge Type

When introducing a new relationship type to the generator (`site/scripts/generate-graph.js`):

1. **Verify the Schema**: Ensure the new edge type follows standard GOS upper-snake-case conventions (e.g., `PAIR_WITH`).
2. **Update the Allowlist**: Open `site/src/lib/graph-integrity.test.ts` and add the new type string to the `ALLOWED_EDGE_TYPES` set:
   ```ts
   const ALLOWED_EDGE_TYPES = new Set([
     // ... existing types
     'NEW_EDGE_TYPE',
   ])
   ```
3. **Run the Integrity Suite**:
   ```bash
   cd site && node node_modules/vitest/vitest.mjs run src/lib/graph-integrity.test.ts
   ```
4. **Document the Change**: Add a brief description of the new edge type to the list above in this file.
