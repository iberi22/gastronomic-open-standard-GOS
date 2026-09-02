---
name: "Vanilina"
formula: "C8H8O3"
discovery_year: 1858
source_ingredient: "vainilla (Vanilla planifolia)"
benefit: "Aroma, ansiolítico suave, antioxidante"
sazon: "Vainilla dulce balsámica, base postres y arequipe"
sabor: "Dulce balsámica cremosa, 2% vainilla curada"
textura: "Aldehído fenólico cristal, vanillina 2% peso seco"
vitaminas: ["Manganese", "Magnesium", "Potassium"]
compuestos: ["Vanillic acid", "Vanillyl alcohol", "Ethylvanillin"]
sources: ["PubMed", "NIH"]
tags: ["vainilla", "dulce", "aroma"]
image: "/images/substances/vanilina.jpg"
image_attribution: "Pixabay — Vanilla planifolia"
health_registry:
  - condition: "Anxiety / Appetite"
    mechanism: "Olfactory GABA potentiation"
    evidence_level: "Low"
    studies:
      - title: "Vanillin aroma and mood: pilot"
        source: "Appetite"
        year: 2014
        doi: "10.1016/j.appet.2014.03.010"
---

![Vanilina](/images/substances/vanilina.jpg)
*Foto: Pixabay — Vanilla planifolia — placeholder real photo path `public/images/substances/vanilina.jpg` (800×600 webp/jpg, atribución en frontmatter).*

## Descripción

4-Hydroxy-3-methoxybenzaldehyde (C8H8O3) aislada en 1858 por Gobley y sintetizada en 1874 por Reimer/Tiemann. Aldehído fenólico 2% de vaina curada; aroma vainilla. Base postres.

## Sazón / Sabor / Textura

- **Sazón:** Vainilla dulce balsámica, base postres y arequipe
- **Sabor:** Dulce balsámica cremosa, 2% vainilla curada
- **Textura:** Aldehído fenólico cristal, vanillina 2% peso seco

Usado en GOS como nodo `substance` conectado a ingredientes vía `active_compounds` y a afecciones vía `health_registry`. Ver grafo filtrado: `/graph?filter=substance:vanilina`.

## Beneficio principal

> Aroma, ansiolítico suave, antioxidante

## Vitaminas asociadas

Manganese, Magnesium, Potassium

## Compuestos relacionados

Vanillic acid, Vanillyl alcohol, Ethylvanillin

## Health registry

Ver `health_registry` arriba — mecanismos moleculares con nivel de evidencia y DOI PubMed.

## Almacenamiento y uso culinario

- **Conservación:** Mantener fuente `vainilla (Vanilla planifolia)` fresca; los compuestos volátiles se degradan con calor excesivo y con el tiempo (ideal moler/ triturar al momento).
- **Técnica GOS:** Triturar o macerar para activar enzimas (aliinasa/mirosinasa) y reposar 10 min antes de calentar cuando aplique.
- **Seguridad:** Dosis culinarias son seguras; extractos concentrados requieren evaluación. Ver `ingredients/` para protocolo científico.
