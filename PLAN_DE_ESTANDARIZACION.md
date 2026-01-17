# Protocolo de Estandarización de Recetas (Nivel Científico)

Este documento define el estándar "Gold" para las recetas en el repositorio `AI-Chef`. El objetivo es transformar recetas de texto simple en **estructuras de datos complejas** que permitan análisis nutricional exacto, búsqueda semántica por sabores y trazabilidad de ingredientes.

## 1. Estructura del Archivo (Frontmatter YAML)

El encabezado YAML debe contener datos estructurados para su procesamiento automático.

```yaml
---
title: "Nombre de la Receta"
slug: "nombre-receta-slug" # Opcional, generado del nombre
country: "Colombia"
region: "Andina"
dish_type: "Plato fuerte" # Bebida, Postre, Sopa, etc.

# 1. Trazabilidad de Ingredientes (VITAL)
# Cada ingrediente se enlaza a un archivo en 'ingredients/'.
ingredients_detailed:
  - name: "Frijol Rojo"
    quantity: 500
    unit: "g"
    ingredient_id: "legumes/kidney_bean" # Referencia a ingredients/legumes/kidney_bean.md
    notes: "Remojados desde la noche anterior"
  - name: "Arroz Blanco"
    quantity: 250
    unit: "g"
    ingredient_id: "grains/white_rice"
  - name: "Plátano Maduro"
    quantity: 2
    unit: "unidad"
    ingredient_id: "fruits/plantain_ripe"

# 2. Nutrición Exacta (Calculada)
# Valores calculados sumando los aportes de cada ingrediente dividido por porciones.
servings: 4
nutrition_per_serving:
  calories: 850          # kcal
  protein_g: 45.2        # gramos
  fat_total_g: 30.5
  carbs_total_g: 95.0
  fiber_g: 12.0
  sugar_g: 15.0
  sodium_mg: 1200
  micronutrients:
    iron_mg: 5.2
    vitamin_a_iu: 1200

# 3. Perfil Sensorial (Para Búsqueda Inteligente)
# Escala 0-10 para gráficos de radar.
sensory_profile:
  salty: 7
  sweet: 3
  sour: 2
  bitter: 1
  umami: 8
  spicy: 0
  texture_tags: ["Crujiente", "Cremoso", "Fibroso"]
  flavor_tags: ["Ahumado", "Térreo", "Cárnico"]

# 4. Metadatos de Clasificación
tags: ["Almuerzo", "Tradicional", "Hipercalórico", "Domingo"]
difficulty: "Alto" # Bajo, Medio, Alto
prep_time_minutes: 45
cook_time_minutes: 120
---
```

## 2. Estructura del Contenido (Markdown)

Después del frontmatter, el contenido debe seguir este orden estricto:

1.  **Descripción Introductoria**: Historia breve y contexto cultural.
2.  **Ingredientes (Texto)**: Lista legible para humanos (generada o escrita).
3.  **Instrucciones**: Pasos numerados claros.
4.  **Variaciones y Consejos**: Tips de cocina.
5.  **🔬 Análisis Científico y Nutricional**:
    *   Esta sección es generada por IA basándose en los datos.
    *   Debe incluir explicación de reacciones químicas (Maillard, emulsificación).
    *   Análisis de perfil de aminoácidos o beneficios de salud.
    *   Historia antropológica del plato.

---

## 3. Flujo de Trabajo de Automatización

1.  **Ingestión**: El script lee la receta original.
2.  **Extracción de Entidades**: Identifica ingredientes y cantidades.
3.  **Vinculación (Linking)**: Busca el ingrediente en la base de datos `ingredients/`. Si no existe, crea un "stub" (borrador) del ingrediente usando IA.
4.  **Cálculo**: Suma nutrición de ingredientes * cantidad / porciones.
5.  **Enriquecimiento**: Genera el perfil sensorial y el análisis científico.
6.  **Escritura**: Reescribe el archivo `.md`.
