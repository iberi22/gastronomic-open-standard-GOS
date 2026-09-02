---
name: "Curcumina"
formula: "C21H20O6"
discovery_year: 1815
source_ingredient: "cúrcuma (Curcuma longa)"
benefit: "Antiinflamatorio, antioxidante, neuroprotector"
sazon: "Terrosa amarga, color amarillo intenso, base curry"
sabor: "Amarga terrosa con nota pimienta, necesita pimienta negra (piperina) para biodisponibilidad"
textura: "Polvo lipofílico, soluble en aceite, mancha permanente"
vitaminas: ["Vitamin C", "Vitamin E", "Manganese"]
compuestos: ["Demethoxycurcumin", "Bisdemethoxycurcumin", "Turmerone"]
sources: ["NIH", "PubMed"]
tags: ["antiinflamatorio", "antioxidante", "curry"]
image: "/gastronomic-open-standard-GOS/images/substances/curcumina.jpg"
image_attribution: "Pixabay — Curcuma longa rhizome"
health_registry:
  - condition: "Inflammation / Arthritis"
    mechanism: "NF-kB and COX-2 inhibition"
    evidence_level: "High"
    studies:
      - title: "Curcumin and inflammation: systematic review"
        source: "J Med Food"
        year: 2021
        doi: "10.1089/jmf.2020.0078"
  - condition: "Alzheimer / Cognitive decline"
    mechanism: "Amyloid aggregation inhibition, antioxidant"
    evidence_level: "Medium"
    studies:
      - title: "Curcumin in Alzheimer's disease: review"
        source: "Int J Mol Sci"
        year: 2019
        doi: "10.3390/ijms20030492"
---

![Curcumina](/gastronomic-open-standard-GOS/images/substances/curcumina.jpg)
*Foto: Pixabay — Curcuma longa rhizome — placeholder real photo path `public/images/substances/curcumina.jpg` (800×600 webp/jpg, atribución en frontmatter).*

## Descripción

Diferuloilmetano, pigmento amarillo de la cúrcuma aislado en 1815 por Vogel y Pelletier, estructura elucidada en 1910 por Lampe y Milobedzka (C21H20O6). Polifenol lipofílico con baja biodisponibilidad que aumenta 2000% con piperina. Base del curry y medicina ayurvédica.

## Sazón / Sabor / Textura

- **Sazón:** Terrosa amarga, color amarillo intenso, base curry
- **Sabor:** Amarga terrosa con nota pimienta, necesita pimienta negra (piperina) para biodisponibilidad
- **Textura:** Polvo lipofílico, soluble en aceite, mancha permanente

Usado en GOS como nodo `substance` conectado a ingredientes vía `active_compounds` y a afecciones vía `health_registry`. Ver grafo filtrado: `/graph?filter=substance:curcumina`.

## Beneficio principal

> Antiinflamatorio, antioxidante, neuroprotector

## Vitaminas asociadas

Vitamin C, Vitamin E, Manganese

## Compuestos relacionados

Demethoxycurcumin, Bisdemethoxycurcumin, Turmerone

## Health registry

Ver `health_registry` arriba — mecanismos moleculares con nivel de evidencia y DOI PubMed.

## Almacenamiento y uso culinario

- **Conservación:** Mantener fuente `cúrcuma (Curcuma longa)` fresca; los compuestos volátiles se degradan con calor excesivo y con el tiempo (ideal moler/ triturar al momento).
- **Técnica GOS:** Triturar o macerar para activar enzimas (aliinasa/mirosinasa) y reposar 10 min antes de calentar cuando aplique.
- **Seguridad:** Dosis culinarias son seguras; extractos concentrados requieren evaluación. Ver `ingredients/` para protocolo científico.
