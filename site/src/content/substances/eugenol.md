---
name: "Eugenol"
formula: "C10H12O2"
discovery_year: 1858
source_ingredient: "clavo de olor (Syzygium aromaticum)"
benefit: "Analgésico dental, antiséptico, antiinflamatorio"
sazon: "Clavo especiado cálido, anestesia lingual leve, base natilla y jamón"
sabor: "Dulce picante alcanforado, anestésico local inmediato"
textura: "Fenilpropeno oleoso viscoso, eugenol 72-90% del aceite esencial"
vitaminas: ["Vitamin K", "Manganese", "Iron"]
compuestos: ["Isoeugenol", "Methyleugenol", "Caryophyllene"]
sources: ["NIH", "PubMed"]
tags: ["analgesico", "especiado", "antiseptico"]
image: "/gastronomic-open-standard-GOS/images/substances/eugenol.jpg"
image_attribution: "Pixabay — Syzygium aromaticum"
health_registry:
  - condition: "Dental pain"
    mechanism: "TRPV1 blockade and local anesthetic (Na+ channel)"
    evidence_level: "High"
    studies:
      - title: "Eugenol in dentistry: review"
        source: "J Dent"
        year: 2015
        doi: "10.1016/j.jdent.2015.03.010"
  - condition: "Inflammation"
    mechanism: "COX-2 and 5-LOX inhibition"
    evidence_level: "Medium"
    studies:
      - title: "Eugenol anti-inflammatory review"
        source: "Phytother Res"
        year: 2012
        doi: "10.1002/ptr.3711"
---

![Eugenol](/gastronomic-open-standard-GOS/images/substances/eugenol.jpg)
*Foto: Pixabay — Syzygium aromaticum — placeholder real photo path `public/images/substances/eugenol.jpg` (800×600 webp/jpg, atribución en frontmatter).*

## Descripción

4-Allyl-2-methoxyphenol (C10H12O2) aislado y caracterizado en 1858 por Frank R. Bonastre, estructura por Erlenmeyer. Constituye 72-90% del aceite de clavo. Anestésico dental clásico: la Unión Europea lo regula como flavoring; aroma especiado que adormece lengua.

## Sazón / Sabor / Textura

- **Sazón:** Clavo especiado cálido, anestesia lingual leve, base natilla y jamón
- **Sabor:** Dulce picante alcanforado, anestésico local inmediato
- **Textura:** Fenilpropeno oleoso viscoso, eugenol 72-90% del aceite esencial

Usado en GOS como nodo `substance` conectado a ingredientes vía `active_compounds` y a afecciones vía `health_registry`. Ver grafo filtrado: `/graph?filter=substance:eugenol`.

## Beneficio principal

> Analgésico dental, antiséptico, antiinflamatorio

## Vitaminas asociadas

Vitamin K, Manganese, Iron

## Compuestos relacionados

Isoeugenol, Methyleugenol, Caryophyllene

## Health registry

Ver `health_registry` arriba — mecanismos moleculares con nivel de evidencia y DOI PubMed.

## Almacenamiento y uso culinario

- **Conservación:** Mantener fuente `clavo de olor (Syzygium aromaticum)` fresca; los compuestos volátiles se degradan con calor excesivo y con el tiempo (ideal moler/ triturar al momento).
- **Técnica GOS:** Triturar o macerar para activar enzimas (aliinasa/mirosinasa) y reposar 10 min antes de calentar cuando aplique.
- **Seguridad:** Dosis culinarias son seguras; extractos concentrados requieren evaluación. Ver `ingredients/` para protocolo científico.
