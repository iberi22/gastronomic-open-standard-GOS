# Protocolo de Generación de Ingredientes Científicos (gastronomic-open-standard-GOS Health)

Este documento define el estándar para crear y actualizar fichas de ingredientes en el repositorio `gastronomic-open-standard-GOS`, con el objetivo de servir como backend para Agentes de Salud.

## 1. Filosofía

Cada ingrediente no es solo un ítem culinario, es un **agente terapéutico potencial**. La información debe ser rigurosa, citada y útil para la toma de decisiones clínicas (ej. prescripción dietaria).

## 2. Estructura del Archivo (`.md`)

Todo archivo en `ingredients/` debe seguir el esquema YAML definido en `ingredients/_template.md`.

### Bloque `health_registry` (OBLIGATORIO) is la sección crítica

Debe contener al menos una condición de salud validada.

```yaml
health_registry:
  - condition: "Nombre Estandarizado (ej. Hypertension, Type 2 Diabetes)"
    mechanism: "Explicación bioquímica del mecanismo de acción."
    compounds: ["Lista de compuestos bioactivos responsables"]
    evidence_level: "High | Medium | Low"
    studies:
      - title: "Título del estudio principal"
        source: "Journal o Fuente (ej. PubMed, Lancet)"
        year: 202X
        doi: "DOI del estudio"
```

### Niveles de Evidencia

- **High**: Meta-análisis, Revisiones Sistemáticas Cochrane, Ensayos Clínicos Aleatorizados (RCT) grandes.
- **Medium**: RCTs pequeños, estudios de cohorte, estudios in vivo robustos.
- **Low**: Estudios in vitro, uso tradicional sin validación clínica moderna, correlaciones observacionales.

## 3. Fuentes Aceptadas

Priorizar fuentes de acceso abierto pero alta calidad:

1. **PubMed / NIH / Medline**
2. **ScienceDirect / Elsevier** (Open Access)
3. **Google Scholar** (Filtrar por últimos 10 años)
4. **USDA FoodData Central** (Para macros/micros)

## 4. Proceso de Actualización

1. **Identificar el Ingrediente**: Seleccionar un ingrediente común (ej. Cebolla).
2. **Búsqueda Bibliográfica**: Buscar `[Ingrediente] clinical trial health benefits` o `[Bioactive compound] mechanism`.
3. **Sítesis**: Redactar la sección `scientific_analysis` y rellenar el `health_registry`.
4. **Verificación**: Asegurar que las porciones (`default_g`) sean realistas para el consumo humano (no usar dosis de extractos concentrados inalcanzables con la dieta).

## 5. Ejemplo de Checklist de Calidad

- [ ] ¿Tiene DOI o enlace a la fuente?
- [ ] ¿El mecanismo explica el "por qué"?
- [ ] ¿Se distinguen los efectos crudos vs cocidos? (Importante para Ajo/Tomate).
