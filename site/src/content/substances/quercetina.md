---
name: "Quercetina"
formula: "C15H10O7"
discovery_year: 1854
source_ingredient: "cebolla (Allium cepa)"
benefit: "Antioxidante, antihistamínico, cardioprotector"
sazon: "Flavonol amargo, piel cebolla, base guisos caramelizados"
sabor: "Amargo astringente suave, se concentra al caramelizar"
textura: "Cristal amarillo lipofílico, glicosido (quercetina-3-glucósido) soluble en agua caliente"
vitaminas: ["Vitamin C", "Vitamin B6", "Manganese"]
compuestos: ["Rutin", "Isoquercitrin", "Kaempferol"]
sources: ["PubMed", "NIH"]
tags: ["flavonoide", "antioxidante", "antihistaminico"]
image: "/gastronomic-open-standard-GOS/images/substances/quercetina.jpg"
image_attribution: "Pixabay — Allium cepa"
health_registry:
  - condition: "Allergy / Histamine"
    mechanism: "Mast cell stabilizer, inhibits histamine release"
    evidence_level: "Medium"
    studies:
      - title: "Quercetin and allergic diseases"
        source: "Molecules"
        year: 2016
        doi: "10.3390/molecules21050623"
  - condition: "Hypertension"
    mechanism: "Endothelium-dependent vasodilation"
    evidence_level: "Medium"
    studies:
      - title: "Quercetin and blood pressure: meta-analysis"
        source: "J Am Heart Assoc"
        year: 2016
        doi: "10.1161/JAHA.115.002713"
---

![Quercetina](/gastronomic-open-standard-GOS/images/substances/quercetina.jpg)
*Foto: Pixabay — Allium cepa — placeholder real photo path `public/images/substances/quercetina.jpg` (800×600 webp/jpg, atribución en frontmatter).*

## Descripción

Flavonol 3,3',4',5,7-pentahydroxyflavone (C15H10O7) aislado en 1854 por Rigaud de la corteza de roble (*Quercus*). Flavonoide más abundante en dieta (cebolla 30mg/100g). Glicosilado en planta; antihistamínico natural al estabilizar mastocitos.

## Sazón / Sabor / Textura

- **Sazón:** Flavonol amargo, piel cebolla, base guisos caramelizados
- **Sabor:** Amargo astringente suave, se concentra al caramelizar
- **Textura:** Cristal amarillo lipofílico, glicosido (quercetina-3-glucósido) soluble en agua caliente

Usado en GOS como nodo `substance` conectado a ingredientes vía `active_compounds` y a afecciones vía `health_registry`. Ver grafo filtrado: `/graph?filter=substance:quercetina`.

## Beneficio principal

> Antioxidante, antihistamínico, cardioprotector

## Vitaminas asociadas

Vitamin C, Vitamin B6, Manganese

## Compuestos relacionados

Rutin, Isoquercitrin, Kaempferol

## Health registry

Ver `health_registry` arriba — mecanismos moleculares con nivel de evidencia y DOI PubMed.

## Almacenamiento y uso culinario

- **Conservación:** Mantener fuente `cebolla (Allium cepa)` fresca; los compuestos volátiles se degradan con calor excesivo y con el tiempo (ideal moler/ triturar al momento).
- **Técnica GOS:** Triturar o macerar para activar enzimas (aliinasa/mirosinasa) y reposar 10 min antes de calentar cuando aplique.
- **Seguridad:** Dosis culinarias son seguras; extractos concentrados requieren evaluación. Ver `ingredients/` para protocolo científico.
