---
name: "Mentol"
formula: "C10H20O"
discovery_year: 1771
source_ingredient: "menta/yerbabuena (Mentha piperita)"
benefit: "Refrescante, analgésico tópico, descongestionante"
sazon: "Menta fresca helada, base mojito y chupetas"
sabor: "Fresco helado activa TRPM8 (frío), dulzor mentolado"
textura: "Monoterpeno cristalino, sublimable, 30-55% aceite menta"
vitaminas: ["Vitamin A", "Iron", "Manganese"]
compuestos: ["Menthone", "Menthofuran", "Limonene"]
sources: ["PubMed", "NIH"]
tags: ["refrescante", "menta", "analgesico"]
image: "/gastronomic-open-standard-GOS/images/substances/mentol.jpg"
image_attribution: "Pixabay — Mentha piperita"
health_registry:
  - condition: "IBS pain"
    mechanism: "TRPM8 activation, Ca2+ channel blockade, antispasmodic"
    evidence_level: "High"
    studies:
      - title: "Peppermint oil and IBS: meta-analysis"
        source: "J Clin Gastroenterol"
        year: 2014
        doi: "10.1097/MCG.0000000000000043"
---

![Mentol](/gastronomic-open-standard-GOS/images/substances/mentol.jpg)
*Foto: Pixabay — Mentha piperita — placeholder real photo path `public/images/substances/mentol.jpg` (800×600 webp/jpg, atribución en frontmatter).*

## Descripción

(-)-Menthol (C10H20O) aislado en 1771 por Hieronymus David Gaubius y estructura por Oppenheim 1862. Monoterpeno que activa TRPM8 (frío): sensación helada sin bajar temperatura. 30-55% aceite menta piperita.

## Sazón / Sabor / Textura

- **Sazón:** Menta fresca helada, base mojito y chupetas
- **Sabor:** Fresco helado activa TRPM8 (frío), dulzor mentolado
- **Textura:** Monoterpeno cristalino, sublimable, 30-55% aceite menta

Usado en GOS como nodo `substance` conectado a ingredientes vía `active_compounds` y a afecciones vía `health_registry`. Ver grafo filtrado: `/graph?filter=substance:mentol`.

## Beneficio principal

> Refrescante, analgésico tópico, descongestionante

## Vitaminas asociadas

Vitamin A, Iron, Manganese

## Compuestos relacionados

Menthone, Menthofuran, Limonene

## Health registry

Ver `health_registry` arriba — mecanismos moleculares con nivel de evidencia y DOI PubMed.

## Almacenamiento y uso culinario

- **Conservación:** Mantener fuente `menta/yerbabuena (Mentha piperita)` fresca; los compuestos volátiles se degradan con calor excesivo y con el tiempo (ideal moler/ triturar al momento).
- **Técnica GOS:** Triturar o macerar para activar enzimas (aliinasa/mirosinasa) y reposar 10 min antes de calentar cuando aplique.
- **Seguridad:** Dosis culinarias son seguras; extractos concentrados requieren evaluación. Ver `ingredients/` para protocolo científico.
