# Protocolo de Base de Datos de Ingredientes

Cada ingrediente en el repositorio debe ser una "Fuente de Verdad" nutricional y culinaria. Se almacenan en la carpeta `ingredients/` organizados por categoría (e.g., `ingredients/legumes/bean_red.md`).

## Estructura del Archivo de Ingrediente

```yaml
---
id: "legumes/bean_red" # Unique ID path
name: "Frijol Rojo"
common_names: ["Red Kidney Bean", "Frijol Zaragoza", "Poroto Rojo"]
scientific_name: "Phaseolus vulgaris"
group: "Legumes" # Category

# Datos Nutricionales Estándar (Por 100g de parte comestible CRUDA o BASE COMÚN)
# Especificar el estado es vital. Por defecto: Crudo/Raw.
state: "raw" # raw, cooked, dried
nutrition_per_100g:
  calories: 333
  protein_g: 24
  fat_total_g: 0.8
  carbs_total_g: 60
  fiber_g: 25
  sugar_g: 2.2
  sodium_mg: 24

# Micronutrientes Clave (Solo los relevantes)
micronutrients:
  iron_mg: 8.2
  calcium_mg: 143
  potassium_mg: 1406
  vitamin_c_mg: 4.5

# Propiedades Funcionales
glycemic_index: 24 # Low
allergen: false
dietary_suitability: ["Vegan", "Gluten-Free"]

# Perfil de Sabor (Para emparejamiento/pairing)
flavor_profile:
  sweet: 2
  sour: 0
  salty: 0
  bitter: 1
  umami: 4
flavor_notes: ["Térreo", "Harinoso", "Nuez"]
---

# Análisis Científico

## Descripción Botánica
Descripción de la planta y la parte comestible.

## Propiedades Fisicoquímicas
- **Gelatinización del Almidón**: Temperatura y comportamiento al cocinar.
- **Antinutrientes**: Presencia de lectinas (fitohemaglutinina) y necesidad de cocción.

## Usos Culinarios
- Técnicas recomendadas (Remojo, olla a presión).
- Maridajes moleculares (ingredientes que comparten compuestos de sabor).
```

## Reglas de Creación

1.  **Nombre de Archivo**: En inglés, snake_case (e.g., `red_onion.md`).
2.  **Datos**: Usar fuentes como USDA o FAO.
3.  **Generación**: Si se usa IA para crear el ingrediente, debe marcarse para revisión humana posterior si los datos son dudosos.
