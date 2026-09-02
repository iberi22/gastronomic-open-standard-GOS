---
name: "Cafeína"
formula: "C8H10N4O2"
discovery_year: 1819
source_ingredient: "café (Coffea arabica)"
benefit: "Estimulante, termogénico, neuroprotector"
sazon: "Amarga estimulante, base tinto colombiano"
sabor: "Amarga intensa, soluble agua caliente, bloquea adenosina"
textura: "Alcaloide cristal blanco inodoro, sublimable"
vitaminas: ["Potassium", "Magnesium", "Vitamin B3"]
compuestos: ["Theobromine", "Theophylline", "Chlorogenic acid"]
sources: ["PubMed", "NIH"]
tags: ["estimulante", "cafe", "neuroprotector"]
image: "/gastronomic-open-standard-GOS/images/substances/cafeina.jpg"
image_attribution: "Pixabay — Coffea arabica"
health_registry:
  - condition: "Fatigue / Alertness"
    mechanism: "Adenosine A1/A2A receptor antagonism"
    evidence_level: "High"
    studies:
      - title: "Caffeine and cognitive performance meta-analysis"
        source: "Psychopharmacology"
        year: 2010
        doi: "10.1007/s00213-010-1900-8"
---

![Cafeína](/gastronomic-open-standard-GOS/images/substances/cafeina.jpg)
*Foto: Pixabay — Coffea arabica — placeholder real photo path `public/images/substances/cafeina.jpg` (800×600 webp/jpg, atribución en frontmatter).*

## Descripción

1,3,7-Trimethylxanthine (C8H10N4O2) aislada en 1819 por Friedlieb Ferdinand Runge. Alcaloide purínico del café (1-2%); antagonista adenosina que aumenta dopamina y adrenalina. Dosis colombiana típica 80-120mg por tinto.

## Sazón / Sabor / Textura

- **Sazón:** Amarga estimulante, base tinto colombiano
- **Sabor:** Amarga intensa, soluble agua caliente, bloquea adenosina
- **Textura:** Alcaloide cristal blanco inodoro, sublimable

Usado en GOS como nodo `substance` conectado a ingredientes vía `active_compounds` y a afecciones vía `health_registry`. Ver grafo filtrado: `/graph?filter=substance:cafeina`.

## Beneficio principal

> Estimulante, termogénico, neuroprotector

## Vitaminas asociadas

Potassium, Magnesium, Vitamin B3

## Compuestos relacionados

Theobromine, Theophylline, Chlorogenic acid

## Health registry

Ver `health_registry` arriba — mecanismos moleculares con nivel de evidencia y DOI PubMed.

## Almacenamiento y uso culinario

- **Conservación:** Mantener fuente `café (Coffea arabica)` fresca; los compuestos volátiles se degradan con calor excesivo y con el tiempo (ideal moler/ triturar al momento).
- **Técnica GOS:** Triturar o macerar para activar enzimas (aliinasa/mirosinasa) y reposar 10 min antes de calentar cuando aplique.
- **Seguridad:** Dosis culinarias son seguras; extractos concentrados requieren evaluación. Ver `ingredients/` para protocolo científico.
