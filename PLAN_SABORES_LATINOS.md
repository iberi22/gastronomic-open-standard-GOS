# 📖 Plan Maestro: Recetario de Sabores Latinos & AI-Chef

Este documento sirve como guía central para el desarrollo del repositorio. El objetivo ha evolucionado de un simple recetario a una **plataforma de datos culinarios inteligentes**, uniendo tradición, ciencia y tecnología de vanguardia.

---

## 🌎 1. Visión del Proyecto: "AI-Chef"

La misión es crear la enciclopedia definitiva de la cocina, donde cada receta es un nodo de información conectado. No solo instrucciones, sino:

-   **Ciencia de Datos**: Nutrición exacta calculada ingrediente por ingrediente.
-   **Inteligencia Artificial**: Generación de perfiles sensoriales y análisis químico.
-   **Interoperabilidad**: Estructura lista para APIs de comercio y apps de salud.

---

## 🛠️ 2. Metodología "Scientific Standard"

Todas las recetas deben cumplir con el protocolo definido en `PLAN_DE_ESTANDARIZACION.md`. El flujo de trabajo es automatizado:

### Fase 1: Ingesta y Estructura
Las recetas nuevas o existentes se procesan mediante `automation/standardize_recipes.py`. Este agente de IA:
1.  Lee el texto original.
2.  Extrae entidades (Ingredientes, Cantidades, Unidades).
3.  Convierte unidades a gramos para precisión científica.

### Fase 2: Vinculación de Ingredientes (Linking)
El sistema no guarda strings ("tomate"), sino referencias:
-   Busca en la base de datos `ingredients/`.
-   Si no existe, crea el ingrediente usando datos del USDA/Ciencia (vía IA) siguiendo `PROTOCOLO_INGREDIENTES.md`.
-   Calcula la nutrición de la receta sumando los aportes parciales de cada ingrediente vinculado.

### Fase 3: Enriquecimiento
Se generan metadatos avanzados:
-   **Perfil Sensorial**: Radar chart data (Salado, Umami, Amargo, etc. del 0-10).
-   **Tags Inteligentes**: Clasificación taxonómica y cultural.
-   **Análisis Científico**: Una sección markdown explicativa sobre las reacciones fisicoquímicas del plato.

---

## 📁 3. Organización del Repositorio

```text
/
├── dishes/               # Recetas (Markdown + Frontmatter Científico)
│   ├── colombian/
│   ├── china/
│   └── ...
├── ingredients/          # Base de Datos de Ingredientes (Single Source of Truth)
│   ├── legumes/
│   ├── proteins/
│   └── ...
├── automation/           # Cerebro del Proyecto
│   ├── standardize_recipes.py  # Script de IA
│   ├── audit_recipes.py        # Control de Calidad
│   └── requirements.txt
└── site/                 # Frontend (Astro) para visualización
```

---

## 🚀 4. Roadmap de Ejecución

1.  **Migración Masiva**: Ejecutar los scripts de estandarización sobre todo el corpus existente (ver `TASK.md`).
2.  **Validación de Datos**: Revisión humana de los ingredientes generados para asegurar precisión crítica (alérgenos, macros).
3.  **API Deployment**: Exponer los datos JSON/YAML a través de endpoints para aplicaciones externas.
