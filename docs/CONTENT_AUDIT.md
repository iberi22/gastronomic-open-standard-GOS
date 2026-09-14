# GOS Content & Interconnection Audit Baseline Report

> **Generado:** `2026-09-14 16:18:56 UTC`

## 📊 Resumen Ejecutivo

- **Recetas Totales:** `591`
  - Sin Perfil Sensorial: `211`
  - Sin `main_ingredients`: `6`
  - Con < 3 ingredientes: `17`
  - Slugs duplicados: `54`
- **Ingredientes Totales:** `553`
  - Curados: `38` | Pending Review: `515` | Archive: `0`
  - Nombres no latinos: `186`
  - Cobertura Aliases: `27` (4.88%)
  - Cobertura Micronutrientes: `38` (6.87%)
- **Grafo de Conocimiento:** `4267` Nodos | `11846` Aristas
  - Nodos aislados: `6`
  - Aristas huérfanas: `0`
  - Tipos de arista (vocabulario): `15`

## 📋 Scorecard Wave C

| Issue | Métrica / Objetivo | Valor Actual | Métrica de Aceptación |
|---|---|---|---|
| C.01 (Recetas & Perfil Sensorial) | Recetas sin perfil sensorial y sin ingredientes principales | 211 sin sensorial / 6 sin ingredientes | 0 sin sensorial / 0 sin ingredientes |
| C.02 (Curación de Ingredientes) | Ingredientes en pending_review y nombres no latinos | 515 en pending_review / 186 no latinos | 0 en pending_review / 0 no latinos |
| C.03 (Grafo de Conocimiento) | Nodos aislados, aristas huérfanas y vocabulario de aristas | 6 aislados / 0 huérfanas / 15 tipos aristas | 0 aislados / 0 huérfanas / >= 15 tipos aristas con FITS_DIET y SUBSTITUTE_FOR |
| C.04 (CI Gate & Enforcing) | Paso de validación CI `audit_content.py --check` | Tool implementado (CI wiring pendiente en C.04) | CI workflow ejecuta `audit_content.py --check` y bloquea regersiones |
| C.05 (Herramienta & Baseline Audit) | Herramienta determinista scripts/audit_content.py y docs/CONTENT_AUDIT.md | Implementado & committed baseline | Herramienta CLI determinista en repo root + baseline documentado |

## 🍲 Recetas (`dishes/`)

- **Total de Recetas:** 591
- **Sin Perfil Sensorial Estandarizado:** 211
- **Sin `main_ingredients`:** 6
- **Recetas con < 3 ingredientes:** 17
- **Títulos duplicados:** 2
- **Slugs duplicados:** 54

### Desglose por Región

| Región | Recetas |
|---|---|
| Aichi (Nagoya) / Kyoto | 1 |
| Akita | 1 |
| Amazonas / Pará, Brasil | 1 |
| Amazonía | 10 |
| Amazonía / Orinoquía | 1 |
| Amritsar | 1 |
| Andalucía | 3 |
| Andina | 16 |
| Andina (Cundiboyacense) | 1 |
| Andina (Huila) | 1 |
| Andina (Soacha / Cundinamarca) | 1 |
| Andina / Central | 1 |
| Andina / Nacional | 2 |
| Andina / Sur de Colombia | 1 |
| Asturias | 1 |
| Atenas | 3 |
| Atenas / Grecia Nacional | 1 |
| Atlas / Marrakech | 1 |
| Bahia, Brasil | 3 |
| Bangkok | 10 |
| Barisal | 2 |
| Bengala Occidental / Kolkata | 1 |
| Bengala Occidental / Odisha | 1 |
| Bihar | 1 |
| Bogra | 1 |
| Bombay / Mumbai | 1 |
| Borgoña | 3 |
| Boston, MA | 1 |
| Brasil | 10 |
| Brasil (Nacional) | 1 |
| Buenos Aires / Nacional | 1 |
| Buenos Aires / Pampeana | 1 |
| Buffalo, NY | 1 |
| Cachemira | 1 |
| Campania (Capri) | 1 |
| Campania (Nápoles) | 1 |
| Campania / Sicilia | 1 |
| Caribe | 11 |
| Caribe/Magdalena | 1 |
| Carolina del Norte | 1 |
| Carolina del Sur | 1 |
| Casablanca | 2 |
| Castilla y León | 1 |
| Cataluña | 1 |
| Ceará / Nordeste, Brasil | 1 |
| Central | 1 |
| Central / Metropolitana | 1 |
| Central / Sur | 2 |
| Central / Valles Agrícolas | 1 |
| Central Thailand | 5 |
| Centro de México | 5 |
| Chiang Mai | 1 |
| China | 69 |
| Chittagong | 1 |
| Ciudad de México | 4 |
| Colombia | 26 |
| Comunidad Valenciana | 1 |
| Costa | 3 |
| Costa (Norte) | 1 |
| Costa Azul | 1 |
| Costa/Sierra | 6 |
| Creta | 2 |
| Cuba | 10 |
| Córdoba | 1 |
| Delfinado | 1 |
| Dhaka | 2 |
| EE.UU. Nacional | 3 |
| Emilia-Romaña | 1 |
| Emilia-Romaña (Bolonia) | 1 |
| Epiro | 1 |
| España Nacional | 2 |
| Espírito Santo, Brasil | 1 |
| Essaouira | 1 |
| Extremadura / Jabugo | 1 |
| Fez | 6 |
| Filadelfia, PA | 1 |
| Florida Keys | 1 |
| Francia Nacional | 2 |
| Fukuoka | 1 |
| Fukuoka (Kyushu) | 1 |
| Galicia | 4 |
| Gascuña | 1 |
| Georgia | 1 |
| Gifu (Takayama) | 1 |
| Goa | 1 |
| Grecia Central | 1 |
| Grecia Nacional | 8 |
| Gujarat | 1 |
| Hamamatsu | 1 |
| Hidalgo | 1 |
| Hokkaido | 2 |
| Hyderabad | 1 |
| Insular | 4 |
| Insular (San Andrés y Providencia) | 2 |
| Isan | 2 |
| Izakaya / Nacional | 1 |
| Jalisco | 2 |
| Japón Nacional | 3 |
| Kamakura | 1 |
| Kanto | 1 |
| Karnataka | 1 |
| Khulna | 2 |
| Kyoto | 3 |
| La Pampa / Pampeana | 1 |
| Languedoc | 1 |
| Lazio (Ariccia) | 1 |
| Lazio (Roma) | 3 |
| Liguria | 1 |
| Liguria (Génova) | 1 |
| Litoral / Coquimbo / Valparaíso | 1 |
| Lombardía | 1 |
| Lombardía (Milán) | 2 |
| Lorena | 1 |
| Luisiana | 2 |
| Macedonia Griega | 1 |
| Madhya Pradesh / Indore | 1 |
| Madrid | 3 |
| Maharashtra | 2 |
| Maine | 1 |
| Marrakech | 2 |
| Marruecos Nacional | 7 |
| Marsella | 1 |
| Medio Oeste | 1 |
| Meknes | 1 |
| Metropolitana | 1 |
| Michoacán | 2 |
| Minas Gerais / Goiás, Brasil | 1 |
| Minas Gerais, Brasil | 1 |
| Missouri / Memphis | 1 |
| Misuri | 1 |
| Mogolla | 1 |
| Mumbai | 2 |
| Mymensingh | 1 |
| México DF | 1 |
| México DF / Puebla | 1 |
| Nacional | 14 |
| Nacional (Andina / Altiplano) | 1 |
| Nacional (Andina / Cafetera) | 1 |
| Nagano | 1 |
| Niza | 1 |
| Niza / Provenza | 1 |
| Nordeste / Brasil | 1 |
| Noroeste / Pampeana / Nacional | 1 |
| Noroeste Argentino (Jujuy / Salta / Tucumán) | 1 |
| Norte de India | 4 |
| Norte de la India / Punjab | 1 |
| Nueva Orleans, LA | 2 |
| Nueva York | 1 |
| Nueva York, NY | 2 |
| Nuevo México | 1 |
| Oaxaca | 6 |
| Old Dhaka | 3 |
| Orinoquía | 3 |
| Osaka | 4 |
| Pacífica | 8 |
| Pacífica / Nariño | 2 |
| Pacífica / Valle del Cauca | 1 |
| Pacífica/Nariño | 1 |
| Pampeana | 1 |
| Pampeana / Nacional | 1 |
| Pampeana / Noroeste | 1 |
| Pan-India | 1 |
| Pará / Brasil | 1 |
| Pará, Brasil | 2 |
| París | 5 |
| País Vasco | 2 |
| Peloponeso | 1 |
| Pernambuco, Brasil | 1 |
| Piamonte | 1 |
| Provenza | 1 |
| Puebla | 4 |
| Puerto Rico | 10 |
| Puglia (Bari) | 1 |
| Punjab | 7 |
| Punjab / Norte de la India | 1 |
| Punjab / U.K. | 1 |
| Rajshahi | 1 |
| Rangpur | 1 |
| República Dominicana | 10 |
| Río de la Plata / Pampeana / Nacional | 1 |
| Selva | 1 |
| Shizuoka (Hamamatsu) | 1 |
| Sicilia | 1 |
| Sicilia (Palermo) | 1 |
| Sierra | 1 |
| Sierra/Costa | 2 |
| Sifnos | 1 |
| Sinaloa | 1 |
| Sur de EE.UU. | 3 |
| Sur de Estados Unidos | 4 |
| Sur de India | 1 |
| Sur de Tailandia | 2 |
| Suroccidente (Valle, Nariño, Cauca) | 1 |
| Sylhet | 1 |
| São Paulo / Brasil | 1 |
| Tamil Nadu / Sur de la India | 2 |
| Telangana / Hyderabad | 1 |
| Tennessee | 1 |
| Tesalónica | 1 |
| Texas | 3 |
| Texas / California | 1 |
| Tlaxcala | 1 |
| Tokyo | 8 |
| Tokyo / Kansai | 1 |
| Toscana | 1 |
| Toyama / Hokuriku | 1 |
| Tradicional Nacional | 1 |
| Tucumán / Noroeste Argentino | 1 |
| Valle del Cauca | 1 |
| Valle del Loira | 1 |
| Valparaíso | 1 |
| Valparaíso / Metropolitana | 1 |
| Veracruz | 2 |
| Virginia | 1 |
| Véneto (Treviso) | 1 |
| Yamagata | 1 |
| Yucatán | 4 |
| china | 49 |

## 🥕 Ingredientes (`ingredients/`)

- **Curados (`ingredients/<categoria>/`):** 38
- **Pendientes (`ingredients/pending_review/`):** 515
- **Archivados (`ingredients/_archive/`):** 0
- **Archivos con nombre no latino (CJK/Otros):** 186
- **Archivos con valores data 'Unknown':** 0
- **Cobertura de Aliases:** 27 (4.88%)
- **Cobertura de Sustitutos:** 0 (0.0%)
- **Cobertura de Micronutrientes:** 38 (6.87%)

## 🕸️ Grafo de Conocimiento (`site/public/graph-data.json`)

- **Nodos Totales:** 4267
- **Aristas Totales:** 11846
- **Nodos Aislados (Grado 0):** 6 (diet_alta_proteina, diet_keto, diet_mediterranea, diet_sin_gluten, diet_vegano, diet_vegetariano)
- **Aristas Huérfanas:** 0
- **Tipos de Aristas (Vocabulario - 15):** BELONGS_TO, CONTAINS_VITAMIN, FOUND_IN, FROM_REGION, HAS_FLAVOR, HAS_NUTRIENT, HAS_SUBSTANCE, HAS_TEXTURE, HELPS_CONDITION, OFTEN_TOGETHER, PLACE, RELATED_DISHES, TREATS, USES, USES_TECHNIQUE

### Nodos por Tipo

| Tipo de Nodo | Cantidad |
|---|---|
| category | 14 |
| condition | 51 |
| diet | 6 |
| flavor | 541 |
| ingredient | 2324 |
| nutrient | 4 |
| place | 43 |
| recipe | 471 |
| region | 216 |
| substance | 43 |
| technique | 14 |
| texture | 517 |
| vitamin | 23 |

### Aristas por Tipo

| Tipo de Arista | Cantidad |
|---|---|
| BELONGS_TO | 1578 |
| CONTAINS_VITAMIN | 105 |
| FOUND_IN | 45 |
| FROM_REGION | 473 |
| HAS_FLAVOR | 1444 |
| HAS_NUTRIENT | 154 |
| HAS_SUBSTANCE | 45 |
| HAS_TEXTURE | 1046 |
| HELPS_CONDITION | 59 |
| OFTEN_TOGETHER | 1046 |
| PLACE | 353 |
| RELATED_DISHES | 1594 |
| TREATS | 31 |
| USES | 3855 |
| USES_TECHNIQUE | 18 |

### Top 10 Hubs (Nodos con mayor grado)

| ID Nodo | Etiqueta | Tipo | Grado |
|---|---|---|---|
| `category_proteins` | Proteins | category | 475 |
| `flavor_salado` | Salado | flavor | 264 |
| `category_vegetables` | Vegetables | category | 255 |
| `flavor_umami` | Umami | flavor | 216 |
| `category_condiments` | Condiments | category | 212 |
| `region_andina` | Andina | region | 208 |
| `category_grains` | Grains | category | 202 |
| `flavor_especiado` | Especiado | flavor | 168 |
| `texture_crujiente_exterior` | Crujiente exterior | texture | 147 |
| `texture_interior_tierno` | Interior tierno | texture | 140 |

### Conectividad de Dietas

| Dieta | Grado | Estado |
|---|---|---|
| `Alta proteína` (`diet_alta_proteina`) | 0 | ❌ Aislado |
| `Keto` (`diet_keto`) | 0 | ❌ Aislado |
| `Mediterránea` (`diet_mediterranea`) | 0 | ❌ Aislado |
| `Sin gluten` (`diet_sin_gluten`) | 0 | ❌ Aislado |
| `Vegano` (`diet_vegano`) | 0 | ❌ Aislado |
| `Vegetariano` (`diet_vegetariano`) | 0 | ❌ Aislado |

## Uso

Este reporte es generado de forma determinista mediante el script `scripts/audit_content.py`.

### Comandos principales
```bash
# Generar reporte Markdown y exportar métricas JSON
python3 scripts/audit_content.py --json /tmp/audit.json --md docs/CONTENT_AUDIT.md

# Ejecutar validación de umbrales para CI (exit 0 si cumple, non-zero si violado)
python3 scripts/audit_content.py --check
```

### Umbrales soportados (`--check`)
- `--max-missing-sensorial N` (defecto: 211): Máximo de recetas sin la sección `## 🔬 Perfil Sensorial Estandarizado`.
- `--max-recipes-without-ingredients N` (defecto: 20): Máximo de recetas sin la lista `main_ingredients`.
- `--max-isolated N` (defecto: 6): Máximo de nodos aislados (grado 0) permitidos en el grafo.
- `--max-orphans N` (defecto: 0): Máximo de aristas huérfanas (referenciando nodos inexistentes).
- `--min-edge-types N` (defecto: 15): Mínimo número de tipos de aristas en el vocabulario del grafo.
- `--allow-missing-graph`: Permite ejecutar `--check` sin fallar si el artefacto `site/public/graph-data.json` no existe.
