# Alérgenos del contrato de salud v1

La enumeración cerrada se define en [envelope.schema.json](../../schemas/ecosystem/v1/envelope.schema.json) y se comparte con `@swal/health-contract`. Los valores completos son `gos:allergen/<slug>`; el validador no acepta alias, traducciones ni categorías inventadas.

## Derivación del contenido de GOS

Inspección del 2026-10-02: se analizaron los **554 archivos** `ingredients/**/*.md`, incluido `_template.md`, leyendo exclusivamente el YAML entre delimitadores `---` que ocupan una línea completa. Se recorrieron claves y listas anidadas, arrays inline y arrays en bloque; los comentarios dentro del YAML no se confundieron con delimitadores. Hubo **0 errores de parseo**.

| Evidencia observada | Archivos | Resultado para el enum |
| --- | ---: | --- |
| `ingredients/pending_review/*.md`: `allergy_profile.allergens: []` | 515 | Todos vacíos; 0 alérgenos declarados |
| Resto de ingredientes y `_template.md`: listas `tags` | 39 | 0 tags positivos de alérgeno |
| `tags: sin_gluten` | 3 | Excluido: expresa ausencia, no presencia |

Los tres archivos con `sin_gluten` son [almidon_yuca.md](../../ingredients/grains/almidon_yuca.md), [arroz.md](../../ingredients/grains/arroz.md) y [yuca.md](../../ingredients/vegetables/yuca.md). Ejemplos de listas vacías son [花生.md](../../ingredients/pending_review/花生.md), [鸡蛋.md](../../ingredients/pending_review/鸡蛋.md) y [de_leche_tibia.md](../../ingredients/pending_review/de_leche_tibia.md). Por tanto, el conjunto de tags positivos observados es **vacío** y su unión con las 14 categorías europeas contiene **14 valores**.

No se infieren declaraciones de alérgenos a partir de nombres, grupos, texto del cuerpo ni alias: [huevo.md](../../ingredients/proteins/huevo.md), [leche.md](../../ingredients/dairy/leche.md), [harina_trigo.md](../../ingredients/grains/harina_trigo.md) y [salsa_soya.md](../../ingredients/sauces/salsa_soya.md) no contienen una declaración de alérgenos en su frontmatter. Una lista vacía o una clave ausente no certifican seguridad ni ausencia de alérgenos. Los productores deben obtener las declaraciones verificadas del alimento antes de usar estos identificadores.

## Mapeo europeo a IDs canónicos

Las 14 categorías proceden de la [Comisión Europea: Allergies](https://food.ec.europa.eu/food-safety/campaign-2026/allergies_en), consultada el 2026-10-02. Los slugs ingleses singulares son una decisión del contrato; conservan `peanut` del ejemplo original. Cada fila representa una categoría, no un ingrediente concreto.

| Categoría | ID canónico |
| --- | --- |
| Cereales que contienen gluten | `gos:allergen/gluten` |
| Crustáceos | `gos:allergen/crustacean` |
| Huevos | `gos:allergen/egg` |
| Pescado | `gos:allergen/fish` |
| Cacahuetes / maní | `gos:allergen/peanut` |
| Soja | `gos:allergen/soy` |
| Leche | `gos:allergen/milk` |
| Frutos de cáscara | `gos:allergen/tree-nut` |
| Apio | `gos:allergen/celery` |
| Mostaza | `gos:allergen/mustard` |
| Semillas de sésamo | `gos:allergen/sesame` |
| Dióxido de azufre y sulfitos | `gos:allergen/sulphite` |
| Altramuz | `gos:allergen/lupin` |
| Moluscos | `gos:allergen/mollusc` |

La categoría europea de sulfitos tiene un umbral de declaración superior a 10 mg/kg o 10 mg/L. El contrato transporta la restricción del sujeto; no calcula concentraciones ni aplica excepciones legales. `gluten` y `tree-nut` agrupan categorías: no identifican por sí solos el cereal o fruto concreto. Este intercambio no sustituye el etiquetado del alimento.

Cuando GOS incorpore tags positivos verificados, su mapeo debe documentarse aquí, junto al archivo de origen y número de ocurrencias. Los alias se normalizan antes de crear un registro; nuevos IDs requieren actualizar conjuntamente schemas, tipos, validadores, fixtures y el espejo Dart. No se amplía silenciosamente el enum de v1.
