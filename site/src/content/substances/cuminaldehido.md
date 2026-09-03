---
name: "Cuminaldehído"
formula: "C10H12O"
discovery_year: 1837
source_ingredient: "comino (Cuminum cyminum)"
benefit: "Digestivo, carminativo, antimicrobiano"
sazon: "Térreo cálido cuminoso, firma empanadas y frijoles"
sabor: "Cálido térreo con nota cítrica dulce, volátil se pierde con cocción larga"
textura: "Aldehído aromático volátil oleoso, destila en aceites esenciales 25-35%"
vitaminas: ["Iron", "Manganese", "Magnesium"]
compuestos: ["Cuminalcohol", "Cymene", "Gamma-terpinene"]
sources: ["PubMed", "NIH"]
tags: ["digestivo", "sazon", "empanadas"]
image_attribution: "Pixabay — Cuminum cyminum seeds"
health_registry:
  - condition: "Dyspepsia / Bloating"
    mechanism: "Increases amylase, protease, lipase activity"
    evidence_level: "High"
    studies:
      - title: "Cumin and digestive enzyme stimulation"
        source: "Nutrition Research"
        year: 1999
        doi: "10.1016/S0271-5317(99)00031-1"
  - condition: "Irritable bowel"
    mechanism: "Carminative and spasmolytic"
    evidence_level: "Medium"
    studies:
      - title: "Cumin extract and IBS symptoms: pilot"
        source: "Middle East J Dig Dis"
        year: 2013
        doi: "10.17795/middleeastjdd-12123"
---

![Cuminaldehído](/images/substances/cuminaldehido.jpg)
*Foto: Pixabay — Cuminum cyminum seeds — placeholder real photo path `public/images/substances/cuminaldehido.jpg` (800×600 webp/jpg, atribución en frontmatter).*

## Descripción

4-Isopropylbenzaldehyde (C10H12O), principal aldehído del aceite esencial de comino (25-35%), descrito en 1837. Responsable del aroma térreo-cálido característico de la cocina andina y caribe. Potente carminativo que estimula enzimas digestivas.

## Sazón / Sabor / Textura

- **Sazón:** Térreo cálido cuminoso, firma empanadas y frijoles
- **Sabor:** Cálido térreo con nota cítrica dulce, volátil se pierde con cocción larga
- **Textura:** Aldehído aromático volátil oleoso, destila en aceites esenciales 25-35%

Usado en GOS como nodo `substance` conectado a ingredientes vía `active_compounds` y a afecciones vía `health_registry`. Ver grafo filtrado: `/graph?filter=substance:cuminaldehido`.

## Beneficio principal

> Digestivo, carminativo, antimicrobiano

## Vitaminas asociadas

Iron, Manganese, Magnesium

## Compuestos relacionados

Cuminalcohol, Cymene, Gamma-terpinene

## Health registry

Ver `health_registry` arriba — mecanismos moleculares con nivel de evidencia y DOI PubMed.

## Almacenamiento y uso culinario

- **Conservación:** Mantener fuente `comino (Cuminum cyminum)` fresca; los compuestos volátiles se degradan con calor excesivo y con el tiempo (ideal moler/ triturar al momento).
- **Técnica GOS:** Triturar o macerar para activar enzimas (aliinasa/mirosinasa) y reposar 10 min antes de calentar cuando aplique.
- **Seguridad:** Dosis culinarias son seguras; extractos concentrados requieren evaluación. Ver `ingredients/` para protocolo científico.
