# Recipe Metadata Quality Audit Report

**Generated:** 2026-04-13  
**Repository:** gastronomic-open-standard-GOS  
**Auditor:** Automated Python Script  

---

## Summary

| Metric | Count |
|--------|-------|
| Total recipes sampled | 20 |
| Colombian | 12 |
| China | 7 |
| Peruvian | 1 |
| Parse errors | 0 |

---

## TASK 2: Aggregate Statistics

### Frontmatter Completeness

| Field | Filled | Missing | % Filled |
|-------|--------|---------|----------|
| `main_ingredients` | 18 | 2 | 90.0% |
| `region` | 19 | 1 | 95.0% |
| `difficulty` | 18 | 2 | 90.0% |
| `prep_time` | 18 | 2 | 90.0% |
| `cook_time` | 18 | 2 | 90.0% |
| `image` (or `images` array) | 12 | 8 | 60.0% |

**Complete frontmatter** (all 6 fields present): 11/20 = **55.0%**

### Sensory Profile

| Field | Filled | % |
|-------|--------|---|
| `sensory.flavor` | 16/20 | 80.0% |
| `sensory.texture` | 16/20 | 80.0% |
| `sensory.aroma` | 16/20 | 80.0% |
| **All 3 sensory fields** | 16/20 | 80.0% |

### Cooking Times

| Metric | Count | % |
|--------|-------|---|
| Has **both** `prep_time` AND `cook_time` | 18/20 | **90.0%** |
| Has `prep_time` | 18/20 | 90.0% |
| Has `cook_time` | 18/20 | 90.0% |

### Content Ingredients Section

| Metric | Count | % |
|-------|-------|---|
| Has `## Ingredients` content section | 12/20 | 60.0% |

### Ingredient Matching (Frontmatter vs Content)

| Metric | Count | % |
|--------|-------|------|
| Content ## Ingredients matches frontmatter `main_ingredients` | 7/20 | 35.0% |
| Content has ingredients but **NO** frontmatter `main_ingredients` | 1/20 | 5.0% |

---

## TASK 1: Per-Recipe Audit Detail

Y=Yes (present), N=No (missing), P=Partial (some subfields present)

| Recipe | Folder | main_ing | sensory | region | diff | prep | cook | img | ing_match | Notes |
|--------|--------|----------|---------|--------|------|------|------|-----|-----------|-------|
| patarasca | amazonia | Y | Y | Y | Y | Y | Y | Y | P | ing_match=P |
| mariscos | english | Y | Y | Y | Y | Y | Y | N | Y | no content ##Ing |
| papas_rellenas | nacionales | Y | Y | Y | Y | Y | Y | Y | P | ing_match=P |
| pirarucu_frito | amazonia | Y | Y | Y | Y | Y | Y | Y | P | ing_match=P |
| mariscos | english | Y | Y | Y | Y | Y | Y | N | Y | no content ##Ing |
| tacacho_con_cecina | amazonia | Y | Y | Y | Y | Y | Y | Y | P | ing_match=P |
| 蒸卤面 | principales | Y | N | Y | Y | Y | Y | N | Y | no content ##Ing |
| guarapo | bebidas | Y | Y | Y | Y | Y | Y | Y | P | ing_match=P |
| peruvian | dishes | Y | Y | Y | Y | Y | Y | Y | P | ing_match=P |
| garulla | amasijos | Y | Y | Y | Y | Y | Y | Y | P | ing_match=P |
| principales | english | Y | Y | Y | Y | Y | Y | N | Y | no content ##Ing |
| caribe | colombian | N | N | Y | N | N | N | N | N | no content ##Ing |
| otras_preparaciones | colombian | N | N | N | N | N | N | Y | N | MISSING main_ingredients |
| bandeja_paisa | andina | Y | Y | Y | Y | Y | Y | Y | P | ing_match=P |
| aborrajado_valluno | pacifica | Y | Y | Y | Y | Y | Y | Y | P | ing_match=P |
| 红烧鱼 | mariscos | Y | N | Y | Y | Y | Y | N | Y | no content ##Ing |
| champus | bebidas | Y | Y | Y | Y | Y | Y | Y | P | ing_match=P |
| principales | english | Y | Y | Y | Y | Y | Y | N | Y | no content ##Ing |
| mamona | orinoquia | Y | Y | Y | Y | Y | Y | Y | P | ing_match=P |
| principales | english | Y | Y | Y | Y | Y | Y | N | Y | no content ##Ing |


---

## TASK 3: Recipes with Content Ingredients but Missing frontmatter `main_ingredients`

**Total affected:** 1 recipes

| # | Recipe | Folder | Content Ingredients Count |
|---|--------|--------|---------------------------|
| 1 | `otras_preparaciones` | colombian | 4 |

---

## Most Common Missing Fields

| Field | Missing | Total | % Missing |
|-------|---------|-------|-----------|
| `image` | 8/20 | 40.0% |
| `sensory.flavor` | 4/20 | 20.0% |
| `sensory.texture` | 4/20 | 20.0% |
| `sensory.aroma` | 4/20 | 20.0% |
| `main_ingredients` | 2/20 | 10.0% |
| `difficulty` | 2/20 | 10.0% |
| `prep_time` | 2/20 | 10.0% |
| `cook_time` | 2/20 | 10.0% |
| `region` | 1/20 | 5.0% |

---

## Notes on Methodology

- **Sample:** 20 random recipes (12 Colombian, 7 Chinese, 1 Peruvian) with seed=42 for reproducibility
- **`image` field check:** Also checks `images` array field (schema variation)
- **Ingredient matching:** Flexible matching - content ingredient considered matched if any word overlaps with frontmatter `main_ingredients`; threshold 70%
- **`## Ingredients` parsing:** Handles emoji-prefixed headings (e.g., `## :pencil: Ingredientes`)
- **Frontmatter parsed with:** `yaml.safe_load()`

---

## Sample File List

```
E:\scripts-python\gastronomic-open-standard-GOS\dishes\colombian\amazonia\patarasca\patarasca.md
E:\scripts-python\gastronomic-open-standard-GOS\dishes\china\english\mariscos\清蒸生蚝.md
E:\scripts-python\gastronomic-open-standard-GOS\dishes\colombian\nacionales\papas_rellenas\papas_rellenas.md
E:\scripts-python\gastronomic-open-standard-GOS\dishes\colombian\amazonia\pirarucu_frito\pirarucu_frito.md
E:\scripts-python\gastronomic-open-standard-GOS\dishes\china\english\mariscos\水煮鱼.md
E:\scripts-python\gastronomic-open-standard-GOS\dishes\colombian\amazonia\tacacho_con_cecina\tacacho_con_cecina.md
E:\scripts-python\gastronomic-open-standard-GOS\dishes\china\principales\蒸卤面\蒸卤面.md
E:\scripts-python\gastronomic-open-standard-GOS\dishes\colombian\bebidas\guarapo\guarapo.md
E:\scripts-python\gastronomic-open-standard-GOS\dishes\peruvian\arroz_con_pollo.md
E:\scripts-python\gastronomic-open-standard-GOS\dishes\colombian\amasijos\garulla\garulla.md
E:\scripts-python\gastronomic-open-standard-GOS\dishes\china\english\principales\螺蛳粉.md
E:\scripts-python\gastronomic-open-standard-GOS\dishes\colombian\caribe\recetas_caribe.md
E:\scripts-python\gastronomic-open-standard-GOS\dishes\colombian\otras_preparaciones\mazamorra.md
E:\scripts-python\gastronomic-open-standard-GOS\dishes\colombian\andina\bandeja_paisa\bandeja_paisa.md
E:\scripts-python\gastronomic-open-standard-GOS\dishes\colombian\pacifica\aborrajado_valluno\aborrajado_valluno.md
E:\scripts-python\gastronomic-open-standard-GOS\dishes\china\mariscos\红烧鱼\红烧鱼.md
E:\scripts-python\gastronomic-open-standard-GOS\dishes\colombian\bebidas\champus\champus.md
E:\scripts-python\gastronomic-open-standard-GOS\dishes\china\english\principales\蛋包饭.md
E:\scripts-python\gastronomic-open-standard-GOS\dishes\colombian\orinoquia\mamona\mamona.md
E:\scripts-python\gastronomic-open-standard-GOS\dishes\china\english\principales\咸肉菜饭.md
```
