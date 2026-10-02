# Instrucciones del proyecto (GEMINI.md)

Este repositorio contiene recetas del mundo, en múltiples idiomas, con foco en mantenerlas libres (MIT) y correctamente atribuidas.

## Objetivos al editar recetas

- Completar y normalizar recetas en Markdown con Front Matter YAML consistente.
- Enriquecimiento sensorial (texturas, aromas, sonidos) y nutricional (aprox. kcal, macros cuando aplique).
- Mantener la licencia y fuentes citadas (enlaces a documentación externa cuando existan).
- Evitar sesgos regionales: mantener variantes culturales y nombres alternativos.
- Escribir español claro y neutro cuando el documento sea en español; conservar idioma original si el archivo está localizado.

## Estilo

- Títulos: H1 con el nombre del plato; subtítulos con H2/H3.
- Ingredientes en lista con cantidades y unidades consistentes (SI preferido).
- Pasos numerados con verbos en imperativo y tiempos aproximados.
- Notas: sustituciones, alergias, equipamiento, tips.
- Añadir sección de “variantes” cuando aplique.

## Front Matter recomendado (ejemplo)

```yaml
---
title: "Arroz con pollo"
region: "Latinoamérica"
language: "es"
license: Apache-2.0
sources:
  - name: "Wikipedia"
    url: "https://es.wikipedia.org/wiki/Arroz_con_pollo"
media:
  - type: "image"
    url: "https://.../foto.jpg"
nutrition:
  calories: 600
  macros:
    protein_g: 25
    fat_g: 20
    carbs_g: 80
embedding_version: 1
---
```

## Enlaces externos

- Puedes enlazar YouTube, TikTok, Instagram, blogs y papers. No incrustes anuncios.
- Mantén sólo contenido permitido por TOS y con atribución.

## Limitaciones operativas

- No agotar el free tier: preferir lotes pequeños y compresión de contexto.
- Evitar cambios masivos en una sola ejecución.

## Hecho

- Mantener consistencia con estándares existentes en `dishes/`.
- Respetar recetas ya enriquecidas (no degradar calidad).

## Requisitos Estructurales Adicionales

### Protocolo de Ingredientes

Para la creación de nuevos ingredientes, consultar `docs/SCIENTIFIC_INGREDIENT_PROTOCOL.md`.

### Sección: Análisis Detallado y Sabiduría Colectiva

Toda receta DEBE incluir una sección H2 titulada "Análisis Detallado y Sabiduría Colectiva" al final, que contenga:

1. **Categorización Sensorial**: Perfil de sabor, textura, aroma.
2. **Experiencia de Usuario**: Citas o resumen de opiniones.
3. **Perfil Nutricional Detallado**:
    - Tabla con ingredientes clave.
    - Calorías, Macros (Proteína, Carbs, Grasas).
    - **Micronutrientes**: Vitaminas y minerales destacados (ej. Magnesio, Vitamina C) basados en las porciones.

Gracias por mantener el proyecto libre y útil para la comunidad.
