# Protocolo de Estandarización Científica para Recetas (gastronomic-open-standard-GOS)

Este protocolo define el estándar de calidad y profundidad científica que debe tener cada receta en el repositorio `gastronomic-open-standard-GOS`. El objetivo es transformar un recetario tradicional en una base de datos de conocimiento gastronómico, químico y nutricional útil para investigación, educación y análisis estadístico.

## 1. Estructura de la Sección: "Análisis Detallado y Sabiduría Colectiva"

Cada receta DEBE incluir al final una sección H2 titulada `## 🔬 Análisis Detallado y Sabiduría Colectiva`. Esta sección se divide en las siguientes sub-categorías obligatorias.

### 1.1. Perfil Organoléptico (Estandarizado)

No usar descripciones vagas. Usar descriptores estandarizados.

- **Sabor (Gusto):** Identificar la intensidad (0-5) de los 5 gustos básicos: Dulce, Salado, Ácido, Amargo, Umami.
- **Aroma (Olfato):** Listar compuestos volátiles principales si se conocen (ej. *Limoneno* en cítricos, *Vanillina* en vainilla) o familias aromáticas (Citrico, Herbal, Especiado, Tostado).
- **Textura (Tacto Bucal):** Definir propiedades reológicas (Crujiente, Cremoso, Viscoso, Astringente).

### 1.2. Química y Física Culinaria

Explicar los fenómenos científicos que ocurren durante la preparación.

- **Reacciones Principales:**
    - *Reacción de Maillard:* (Dorado de proteínas/azúcares).
    - *Caramelización:* (Oxidación de azúcares).
    - *Desnaturalización Proteica:* (Cambio de estructura por calor/ácido, ej. ceviche).
    - *Gelatinización:* (Espesamiento de almidones).
    - *Emulsificación:* (Mezcla de agua/grasa).
- **Técnicas Clave:** Explicar POR QUÉ se hace un paso específico (ej. "Blanquear para desactivar enzimas y fijar clorofila").

### 1.3. Perfil Nutricional Profundo

Ir más allá de las calorías. Usar datos de fuentes confiables (USDA, FAO).

- **Macro Balance:** Relación Proteína/Grasa/Carbohidrato.
- **Micronutrientes Destacados:** Vitaminas y Minerales que cubran >20% del valor diario recomendado (VDR).
- **Compuestos Bioactivos:** Mencionar antioxidantes, polifenoles, probióticos, etc. (ej. *Licopeno* en tomates, *Capsaicina* en ajíes).
- **Impacto Metabólico (Estimado):** Índice Glucémico (IG), Carga Glucémica (CG) aproximada, digestibilidad.

### 1.4. Contexto Socio-Cultural y Saberes Ancestrales

Esta sección es crucial para preservar la memoria histórica y cultural.

- **Historia y Origen:**
    - Origen geográfico validado (ej. "Andes Centrales").
    - Evolución histórica (ej. "Adaptación mestiza de un cocido español").
- **Saberes Ancestrales y Mitos:**
    - Creencias populares (ej. "Cortar el aguacate con cuchillo de metal lo pone negro").
    - Usos medicinales tradicionales de los ingredientes en el contexto del plato.
    - Refranes o dichos asociados.
- **Referencias Científicas:** Si existen estudios sobre los beneficios o propiedades de los ingredientes clave, citarlos (DOI o nombre del estudio).

---

## 2. Ejemplo de Implementación (Template)

```markdown
## 🔬 Análisis Detallado y Sabiduría Colectiva

### 📊 Perfil Sensorial
| Atributo | Descriptor Principal | Intensidad (1-5) | Notas Químicas |
|----------|----------------------|------------------|----------------|
| **Sabor**| Umami, Salado        | 5/5              | Alto contenido de glutamato (tomate/queso) |
| **Aroma**| Herbal, Lácteo       | 4/5              | Compuestos azufrados (cebolla/ajo) |
| **Textura**| Cremosa, Trozos    | 3/5              | Viscosidad por almidón de papa |

### ⚗️ Química Culinaria
- **Reacción de Maillard:** No presente dominantemente (es un hervido), predominan sabores primarios.
- **Emulsificación:** El queso libera grasas que se emulsionan parcialmente con el almidón de la papa, creando el cuerpo de la sopa.
- **pH:** Ligeramente ácido (5.5 - 6.0) debido a la presencia de ácido láctico (queso/suero).

### 🍎 Nutrición y Metabolismo
- **Calorías Totales:** ~350 kcal/porción.
- **Perfil:** Alto en carbohidratos complejos y grasas saturadas.
- **Bioactivos:** *Alicina* (ajo) y *Licopeno* (si lleva tomate) biodisponibles por cocción.
- **Advertencia:** Alto contenido de sodio por el queso costeño.

### 📚 Estudios y Referencias
1. *Nombre del Autor et al. (Año).* "Propiedades reológicas de sopas tradicionales a base de tubérculos". Journal of Food Science.
2. USDA FoodData Central: [Link al ingrediente]
```

## 3. Flujo de Trabajo para el Agente

1. **Leer Receta:** Identificar ingredientes y métodos de cocción.
2. **Consultar Protocolo:** Verificar qué campos faltan.
3. **Investigar:** Buscar propiedades químicas de ingredientes clave (ej. "¿Qué molécula da el picante al ají?").
4. **Redactar:** Generar la sección siguiendo el template markdown.
5. **Validar:** Asegurar que no se inventen datos (alucinación); si no hay dato científico, usar estimaciones lógicas basadas en principios culinarios.
