# 📋 Tareas de Estandarización Científica (AI-Chef)

Este archivo rastrea el progreso de la migración del repositorio hacia el nuevo estándar científico y la preparación para la API de ventas.

## 🎯 Objetivo Principal

Transformar cada receta en una estructura de datos rica (YAML) con:
1.  **Ingredientes Linkeados**: Cada ingrediente conectado a `ingredients/*.md` con datos taxonómicos.
2.  **Nutrición Exacta**: Cálculo real basado en la suma de ingredientes x masa.
3.  **Perfil Sensorial**: Datos cuantificables (0-10) para búsqueda inteligente.
4.  **Análisis Científico**: Secciones generadas por IA sobre química y biología del plato.

---

## 🚦 Estado del Proyecto

- **Protocolos**: ✅ Definidos (`PLAN_DE_ESTANDARIZACION.md`, `PROTOCOLO_INGREDIENTES.md`)
- **Herramientas de Auditoría**: ✅ Listas (`automation/audit_recipes.py`)
- **Motor de Estandarización**: ✅ Listo (`automation/standardize_recipes.py`)
- **Infraestructura CI/CD**: ✅ Lista (`.github/workflows/standardize_recipes.yml`)
- **API & Indexación**: ✅ Listas (`automation/index_recipes.py`, `API_README.md`)

---

## 📝 Lista de Tareas

### Fase 1: Auditoría y Limpieza (Completa)
- [x] Definir el estándar "Gold" científico.
- [x] Crear script de auditoría para identificar brechas.
- [x] Generar reporte inicial (85 recetas necesitan actualización).

### Fase 2: Estandarización Masiva (En Progreso)
> **Instrucción**: Ejecutar el script de estandarización por lotes para evitar límites de API.

- [ ] **Lote 1: Platos Colombianos (Andina)**
    - [ ] Bandeja Paisa (Revisar actualización piloto)
    - [ ] Ajiaco Santafereño
    - [ ] Tamal Tolimense
- [ ] **Lote 2: Bebidas y Postres**
    - [ ] Bebidas Colombianas
    - [ ] Postres (Arroz con leche, etc.)
- [ ] **Lote 3: Platos Internacionales (China/General)**
    - [ ] Adaptar prompts si es necesario para recetas en chino/inglés.

### Fase 3: Base de Datos de Ingredientes
- [ ] **Validación Humana**: Revisar los ingredientes generados por IA en `ingredients/` para asegurar que la nutrición (USDA) sea coherente.
- [ ] **Taxonomía**: Asegurar que las carpetas (`legumes`, `proteins`, etc.) estén limpias.

### Fase 4: Preparación para API (Completa)
- [x] **Indexación**: Crear script `automation/index_recipes.py` para generar `output/all_recipes.json`.
- [x] **Search Engine**: Implementar CLI `automation/search_recipes.py` para búsquedas locales.
- [x] **Documentación**: Crear `API_README.md`.

---

## 🛠️ Cómo ejecutar las tareas

### 1. Auditar el progreso
```bash
python automation/audit_recipes.py
```

### 2. Generar Index API
```bash
python automation/index_recipes.py
```

### 3. Estandarizar un lote (Localmente)
```bash
export GEMINI_API_KEY="tu_api_key"
python automation/standardize_recipes.py --target_directory "dishes/colombian" --limit 5
```

### 4. Estandarizar vía GitHub Actions
Ir a la pestaña "Actions" -> Seleccionar "Standardize Recipes with AI" -> Run workflow.
