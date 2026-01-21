# Protocolo de Ingredientes Científicos

Este documento define el estándar para la creación y enriquecimiento de "Ingredientes Científicos" en el repositorio gastronomic-open-standard-GOS.

## Objetivos

Transformar ingredientes culinarios simples en entidades de datos enriquecidas que incluyan perfiles de seguridad, nutrición detallada, compuestos activos y taxonomía científica.

## Esquema Front Matter (YAML)

Cada archivo de ingrediente (`ingredients/**/*.md`) debe cumplir con el siguiente esquema extendido:

```yaml
---
name: "Lemon" # Primary ID (English preferred for filename/ID)
scientific_name: "Citrus limon"
group: "Fruit"
image: "../../images/lemon.jpg"

# --- Internationalization (I18n) ---
i18n:
  en:
    common_name: "Lemon"
    other_names: ["Yellow Citrus"]
    culinary_intro: "Acidic citrus fruit used for juice and zest."
  es:
    common_name: "Limón"
    other_names: ["Limón amarillo"]
    culinary_intro: "Cítrico ácido usado por su jugo y ralladura."
  zh:
    common_name: "柠檬"
    other_names: []
    culinary_intro: "酸味柑橘水果."

# --- Taxonomía y Clasificación ---
scientific_registry:
  family: "Rutaceae"
  genus: "Citrus"
  synonyms: ["Citrus limonum"]
  cultivars: ["Eureka", "Lisbon", "Meyer"]

# --- Popularidad y Uso Global ---
global_popularity:
  tier: "High" # High, Medium, Niche
  culinary_importance: "Essential" # Essential, Common, Rare
  regional_prevalence: ["Mediterranean", "Asian", "Latin American"]

# --- Perfil Nutricional (por 100g) ---
portions:
  default_g: 100
nutrition_per_100g:
  calories: 29
  protein_g: 1.1
  fat_g: 0.3
  carbs_g: 9.3
  fiber_g: 2.8
  sugar_g: 2.5

# --- Micronutrientes Clave ---
micronutrients:
  vitamin_c_mg: 53
  potassium_mg: 138
  magnesium_mg: 8

# --- Composición Química y Compuestos Activos ---
active_compounds:
  - name: "Ácido Cítrico"
    type: "Organic Acid"
    approximate_content_percent: 5 # Ej. 5-6%
    role: "Sabor ácido, conservante natural"
    benefit: "Alcalinizante, digestión"
  - name: "D-Limoneno"
    type: "Terpene"
    approximate_content_percent: 70 # (En el aceite esencial)
    role: "Aroma cítrico característico"
    benefit: "Antiinflamatorio, ansiolítico"

# --- Perfil de Seguridad y Alergias ---
safety_profile:
  safety_score: 95
  consumption_limit: "Moderado (acidez dental)"
  concerns:
    - condition: "Erosión dental"
      risk: "El ácido puede dañar el esmalte con consumo directo excesivo."

allergy_profile:
  risk_level: "Low"
  allergens: ["Citrus allergens (Cit l 1, Cit l 3)"]
  cross_reactivity: ["Orange", "Lime", "Pollen"]
  prevalence_percent: 0.5

# --- Perfil Sensorial y Organoléptico ---
sensory_profile:
  visual_color: "Amarillo brillante (cáscara), Amarillo pálido (pulpa)"
  aroma_notes: ["Cítrico", "Fresco", "Terpenoso"]
  flavor_notes: ["Ácido", "Astringente", "Ligeramente amargo (albedo)"]
  texture_notes: ["Firme (cáscara)", "Jugosa (pulpa)"]
  mouthfeel: "Astringente, refrescante"
  spice_level: 0

# --- Sustitutos y Relacionados ---
substitutes:
  - name: "Lima"
    similarity_score: 0.8
    notes: "Más ácida y floral, verde."
  - name: "Vinagre"
    similarity_score: 0.6
    notes: "Aporta acidez pero sin aroma frutal."

embedding_version: 2
last_updated: "YYYY-MM-DD"
---
```

## Estructura del Markdown

El cuerpo del archivo debe contener:

1. **Descripción General**: Resumen botánico y culinario.
2. **Uso Culinario**: Técnicas recomendadas para maximizar biodisponibilidad (ej. "Cocinar con aceite para liberar licopeno").
3. **Beneficios para la Salud**: Explicación basada en evidencia de los `active_compounds`.
4. **Riesgos y Precauciones**: Detalles sobre las secciones de `safety_profile` y `allergy_profile`.
5. **Referencias**: Lista de estudios o bases de datos (USDA, NIH, PubChem).

## Reglas de Generación

1. **Veracidad**: Usar fuentes confiables (USDA, EFSA, FDA).
2. **Neutralidad**: Indicar "Evidencia limitada" si los estudios no son concluyentes.
3. **Seguridad**: Ser conservador con los límites de consumo y advertencias de toxicidad.
