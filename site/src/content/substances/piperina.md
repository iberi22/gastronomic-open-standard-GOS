---
name: "Piperina"
formula: "C17H19NO3"
discovery_year: 1819
source_ingredient: "pimienta negra (Piper nigrum)"
benefit: "Bio potenciador, digestivo, termogénico"
sazon: "Pungencia que pica lengua y nariz, base adobos universales"
sabor: "Picante agudo aromático, activa TRPV1 y TRPA1 simultáneamente"
textura: "Cristal alcaloide amarillento, lipofílico, estable al calor seco"
vitaminas: ["Vitamin K", "Manganese", "Iron"]
compuestos: ["Chavicine", "Piperyline", "Piperettine"]
sources: ["PubMed", "NIH"]
tags: ["potenciador", "picante", "digestivo"]
image: "/gastronomic-open-standard-GOS/images/substances/piperina.jpg"
image_attribution: "Pixabay — Piper nigrum"
health_registry:
  - condition: "Nutrient malabsorption"
    mechanism: "Inhibits drug-metabolizing enzymes (CYP3A4) and P-gp, increases bioavailability"
    evidence_level: "High"
    studies:
      - title: "Piperine: bioenhancer for drug and nutrient absorption"
        source: "J Ayurveda Integr Med"
        year: 2013
        doi: "10.4103/0975-9476.113033"
  - condition: "Inflammation"
    mechanism: "NF-kB suppression, antioxidant"
    evidence_level: "Medium"
    studies:
      - title: "Piperine anti-inflammatory review"
        source: "Inflammation Res"
        year: 2015
        doi: "10.1007/s00011-015-0824-3"
---

![Piperina](/gastronomic-open-standard-GOS/images/substances/piperina.jpg)
*Foto: Pixabay — Piper nigrum — placeholder real photo path `public/images/substances/piperina.jpg` (800×600 webp/jpg, atribución en frontmatter).*

## Descripción

Alcaloide aislado en 1819 por Hans Christian Ørsted (C17H19NO3). Es el responsable del 5-9% del peso de la pimienta negra y de multiplicar hasta 20x la biodisponibilidad de curcumina, fármacos y nutrientes al inhibir CYP3A4. Pungencia inmediata.

## Sazón / Sabor / Textura

- **Sazón:** Pungencia que pica lengua y nariz, base adobos universales
- **Sabor:** Picante agudo aromático, activa TRPV1 y TRPA1 simultáneamente
- **Textura:** Cristal alcaloide amarillento, lipofílico, estable al calor seco

Usado en GOS como nodo `substance` conectado a ingredientes vía `active_compounds` y a afecciones vía `health_registry`. Ver grafo filtrado: `/graph?filter=substance:piperina`.

## Beneficio principal

> Bio potenciador, digestivo, termogénico

## Vitaminas asociadas

Vitamin K, Manganese, Iron

## Compuestos relacionados

Chavicine, Piperyline, Piperettine

## Health registry

Ver `health_registry` arriba — mecanismos moleculares con nivel de evidencia y DOI PubMed.

## Almacenamiento y uso culinario

- **Conservación:** Mantener fuente `pimienta negra (Piper nigrum)` fresca; los compuestos volátiles se degradan con calor excesivo y con el tiempo (ideal moler/ triturar al momento).
- **Técnica GOS:** Triturar o macerar para activar enzimas (aliinasa/mirosinasa) y reposar 10 min antes de calentar cuando aplique.
- **Seguridad:** Dosis culinarias son seguras; extractos concentrados requieren evaluación. Ver `ingredients/` para protocolo científico.
