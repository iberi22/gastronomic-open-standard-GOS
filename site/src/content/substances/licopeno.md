---
name: "Licopeno"
formula: "C40H56"
discovery_year: 1873
source_ingredient: "tomate (Solanum lycopersicum)"
benefit: "Antioxidante, cardioprotector, fotoprotector"
sazon: "Base sofritos mediterráneos, potenciado con cocción y aceite"
sabor: "Umami suave dulce, sin picor, biodisponible cocido > crudo"
textura: "Carotenoide lipofílico cristalino rojo, isomeriza con calor (trans→cis)"
vitaminas: ["Vitamin A", "Vitamin C", "Potassium"]
compuestos: ["Phytoene", "Phytofluene", "Beta-carotene"]
sources: ["NIH", "PubMed"]
tags: ["antioxidante", "cardioprotector", "mediterraneo"]
image: "/gastronomic-open-standard-GOS/images/substances/licopeno.jpg"
image_attribution: "Pixabay — Solanum lycopersicum"
health_registry:
  - condition: "Prostate cancer"
    mechanism: "Antioxidant, modulates cell cycle and apoptosis"
    evidence_level: "Medium"
    studies:
      - title: "Tomato and lycopene in prostate cancer prevention"
        source: "Cancer Epidemiol Biomarkers Prev"
        year: 2004
        doi: "10.1158/1055-9965.1503.13.4"
  - condition: "Cardiovascular disease"
    mechanism: "LDL oxidation inhibition"
    evidence_level: "Medium"
    studies:
      - title: "Lycopene and CVD risk: meta-analysis"
        source: "Atherosclerosis"
        year: 2014
        doi: "10.1016/j.atherosclerosis.2014.09.001"
---

![Licopeno](/gastronomic-open-standard-GOS/images/substances/licopeno.jpg)
*Foto: Pixabay — Solanum lycopersicum — placeholder real photo path `public/images/substances/licopeno.jpg` (800×600 webp/jpg, atribución en frontmatter).*

## Descripción

Carotenoide acíclico C40H56 aislado en 1873 por Millardet y estructura elucidada en 1910 por Willstätter y Escher. Pigmento rojo del tomate; biodisponibilidad triplica al cocinar con aceite (isomerización cis). Antioxidante que apaga singlete oxígeno.

## Sazón / Sabor / Textura

- **Sazón:** Base sofritos mediterráneos, potenciado con cocción y aceite
- **Sabor:** Umami suave dulce, sin picor, biodisponible cocido > crudo
- **Textura:** Carotenoide lipofílico cristalino rojo, isomeriza con calor (trans→cis)

Usado en GOS como nodo `substance` conectado a ingredientes vía `active_compounds` y a afecciones vía `health_registry`. Ver grafo filtrado: `/graph?filter=substance:licopeno`.

## Beneficio principal

> Antioxidante, cardioprotector, fotoprotector

## Vitaminas asociadas

Vitamin A, Vitamin C, Potassium

## Compuestos relacionados

Phytoene, Phytofluene, Beta-carotene

## Health registry

Ver `health_registry` arriba — mecanismos moleculares con nivel de evidencia y DOI PubMed.

## Almacenamiento y uso culinario

- **Conservación:** Mantener fuente `tomate (Solanum lycopersicum)` fresca; los compuestos volátiles se degradan con calor excesivo y con el tiempo (ideal moler/ triturar al momento).
- **Técnica GOS:** Triturar o macerar para activar enzimas (aliinasa/mirosinasa) y reposar 10 min antes de calentar cuando aplique.
- **Seguridad:** Dosis culinarias son seguras; extractos concentrados requieren evaluación. Ver `ingredients/` para protocolo científico.
