---
name: "Dodecenal"
formula: "C12H22O"
discovery_year: 1968
source_ingredient: "cilantro (Coriandrum sativum hojas)"
benefit: "Antibacteriano Salmonella-específico, antifúngico"
sazon: "Cilantro fresco verde jabonoso, firma sancocho"
sabor: "Verde jabonoso cilantro, 9% aceite hoja, OR6A2 genético"
textura: "Aldehído alifático monoinsaturado, trans-2-dodecenal 6-9%"
vitaminas: ["Vitamin K", "Vitamin A", "Vitamin C"]
compuestos: ["Dodecanal", "Decenal", "Linalool"]
sources: ["PubMed", "NIH"]
tags: ["cilantro", "antibacteriano", "salmonella"]
image: "/images/substances/dodecenal.jpg"
image_attribution: "Pixabay — Coriandrum sativum"
health_registry:
  - condition: "Salmonellosis"
    mechanism: "Membrane disruption of Salmonella enterica (2x gentamicina)"
    evidence_level: "Medium"
    studies:
      - title: "Dodecenal kills Salmonella: in vitro"
        source: "J Agric Food Chem"
        year: 2004
        doi: "10.1021/jf0354186"
---

![Dodecenal](/images/substances/dodecenal.jpg)
*Foto: Pixabay — Coriandrum sativum — placeholder real photo path `public/images/substances/dodecenal.jpg` (800×600 webp/jpg, atribución en frontmatter).*

## Descripción

Trans-2-dodecenal (C12H22O) aldehído alifático del cilantro hoja (6-9% aceite), caracterizado en 1960s y actividad anti-Salmonella publicada 2004 (J Agric Food Chem): 2x más potente que gentamicina in vitro. Responsable nota verde jabonosa (gen OR6A2).

## Sazón / Sabor / Textura

- **Sazón:** Cilantro fresco verde jabonoso, firma sancocho
- **Sabor:** Verde jabonoso cilantro, 9% aceite hoja, OR6A2 genético
- **Textura:** Aldehído alifático monoinsaturado, trans-2-dodecenal 6-9%

Usado en GOS como nodo `substance` conectado a ingredientes vía `active_compounds` y a afecciones vía `health_registry`. Ver grafo filtrado: `/graph?filter=substance:dodecenal`.

## Beneficio principal

> Antibacteriano Salmonella-específico, antifúngico

## Vitaminas asociadas

Vitamin K, Vitamin A, Vitamin C

## Compuestos relacionados

Dodecanal, Decenal, Linalool

## Health registry

Ver `health_registry` arriba — mecanismos moleculares con nivel de evidencia y DOI PubMed.

## Almacenamiento y uso culinario

- **Conservación:** Mantener fuente `cilantro (Coriandrum sativum hojas)` fresca; los compuestos volátiles se degradan con calor excesivo y con el tiempo (ideal moler/ triturar al momento).
- **Técnica GOS:** Triturar o macerar para activar enzimas (aliinasa/mirosinasa) y reposar 10 min antes de calentar cuando aplique.
- **Seguridad:** Dosis culinarias son seguras; extractos concentrados requieren evaluación. Ver `ingredients/` para protocolo científico.
