---
name: "Sulforafano"
formula: "C6H11NOS2"
discovery_year: 1992
source_ingredient: "brócoli (Brassica oleracea)"
benefit: "Anticancer, detox fase II, antioxidante indirecto"
sazon: "Brécol picante mostaza, activar triturando + reposo 40min"
sabor: "Pungente mostaza leve, isotiocianato volátil, se forma con mirosinasa"
textura: "Isotiocianato oleoso, precursor glucorafanina, inestable al hervir"
vitaminas: ["Vitamin C", "Vitamin K", "Sulfur"]
compuestos: ["Glucoraphanin", "Sulforaphane nitrile", "Iberin"]
sources: ["PubMed", "NIH"]
tags: ["brocoli", "anticancer", "detox"]
image: "/images/substances/sulforafano.jpg"
image_attribution: "Pixabay — Brassica oleracea"
health_registry:
  - condition: "Cancer prevention"
    mechanism: "Nrf2 activation → Phase II detox enzymes (GST, NQO1)"
    evidence_level: "High"
    studies:
      - title: "Sulforaphane and Nrf2 chemoprevention: review"
        source: "Cancer Prev Res"
        year: 2019
        doi: "10.1158/1940-6207.CAPR-19-0010"
---

![Sulforafano](/images/substances/sulforafano.jpg)
*Foto: Pixabay — Brassica oleracea — placeholder real photo path `public/images/substances/sulforafano.jpg` (800×600 webp/jpg, atribución en frontmatter).*

## Descripción

1-Isothiocyanato-4-(methylsulfinyl)butane (C6H11NOS2) aislado en 1992 por Yuesheng Zhang (Johns Hopkins). Isotiocianato del brócoli: inductor Nrf2 más potente de dieta. Precursor glucorafanina + mirosinasa (triturar, reposar 40min, no hervir largo).

## Sazón / Sabor / Textura

- **Sazón:** Brécol picante mostaza, activar triturando + reposo 40min
- **Sabor:** Pungente mostaza leve, isotiocianato volátil, se forma con mirosinasa
- **Textura:** Isotiocianato oleoso, precursor glucorafanina, inestable al hervir

Usado en GOS como nodo `substance` conectado a ingredientes vía `active_compounds` y a afecciones vía `health_registry`. Ver grafo filtrado: `/graph?filter=substance:sulforafano`.

## Beneficio principal

> Anticancer, detox fase II, antioxidante indirecto

## Vitaminas asociadas

Vitamin C, Vitamin K, Sulfur

## Compuestos relacionados

Glucoraphanin, Sulforaphane nitrile, Iberin

## Health registry

Ver `health_registry` arriba — mecanismos moleculares con nivel de evidencia y DOI PubMed.

## Almacenamiento y uso culinario

- **Conservación:** Mantener fuente `brócoli (Brassica oleracea)` fresca; los compuestos volátiles se degradan con calor excesivo y con el tiempo (ideal moler/ triturar al momento).
- **Técnica GOS:** Triturar o macerar para activar enzimas (aliinasa/mirosinasa) y reposar 10 min antes de calentar cuando aplique.
- **Seguridad:** Dosis culinarias son seguras; extractos concentrados requieren evaluación. Ver `ingredients/` para protocolo científico.
