---
name: "Alil isotiocianato"
formula: "C4H5NS"
discovery_year: 1844
source_ingredient: "mostaza (Brassica nigra)"
benefit: "Anticancer, despeja senos, lacrimógeno"
sazon: "Mostaza pungente nariz-lacrimal, wasabi-like"
sabor: "Pungente nariz que hace llorar, vaporiza, activa TRPA1"
textura: "Isotiocianato alifático volátil, sinigrina + mirosinasa"
vitaminas: ["Selenium", "Magnesium", "Sinigrin"]
compuestos: ["Sinigrin", "Brassic acid", "Allyl cyanide"]
sources: ["PubMed", "NIH"]
tags: ["mostaza", "lacrimogeno", "wasabi"]
image: "/gastronomic-open-standard-GOS/images/substances/alil-isotiocianato.jpg"
image_attribution: "Pixabay — Brassica nigra"
health_registry:
  - condition: "Sinus congestion"
    mechanism: "TRPA1 activation, mucus clearance"
    evidence_level: "Medium"
    studies:
      - title: "Allyl isothiocyanate and airway clearance"
        source: "J Agric Food Chem"
        year: 2010
        doi: "10.1021/jf903822e"
---

![Alil isotiocianato](/gastronomic-open-standard-GOS/images/substances/alil-isotiocianato.jpg)
*Foto: Pixabay — Brassica nigra — placeholder real photo path `public/images/substances/alil-isotiocianato.jpg` (800×600 webp/jpg, atribución en frontmatter).*

## Descripción

Allyl isothiocyanate (C4H5NS) aislado en 1844 por Fritzsche de mostaza negra. Isotiocianato volátil de sinigrina + mirosinasa (triturar). Lacrimógeno TRPA1 igual que wasabi; anticancer Nrf2.

## Sazón / Sabor / Textura

- **Sazón:** Mostaza pungente nariz-lacrimal, wasabi-like
- **Sabor:** Pungente nariz que hace llorar, vaporiza, activa TRPA1
- **Textura:** Isotiocianato alifático volátil, sinigrina + mirosinasa

Usado en GOS como nodo `substance` conectado a ingredientes vía `active_compounds` y a afecciones vía `health_registry`. Ver grafo filtrado: `/graph?filter=substance:alil-isotiocianato`.

## Beneficio principal

> Anticancer, despeja senos, lacrimógeno

## Vitaminas asociadas

Selenium, Magnesium, Sinigrin

## Compuestos relacionados

Sinigrin, Brassic acid, Allyl cyanide

## Health registry

Ver `health_registry` arriba — mecanismos moleculares con nivel de evidencia y DOI PubMed.

## Almacenamiento y uso culinario

- **Conservación:** Mantener fuente `mostaza (Brassica nigra)` fresca; los compuestos volátiles se degradan con calor excesivo y con el tiempo (ideal moler/ triturar al momento).
- **Técnica GOS:** Triturar o macerar para activar enzimas (aliinasa/mirosinasa) y reposar 10 min antes de calentar cuando aplique.
- **Seguridad:** Dosis culinarias son seguras; extractos concentrados requieren evaluación. Ver `ingredients/` para protocolo científico.
