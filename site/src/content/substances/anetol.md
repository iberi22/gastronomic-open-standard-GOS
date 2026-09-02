---
name: "Anetol"
formula: "C10H12O"
discovery_year: 1846
source_ingredient: "anís (Pimpinella anisum)"
benefit: "Digestivo, expectorante, carminativo"
sazon: "Anisado dulce regaliz, base aguardiente y galletas"
sabor: "Dulce licoroso anisado 13x más dulce que azúcar, nota anís estrellado"
textura: "Fenilpropeno cristalino oleoso, 80-90% aceite esencial anís, efecto ouzo blanquecino"
vitaminas: ["Iron", "Manganese", "Calcium"]
compuestos: ["Estragole", "Anisaldehyde", "Linalool"]
sources: ["PubMed", "NIH"]
tags: ["anisado", "digestivo", "dulce"]
image: "/images/substances/anetol.jpg"
image_attribution: "Pixabay — Pimpinella anisum"
health_registry:
  - condition: "Dyspepsia"
    mechanism: "Carminative, relaxes GI smooth muscle"
    evidence_level: "Medium"
    studies:
      - title: "Anise and functional dyspepsia"
        source: "J Ethnopharmacol"
        year: 2010
        doi: "10.1016/j.jep.2010.03.005"
  - condition: "Cough / Bronchitis"
    mechanism: "Expectorant via mucus clearance"
    evidence_level: "Medium"
    studies:
      - title: "Anethole expectorant review"
        source: "Phytother Res"
        year: 2013
        doi: "10.1002/ptr.4990"
---

![Anetol](/images/substances/anetol.jpg)
*Foto: Pixabay — Pimpinella anisum — placeholder real photo path `public/images/substances/anetol.jpg` (800×600 webp/jpg, atribución en frontmatter).*

## Descripción

Trans-anethole (C10H12O) aislado en 1846 por Canors/Cahours. Éter metílico que constituye 80-90% del aceite de anís; responsable del sabor dulce anisado y del efecto blanquecino licorero (ouzo) al añadir agua. Carminativo clásico.

## Sazón / Sabor / Textura

- **Sazón:** Anisado dulce regaliz, base aguardiente y galletas
- **Sabor:** Dulce licoroso anisado 13x más dulce que azúcar, nota anís estrellado
- **Textura:** Fenilpropeno cristalino oleoso, 80-90% aceite esencial anís, efecto ouzo blanquecino

Usado en GOS como nodo `substance` conectado a ingredientes vía `active_compounds` y a afecciones vía `health_registry`. Ver grafo filtrado: `/graph?filter=substance:anetol`.

## Beneficio principal

> Digestivo, expectorante, carminativo

## Vitaminas asociadas

Iron, Manganese, Calcium

## Compuestos relacionados

Estragole, Anisaldehyde, Linalool

## Health registry

Ver `health_registry` arriba — mecanismos moleculares con nivel de evidencia y DOI PubMed.

## Almacenamiento y uso culinario

- **Conservación:** Mantener fuente `anís (Pimpinella anisum)` fresca; los compuestos volátiles se degradan con calor excesivo y con el tiempo (ideal moler/ triturar al momento).
- **Técnica GOS:** Triturar o macerar para activar enzimas (aliinasa/mirosinasa) y reposar 10 min antes de calentar cuando aplique.
- **Seguridad:** Dosis culinarias son seguras; extractos concentrados requieren evaluación. Ver `ingredients/` para protocolo científico.
