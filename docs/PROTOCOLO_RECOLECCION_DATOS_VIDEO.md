# Protocolo de Recolección de Datos Sensoriales vía Video (gastronomic-open-standard-GOS)

Este documento define el estándar para la creación de videos de recetas tipo "Vlog" destinados a la recolección de datos científicos y sensoriales. El objetivo es que estos videos sirvan como **fuente de verdad** para que algoritmos de IA extraigan calificaciones, texturas y perfiles de sabor validados por humanos reales.

## 🎯 Objetivo

Crear una librería de videos estandarizados donde usuarios reales preparan y evalúan las recetas del repositorio, permitiendo análisis estadístico de la satisfacción y precisión de la receta.

---

## 📹 Requisitos "AI-Ready" (Para que la IA te entienda)

Para que nuestros algoritmos puedan procesar tu video, sigue estas reglas básicas:

1. **Audio Claro:** La entrevista debe tener poco ruido de fondo. Las respuestas deben ser audibles.
2. **Plano Detalle (Macro):** Al mostrar la textura final, acerca la cámara para ver la consistencia, el humo, la jugosidad o el crujido.
3. **Sin Música en la Entrevista:** Evita música de fondo durante la sección de preguntas y respuestas para facilitar la transcripción automática.
4. **Etiquetado:** En la descripción del video, incluye siempre el enlace a la receta original en `gastronomic-open-standard-GOS`.

---

## 🎬 Guion del Video (Estructura Sugerida)

### Parte 1: La Preparación (Estilo Libre - 1 a 3 minutos)

*Objetivo: Validar que la receta es reproducible y mostrar los hitos químicos/físicos.*

- **Intro:** "Hola, hoy voy a probar la receta científica de [Nombre del Plato] de gastronomic-open-standard-GOS".
- **Hitos Clave:** Muestra brevemente los puntos críticos.
    - *Ejemplo:* "Miren cómo cambia de color la cebolla al sofreír" o "Aquí la masa ya no se pega a las manos".
- **Resultado Final:** Plano detalle del plato servido (10 segundos estáticos o movimiento lento) para análisis de visión por computador.

### Parte 2: La Degustación (Entrevista Estandarizada)

*Objetivo: Recolección de datos estructurados para el Dataset Sensorial.*

**Configuración:** Sienta a una o más personas (Jueces) frente al plato.
**Rol del Grabador:** Tú haces las preguntas del guion.

#### 🟢 Fase 1: Primera Impresión (Espontánea)

*Instrucción:* "Prueba el plato y dime lo primero que se te venga a la mente, sin pensar mucho."

- *(Aquí capturamos la emoción genuina y el sentimiento positivo/negativo bruto).*

#### 🟢 Fase 2: Cuantificación (Escala 1 a 5)

*Instrucción:* "Ahora vamos a ponerle números. Del 1 al 5, donde 1 es 'No me gusta/Muy bajo' y 5 es 'Me encanta/Muy alto'..."

1. **Pregunta 1 (Visual):** "¿Qué calificación le das a la apariencia? ¿Se ve apetitoso?"
    * *Respuesta esperada:* Un número y una palabra (ej. "4, se ve colorido").
2. **Pregunta 2 (Aroma):** "Huele el plato. Del 1 al 5, ¿qué tan intenso o agradable es el aroma?"
3. **Pregunta 3 (Textura/Boca):** "Al morderlo... del 1 al 5, ¿qué tal la textura? (Mencionar si es crujiente, suave, seco, etc.)"
4. **Pregunta 4 (Sabor General):** "Y finalmente, el sabor global. ¿Qué nota le pones del 1 al 5?"

#### 🟢 Fase 3: Datos Cualitativos (Cierre)

*Instrucción:* Haz esta pregunta final para obtener etiquetas semánticas.

- **Pregunta:** "¿A qué te recuerda este sabor? o ¿En qué ocasión te comerías esto?"
    * *Esto nos ayuda a categorizar el plato (ej. "Comida reconfortante", "Fiesta", "Día lluvioso").*

---

## 📥 Cómo Compartir

1. Sube tu video a YouTube, TikTok o Instagram Reels.
2. Usa el hashtag `#AIChefScience`.
3. Pega el enlace del video en un Issue del repositorio o en el canal de discord correspondiente con el título: `[DATA] Reseña de [Nombre Plato]`.

---

## 🤖 Ejemplo de Extracción de Datos (Lo que ve la IA)

```json
{
  "receta_id": "mote_de_queso",
  "video_url": "youtube.com/...",
  "juez_1": {
    "primera_impresion": "Wow, está muy cremoso.",
    "scores": {
      "apariencia": 5,
      "aroma": 4,
      "textura": 5,
      "sabor": 4
    },
    "textura_tags": ["espeso", "suave"],
    "contexto": "Me recuerda a la comida de mi abuela."
  }
}
```
