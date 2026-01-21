# Plan de Estandarización y Enriquecimiento de Recetas (Proyecto AI Chef)

Este documento define el nuevo estándar unificado para las recetas del repositorio y traza el plan para actualizar todas las recetas existentes.

## 1. El Nuevo Estándar "Maestro"

Basado en el modelo de `bandeja_paisa.md` y `ajiaco_santafereño.md`, pero con ajustes para mayor claridad y consistencia nutricional.

### Estructura del Archivo `.md`

1.  **Frontmatter (YAML)**
    *   `title`: Título de la receta.
    *   `region`: Región (Andina, Caribe, Pacífica, etc.).
    *   `categories`: Lista (ej. Plato fuerte, Sopa, Postre).
    *   `sensory`: Objeto con listas para `flavor`, `texture`, `aroma` y string para `presentation`.
    *   `main_ingredients`: Lista de ingredientes principales.
    *   `difficulty`: Estrellas (★☆☆☆☆ a ★★★★★).
    *   `prep_time`: String (ej. "30 minutos").
    *   `cook_time`: String.
    *   `servings`: Entero.
    *   `nutrition`: **NUEVO: Valores por porción.**
        *   `calories`: Entero.
        *   `macros`: `protein_g`, `fat_g`, `carbs_g`.
    *   `tags`: Etiquetas para búsqueda.
    *   `images`: Lista de objetos `{url, description}`.
    *   `sources`: Lista de URLs.
    *   `license`: "MIT".
    *   `description`: Breve descripción.

2.  **Cuerpo del Markdown**
    *   `## 🍲 Título`
    *   `## Información General` (Dificultad, Tiempos, Porciones).
    *   `## 📝 Ingredientes` (Subdividido si es necesario).
    *   `## 👨‍🍳 Instrucciones` (Numeradas).
    *   `## 💡 Variaciones y Consejos`.
    *   `## 📸 Galería`.
    *   `## 🔬 Análisis Detallado y Sabiduría Colectiva` **(Sección Crítica)**
        *   `### 📊 Perfil Sensorial Estandarizado` (Tabla con Sabor, Aroma, Textura, Boca).
        *   `### ⚗️ Química y Física Culinaria` (Explicación científica de procesos).
        *   `### 🍎 Nutrición y Metabolismo` (Análisis profundo, bioactivos).
        *   `### 🕰️ Contexto Socio-Cultural y Saberes Ancestrales` (Historia, tradiciones).
        *   `### 📚 Estudios y Referencias` (Bibliografía).
        *   `### Sabores y Consejos de Restaurantes Emblemáticos` (Opcional).
        *   `#### Consejos de la comunidad y comensales` (Síntesis de reviews).

## 2. Inventario y Estado Actual

Se estima que existen **~100 archivos de recetas**.

*   **Nivel 1 (Completo):** ~10 recetas (ej. `bandeja_paisa.md`, `ajiaco_santafereño.md`). Tienen la sección científica completa.
*   **Nivel 2 (Parcial):** ~12 recetas (ej. `arroz_con_coco.md`). Tienen una versión antigua de la sección de análisis.
*   **Nivel 3 (Básico):** ~80 recetas. Tienen estructura básica (Ingredientes, Instrucciones) pero carecen de análisis profundo y metadatos sensoriales detallados.

## 3. Estrategia de Actualización

Dado el volumen, la actualización se realizará por **lotes regionales**.

### Fase 1: Estandarización de Estructura y Metadatos (Automatiación + Revisión)
*   Asegurar que todas las recetas tengan el Frontmatter completo.
*   Normalizar los encabezados (H2, H3).
*   Asegurar que la sección `nutrition` en YAML sea *por porción*.

### Fase 2: Enriquecimiento de Contenido (Lote por Lote)
Para cada receta en Nivel 2 y 3:
1.  **Investigación**: Buscar fuentes sobre química, historia y nutrición del plato.
2.  **Redacción**: Generar la sección `## 🔬 Análisis Detallado y Sabiduría Colectiva`.
3.  **Validación**: Verificar datos nutricionales.

## 4. Plan de Acción Inmediato

1.  **Validar el Estándar**: Confirmar que este documento es la guía definitiva.
2.  **Script de Auditoría**: Crear un script para identificar qué recetas faltan por actualizar y generar una lista de tareas.
3.  **Ejecución Piloto**: Actualizar 1 receta de "Nivel 3" (ej. `sancocho_costeño.md` o una de la Amazonía) para demostrar el flujo.
4.  **Ejecución Masiva**: Iterar por carpeta regional (`amazonia`, `caribe`, etc.).

---
*Autor: Jules (AI Agent)*
