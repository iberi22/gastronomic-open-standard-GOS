---
name: "Betaína"
formula: "C5H11NO2"
discovery_year: 1866
source_ingredient: "remolacha (Beta vulgaris)"
benefit: "Osmolito, metilador, hepato-protector"
sazon: "Remolacha dulce térrea, base ensaladas y jugos"
sabor: "Dulce térreo suave, N-trimetilglicina, osmoprotector"
textura: "Aminoácido cristal, betaína anhidra estable"
vitaminas: ["Folate", "Manganese", "Potassium"]
compuestos: ["Choline", "Glycine", "Betaine aldehyde"]
sources: ["PubMed", "NIH"]
tags: ["remolacha", "osmolito", "hepatico"]
image: "/images/substances/betaina.jpg"
image_attribution: "Pixabay — Beta vulgaris"
health_registry:
  - condition: "NAFLD / Fatty liver"
    mechanism: "Methyl donor, homocysteine→methionine, lipotropic"
    evidence_level: "Medium"
    studies:
      - title: "Betaine and fatty liver: review"
        source: "Nutrients"
        year: 2021
        doi: "10.3390/nu13041280"
---

![Betaína](/images/substances/betaina.jpg)
*Foto: Pixabay — Beta vulgaris — placeholder real photo path `public/images/substances/betaina.jpg` (800×600 webp/jpg, atribución en frontmatter).*

## Descripción

N,N,N-trimethylglycine (C5H11NO2) descubierta en 1866 por Scheibler en remolacha azucarera (*Beta vulgaris*). Osmolito y donador metilo: convierte homocisteína en metionina. Lipotrópico hepático demostrado.

## Sazón / Sabor / Textura

- **Sazón:** Remolacha dulce térrea, base ensaladas y jugos
- **Sabor:** Dulce térreo suave, N-trimetilglicina, osmoprotector
- **Textura:** Aminoácido cristal, betaína anhidra estable

Usado en GOS como nodo `substance` conectado a ingredientes vía `active_compounds` y a afecciones vía `health_registry`. Ver grafo filtrado: `/graph?filter=substance:betaina`.

## Beneficio principal

> Osmolito, metilador, hepato-protector

## Vitaminas asociadas

Folate, Manganese, Potassium

## Compuestos relacionados

Choline, Glycine, Betaine aldehyde

## Health registry

Ver `health_registry` arriba — mecanismos moleculares con nivel de evidencia y DOI PubMed.

## Almacenamiento y uso culinario

- **Conservación:** Mantener fuente `remolacha (Beta vulgaris)` fresca; los compuestos volátiles se degradan con calor excesivo y con el tiempo (ideal moler/ triturar al momento).
- **Técnica GOS:** Triturar o macerar para activar enzimas (aliinasa/mirosinasa) y reposar 10 min antes de calentar cuando aplique.
- **Seguridad:** Dosis culinarias son seguras; extractos concentrados requieren evaluación. Ver `ingredients/` para protocolo científico.
