# Archivo de Ingredientes (Stubs / Placeholders)

## Descripción
Este directorio contiene stubs sin enriquecer y placeholders archivados automáticamente desde `ingredients/pending_review/`.
Se preservan en el repositorio para no perder historial ni identificadores, pero se excluyen del catálogo público y del grafo de conocimiento GOS.

## Regla de Archivado Utilizada
Un archivo es archivado si cumple con **todas** las siguientes condiciones:
1. Sus campos de sustitutos (`substitutes[*].name`) son `"Unknown"` o vacíos.
2. Su popularidad global (`global_popularity.tier` e `importance`) es `"Unknown"` o vacía.
3. Sus compuestos activos (`active_compounds[*].name`) son `"Unknown"` o vacíos.
4. Su tabla nutricional (`nutrition_per_100g`) no posee valores numéricos mayores a cero.

## Cómo Revivir un Ingrediente Archivada
Para promover un ingrediente archivado a ingrediente científico activo en GOS:
1. Mueva el archivo de vuelta desde `ingredients/_archive/pending_review/<archivo>.md` a la carpeta correspondiente en `ingredients/<grupo>/<archivo>.md`.
2. Asegúrese de que el nombre del ingrediente (`name:`) esté estandarizado en español neutral y caracteres latinos.
3. Complete los datos científicos reales: `scientific_name`, `group`, datos de macronutrientes reales en `nutrition_per_100g`, micronutrientes, compuestos activos y sustitutos gastronómicos.
4. Ejecute `node site/scripts/curate-ingredients.js --check` para validar el catálogo.
