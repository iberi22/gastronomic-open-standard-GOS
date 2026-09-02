---
name: "Oleocanthal"
formula: "C17H20O5"
discovery_year: 1992
source_ingredient: "aceite de oliva (Olea europaea)"
benefit: "Antiinflamatorio ibuprofeno-like, neuroprotector"
sazon: "Oliva pungente garganta, picor que raspa garganta"
sabor: "Pungente garganta tipo ibuprofeno, activa TRPA1 garganta"
textura: "Secoiridoide dialdehído, 0.2-0.9mg/mL aceite extra virgen"
vitaminas: ["Vitamin E", "Vitamin K", "Polyphenols"]
compuestos: ["Oleuropein", "Hydroxytyrosol", "Oleacein"]
sources: ["PubMed", "NIH"]
tags: ["oliva", "ibuprofeno", "mediterraneo"]
image: "/gastronomic-open-standard-GOS/images/substances/oleocanthal.jpg"
image_attribution: "Pixabay — Olea europaea"
health_registry:
  - condition: "Alzheimer / Inflammation"
    mechanism: "COX-1/COX-2 inhibition (ibuprofen-like), tau anti-aggregation"
    evidence_level: "Medium"
    studies:
      - title: "Oleocanthal and COX inhibition"
        source: "Nature"
        year: 2005
        doi: "10.1038/437045a"
---

![Oleocanthal](/gastronomic-open-standard-GOS/images/substances/oleocanthal.jpg)
*Foto: Pixabay — Olea europaea — placeholder real photo path `public/images/substances/oleocanthal.jpg` (800×600 webp/jpg, atribución en frontmatter).*

## Descripción

Dialdehído secoiridoide (C17H20O5) aislado en 1992 por Montedoro y asociado en 2005 por Beauchamp (Nature) a picor garganta idéntico a ibuprofeno. Inhibe COX como ibuprofeno; marcador aceite oliva extra virgen de calidad.

## Sazón / Sabor / Textura

- **Sazón:** Oliva pungente garganta, picor que raspa garganta
- **Sabor:** Pungente garganta tipo ibuprofeno, activa TRPA1 garganta
- **Textura:** Secoiridoide dialdehído, 0.2-0.9mg/mL aceite extra virgen

Usado en GOS como nodo `substance` conectado a ingredientes vía `active_compounds` y a afecciones vía `health_registry`. Ver grafo filtrado: `/graph?filter=substance:oleocanthal`.

## Beneficio principal

> Antiinflamatorio ibuprofeno-like, neuroprotector

## Vitaminas asociadas

Vitamin E, Vitamin K, Polyphenols

## Compuestos relacionados

Oleuropein, Hydroxytyrosol, Oleacein

## Health registry

Ver `health_registry` arriba — mecanismos moleculares con nivel de evidencia y DOI PubMed.

## Almacenamiento y uso culinario

- **Conservación:** Mantener fuente `aceite de oliva (Olea europaea)` fresca; los compuestos volátiles se degradan con calor excesivo y con el tiempo (ideal moler/ triturar al momento).
- **Técnica GOS:** Triturar o macerar para activar enzimas (aliinasa/mirosinasa) y reposar 10 min antes de calentar cuando aplique.
- **Seguridad:** Dosis culinarias son seguras; extractos concentrados requieren evaluación. Ver `ingredients/` para protocolo científico.
