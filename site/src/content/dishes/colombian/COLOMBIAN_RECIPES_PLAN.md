# 🚀 Fase Actual: Región Andina - Enriquecimiento de Recetas

## Metodología de Investigación y Enriquecimiento

### 🆕 Enfoque de estandarización robusta y enriquecimiento (2025)

A partir de julio de 2025 se implementa un proceso exhaustivo y ordenado para cada receta, asegurando máxima calidad y compatibilidad internacional:

- **Estandarización con YAML Front Matter:**
  - Cada receta inicia con un bloque YAML detallado que incluye: título, región, categorías, perfil sensorial (sabor, textura, aroma, presentación), ingredientes principales, dificultad, tiempos, porciones, imágenes libres (Pixabay, Unsplash, etc.), fuentes científicas y populares, y licencia (MIT).
  - El YAML permite futura vectorización y uso por agentes de IA culinaria.

- **Enriquecimiento sensorial y nutricional:**
  - Para cada receta se documenta sabor dominante, textura, aroma, presentación y experiencia sensorial, con base en reseñas de usuarios y expertos.
  - Se incluye tabla nutricional de ingredientes clave, compuestos bioactivos y enlaces a estudios o fuentes fiables.

- **Fuentes y sabiduría colectiva:**
  - Se citan explícitamente enlaces a menús, reseñas, videos y foros relevantes (Google Maps, TripAdvisor, YouTube, TikTok, prensa, blogs y foros gastronómicos).
  - Se sintetizan comentarios y consejos de la comunidad, resaltando trucos y experiencias reales.

- **Imágenes libres y criterios de selección:**
  - Solo se usan imágenes libres de derechos (Pixabay, Unsplash, Pexels, Freeimages, etc.), citando la fuente y contexto.
  - Si no hay imagen adecuada, se deja placeholder y se prioriza la creación de imágenes propias.

- **Compatibilidad y calidad Markdown:**
  - Se corrigen encabezados (H2 en vez de H1), se cuidan los saltos de línea y listas, y se revisan lints para máxima compatibilidad con renderizadores y futuras integraciones.

- **Licencia abierta definitiva:**
  - Todas las recetas y documentación se publican bajo licencia MIT, garantizando uso abierto, reutilización y atribución.

- **Clasificación sensorial y de uso:**
  - Cada receta se etiqueta según sabor dominante (dulce, salado, ácido, amargo, umami), textura, aroma, tipo de plato (desayuno, fuerte, postre, bebida, snack, etc.) y contexto de consumo.
  - Se prioriza la diversidad sensorial y el valor cultural en la selección y documentación.

Este enfoque garantiza que el recetario colombiano sea referencia global para agentes, investigadores y entusiastas culinarios, y que cada receta sea fácilmente indexable, enriquecida y reutilizable.

- Para cada receta emblemática:
    1. Investigar reseñas y menús de restaurantes reconocidos y bien calificados en Google, TripAdvisor y prensa local.
    2. Extraer descripciones de sabor, técnicas, acompañamientos y trucos de chefs y comensales.
    3. Documentar y citar explícitamente todos los enlaces consultados en la sección de análisis de cada receta.
    4. Integrar hallazgos en el archivo markdown de la receta, siguiendo el modelo de Bandeja Paisa.
    5. Clasificar y documentar cada receta según categorías sensoriales y de uso (ver abajo).
    6. Actualizar esta lista de fuentes clave y mantenerla en crecimiento para futuras recetas.

#### Categorización Sensorial y de Uso

Cada receta debe clasificarse y documentarse bajo las siguientes categorías:

- **Tipo de plato:** Desayuno, Plato fuerte, Entrada, Postre, Bebida, Snack, etc.
- **Perfil de sabor dominante:** Dulce, Salado, Ácido, Amargo, Umami, Picante, etc.
- **Textura principal:** Cremoso, Crujiente, Suave, Jugoso, Seco, Gelatinoso, etc.
- **Aroma destacado:** Herbal, Ahumado, Frutal, Lácteo, Especiado, etc.
- **Presentación y experiencia:** Descripción visual, tamaño de porción, acompañamientos y contexto de consumo (familiar, festivo, callejero, etc.).
- **Opiniones y experiencia de usuario:** Resumen de comentarios de comensales sobre sabor, textura, aroma, presentación y emociones asociadas.

**Ejemplo de documentación para una receta:**

---## Categorización Sensorial y de Uso

- **Tipo de plato:** Plato fuerte
- **Perfil de sabor dominante:** Salado, Umami
- **Textura principal:** Crujiente (chicharrón), Cremoso (frijoles), Suave (arroz, plátano)
- **Aroma destacado:** Ahumado, Lácteo, Herbal
- **Presentación y experiencia:** Se sirve en bandeja grande, porciones generosas, acompañado de aguacate, arepa y huevo frito. Ideal para reuniones familiares o celebraciones.
- **Opiniones y experiencia de usuario:** "La combinación de texturas es adictiva, el chicharrón es el favorito de todos, y el sabor ahumado de los embutidos resalta sobre el fondo cremoso de los frijoles". "Es un plato que reconforta y sorprende por su abundancia". (Opiniones extraídas de Google Maps y TripAdvisor)

---

#### Fuentes clave recientes

- [Cinco restaurantes en Bogotá para probar el mejor ajiaco típico santafereño - Infobae](https://www.infobae.com/america/colombia/2020/11/01/cinco-restaurantes-en-bogota-para-probar-el-mejor-ajiaco-tipico-santafereno/)
- [Los mejores ajiacos de Bogotá: 4 lugares para comer la receta original - El Espectador](https://www.elespectador.com/gastronomia-y-recetas/los-mejores-ajiacos-de-bogota-4-lugares-para-comer-la-receta-original/)
- [El mejor ajiaco del mundo, Bogotá - TripAdvisor](https://www.tripadvisor.com/Restaurant_Review-g294074-d4466515-Reviews-El_mejor_ajiaco_del_mundo-Bogota.html)

**Objetivo:** Completar la investigación, redacción y enriquecimiento de las 10 recetas emblemáticas de la Región Andina, aplicando la metodología de análisis nutricional, compuestos bioactivos y síntesis de comentarios de la comunidad.

| ID    | Tarea                                                              | Prioridad | Estado      | Responsable |
|-------|--------------------------------------------------------------------|-----------|-------------|-------------|
| F1-01 | Completar análisis nutricional de ingredientes de Bandeja Paisa    | ALTA      | ✅ Completado | Cascade     |
| F1-02 | Síntesis de comentarios y consejos de usuarios para Bandeja Paisa | MEDIA     | ✅ Completado | Cascade     |
| F1-03 | Integrar análisis en `bandeja_paisa.md`                           | ALTA      | ✅ Completado | Cascade     |
| F1-04 | Crear archivo base y enriquecer receta de **Ajiaco Santafereño**     | MEDIA     | ⚙️ En Progreso | Cascade     |
|       | _Sub-Task: Completar investigación nutricional de ingredientes_      | MEDIA     | ⬜ Pendiente | Jules       |
|       | _Sub-Task: Investigar y sintetizar sabiduría colectiva (consejos)_ | MEDIA     | ⬜ Pendiente | Jules       |
|       | _Sub-Task: Integrar análisis en `ajiaco_santafereño.md`_         | MEDIA     | ⬜ Pendiente | Jules       |
| F1-05 | Crear archivo base y enriquecer receta de **Mute Santandereano**   | MEDIA     | ⬜ Pendiente | Cascade     |
| F1-06 | Crear archivo base y enriquecer receta de **Lechona Tolimense**    | MEDIA     | ⬜ Pendiente | Cascade     |

**Leyenda de Estado:**

- `⬜ Pendiente`
- `⚙️ En Progreso`
- `✅ Completado`
- `❌ Bloqueado`

---

## 🆕 Nuevas Categorías Nacionales y Temáticas Transversales

A partir de 2025, el recetario se expande para incluir categorías transversales y platos nacionales trending que no pertenecen a una sola región, así como bebidas, snacks, panes, condimentos y otras preparaciones relevantes.

### 📁 Estructura de Carpetas y Subcarpetas

- `/nacionales/`: Platos populares y virales (salchipapa, fritanga, papas rellenas, hamburguesa colombiana, etc.)
- `/bebidas/`: Bebidas frías y calientes (lulada, salpicón, chocolate santafereño, refajo, avena, etc.)
- `/snacks/`: Antojitos y snacks (empanada, buñuelo, almojábana, deditos de queso, pandebono, etc.)
- `/panes/`: Panes y masas típicas (pan de bono, pan de yuca, mogolla, pan aliñado, etc.)
- `/condimentos/`: Salsas y acompañamientos (hogao, ají, suero costeño, salsa rosada, guacamole, etc.)
- `/otras_preparaciones/`: Postres, masas base y preparaciones especiales (arequipe, natilla, mazamorra, tamal nacional, posta negra, etc.)

### 🧭 Metodología de Investigación y Documentación

Para cada categoría:

- Investigar tendencias en redes sociales, menús de restaurantes urbanos, ventas ambulantes y publicaciones gastronómicas recientes.
- Seleccionar al menos 5 recetas icónicas o virales por categoría.
- Documentar cada receta siguiendo la estructura enriquecida: ingredientes, preparación, variantes, análisis sensorial, perfil nutricional, opiniones de usuarios, contexto cultural, fuentes y enlaces.
- Incluir imágenes o placeholders, emojis y enlaces a videos/foros relevantes.
- Clasificar cada receta según tipo de plato, uso, perfil sensorial y contexto de consumo (urbano, familiar, festivo, callejero, etc.).

---

### 🖼️ Incorporación de Imágenes Libres de Uso Público

Es viable y recomendable complementar las recetas con imágenes reales, siempre respetando los derechos de autor y las licencias de uso. No todas las imágenes encontradas en Google son reutilizables; se debe verificar la licencia y preferir fuentes explícitamente libres de derechos.

**Bancos recomendados de imágenes libres:**

- [Pixabay](https://pixabay.com/es/)
- [Unsplash](https://unsplash.com/)
- [Pexels](https://www.pexels.com/es-es/)
- [Freeimages](https://es.freeimages.com/)
- [Pics4learning](http://www.pics4learning.com/)
- [Recursos TIC educación](http://recursostic.educacion.es/bancoimagenes/web/)

**Criterios de selección y uso:**

- Buscar imágenes representativas del plato, preferiblemente con contexto colombiano.
- Verificar que la licencia permita el uso para fines educativos o de divulgación (Creative Commons CC0, dominio público, etc.).
- Citar la fuente y/o autor de la imagen en la receta (ejemplo: "Imagen: Pixabay/usuario").
- Si no se encuentra imagen adecuada, mantener el placeholder y priorizar la creación de imágenes propias en el futuro.
- No usar imágenes con marcas de agua, logotipos comerciales ni restricciones explícitas.

**Procedimiento sugerido:**

1. Buscar el nombre del plato en los bancos recomendados.
2. Descargar la imagen seleccionada y renombrarla según la receta.
3. Incluir la imagen en la carpeta correspondiente y enlazarla en el archivo markdown de la receta, citando la fuente.
4. Documentar el proceso y criterios en el README o sección de fuentes de cada receta.

Esto garantiza que el recetario cumpla con buenas prácticas de derechos de autor y facilite la visualización de las preparaciones para los usuarios.

### 📋 Ejemplo de índice por categoría

#### `/nacionales/`

- Salchipapa
- Fritanga
- Papas Aborrajadas
- Papas Rellenas
- Chuzo de Pollo/Carne

#### `/bebidas/`

- Lulada
- Salpicón
- Chocolate Santafereño
- Refajo
- Avena

#### `/snacks/`

- Empanada
- Buñuelo
- Almojábana
- Deditos de Queso
- Pandebono

#### `/panes/`

- Pan de Bono
- Pan de Yuca
- Pan Aliñado
- Pan Blandito
- Mogolla

#### `/condimentos/`

- Hogao
- Ají Picante
- Salsa Rosada
- Guacamole Colombiano
- Suero Costeño

#### `/otras_preparaciones/`

- Arequipe
- Natilla
- Mazamorra
- Tamal Nacional
- Posta Negra

### 🔎 Criterios de Selección y Fuentes

- Prioridad a recetas con alta presencia en redes sociales, ventas ambulantes y menús urbanos.
- Consultar foros, videos virales, blogs, artículos de prensa gastronómica y publicaciones académicas recientes.
- Citar explícitamente todas las fuentes y enlaces relevantes.
- Incluir sección de "Sabiduría colectiva y consejos" basada en comentarios y reseñas de usuarios.

---

## 🏁 Fases Futuras

- **Fase 2:** Región Caribe - Enriquecimiento de Recetas
- **Fase 3:** Región Pacífica - Enriquecimiento de Recetas
- **Fase 4:** Región Orinoquía - Enriquecimiento de Recetas
- **Fase 5:** Región Amazonía - Enriquecimiento de Recetas
- **Fase 6:** Región Insular - Enriquecimiento de Recetas

---

## ✅ Hitos Principales Completados

- Hito 1: Creación de la estructura de carpetas para las 6 regiones de Colombia.
- Hito 2: Investigación y listado de 10 recetas emblemáticas por cada región.
- Hito 3: Creación de la receta base para "Bandeja Paisa".
- Hito 4: Creación del plan de enriquecimiento de recetas y del plan de gestión de tareas.

---

## 👾 Deuda Técnica y Mejoras Pendientes

| ID    | Tarea                                                              | Prioridad | Estado      | Responsable |
|-------|--------------------------------------------------------------------|-----------|-------------|-------------|
| TD-01 | Crear un `template_receta.md` para estandarizar futuros archivos.    | BAJA      | ⬜ Pendiente | Cascade     |
| TD-02 | Investigar herramientas para automatizar la extracción de datos.     | BAJA      | ⬜ Pendiente | Cascade     |

---

## 📝 Tareas Descubiertas Durante el Desarrollo

| ID    | Tarea                                                              | Prioridad | Estado      | Responsable |
|-------|--------------------------------------------------------------------|-----------|-------------|-------------|
| AD-01 | Validar y estandarizar las unidades de medida en todas las recetas.  | MEDIA     | ⬜ Pendiente | Cascade     |
