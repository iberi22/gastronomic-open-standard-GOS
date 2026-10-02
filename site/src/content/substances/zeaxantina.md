---
name: "Zeaxantina"
disclaimer: true
formula: "C40H56O2"
discovery_year: 1938
source_ingredient: "maíz amarillo (Zea mays)"
benefit: "Fotoprotección macular, antioxidante ocular"
sazon: "Maíz tierno dulce, ají amarillo leche tigre"
sabor: "Neutro dulce suave, dihidroxi-carotenoide amarillo"
textura: "Carotenoide dihidroxilado isómero luteína, macular"
vitaminas: ["Vitamin A", "Vitamin C", "Lutein"]
compuestos: ["Lutein", "Beta-carotene", "Meso-zeaxanthin"]
sources: ["PubMed", "NIH"]
tags: ["maiz", "ocular", "macular"]
image_attribution: "Pixabay — Zea mays"
health_registry:
  - condition: "AMD / Macular degeneration"
    mechanism: "Macular pigment optical density, blue light filter"
    evidence_level: "High"
    studies:
      - title: 'Lutein + Zeaxanthin and Omega-3 Fatty Acids for Age-Related Macular Degeneration'
        source: 'JAMA'
        year: 2013
        doi: '10.1001/jama.2013.4997'
---

![Zeaxantina](/images/substances/zeaxantina.jpg)
*Foto: Pixabay — Zea mays — placeholder real photo path `public/images/substances/zeaxantina.jpg` (800×600 webp/jpg, atribución en frontmatter).*

## Descripción

3,3'-Dihydroxy-β-carotene (C40H56O2) aislada en 1938 por Kuhn y Grundmann del maíz. Carotenoide macular isómero de luteína (doble enlace desplazado). Filtro de luz azul en la retina; se cita el estudio AREDS2 como evidencia de protección frente a AMD (sin fuente verificable en esta carta).

## Sazón / Sabor / Textura

- **Sazón:** Maíz tierno dulce, ají amarillo leche tigre
- **Sabor:** Neutro dulce suave, dihidroxi-carotenoide amarillo
- **Textura:** Carotenoide dihidroxilado isómero luteína, macular

Usado en GOS como nodo `substance` conectado a ingredientes vía `active_compounds` y a afecciones vía `health_registry`. Ver grafo filtrado: `/graph?filter=substance:zeaxantina`.

## Beneficio principal

> Fotoprotección macular, antioxidante ocular

## Vitaminas asociadas

Vitamin A, Vitamin C, Lutein

## Compuestos relacionados

Lutein, Beta-carotene, Meso-zeaxanthin

## Health registry

Ver `health_registry` arriba — mecanismos moleculares con nivel de evidencia y DOI PubMed.

## Almacenamiento y uso culinario

- **Conservación:** Mantener fuente `maíz amarillo (Zea mays)` fresca; los compuestos volátiles se degradan con calor excesivo y con el tiempo (ideal moler/ triturar al momento).
- **Técnica GOS:** Triturar o macerar para activar enzimas (aliinasa/mirosinasa) y reposar 10 min antes de calentar cuando aplique.
- **Seguridad:** Se considera generalmente seguro en dosis culinarias según la evidencia disponible (sin fuente verificada en esta carta); los extractos concentrados requieren evaluación médica. Ver `ingredients/` para protocolo científico.
