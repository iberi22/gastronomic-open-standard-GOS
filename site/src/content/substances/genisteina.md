---
name: "Genisteína"
formula: "C15H10O5"
discovery_year: 1899
source_ingredient: "soya (Glycine max)"
benefit: "Fitoestrógeno, anticancer, óseo"
sazon: "Soya neutra beany, isoflavona 0.5-1mg/g soya"
sabor: "Neutro suave, isoflavona glicosilada genistina"
textura: "Isoflavona cristal, isómero apigenina (posición OH)"
vitaminas: ["Iron", "Calcium", "Folate"]
compuestos: ["Daidzein", "Glycitein", "Genistin"]
sources: ["PubMed", "NIH"]
tags: ["soya", "fitoestrogeno", "oseo"]
image: "/gastronomic-open-standard-GOS/images/substances/genisteina.jpg"
image_attribution: "Pixabay — Glycine max"
health_registry:
  - condition: "Postmenopausal osteoporosis"
    mechanism: "Phytoestrogen binds ERβ, inhibits osteoclasts"
    evidence_level: "Medium"
    studies:
      - title: "Genistein and bone health: meta-analysis"
        source: "J Nutr"
        year: 2009
        doi: "10.3945/jn.109.107979"
---

![Genisteína](/gastronomic-open-standard-GOS/images/substances/genisteina.jpg)
*Foto: Pixabay — Glycine max — placeholder real photo path `public/images/substances/genisteina.jpg` (800×600 webp/jpg, atribución en frontmatter).*

## Descripción

5,7-Dihydroxy-3-(4-hydroxyphenyl)chromen-4-one (C15H10O5) aislada en 1899 por Perkin y Newbury de *Genista tinctoria*. Isoflavona de soya; isómero estructural de apigenina (cambia OH de 4' a 5). Fitoestrógeno que une ERβ.

## Sazón / Sabor / Textura

- **Sazón:** Soya neutra beany, isoflavona 0.5-1mg/g soya
- **Sabor:** Neutro suave, isoflavona glicosilada genistina
- **Textura:** Isoflavona cristal, isómero apigenina (posición OH)

Usado en GOS como nodo `substance` conectado a ingredientes vía `active_compounds` y a afecciones vía `health_registry`. Ver grafo filtrado: `/graph?filter=substance:genisteina`.

## Beneficio principal

> Fitoestrógeno, anticancer, óseo

## Vitaminas asociadas

Iron, Calcium, Folate

## Compuestos relacionados

Daidzein, Glycitein, Genistin

## Health registry

Ver `health_registry` arriba — mecanismos moleculares con nivel de evidencia y DOI PubMed.

## Almacenamiento y uso culinario

- **Conservación:** Mantener fuente `soya (Glycine max)` fresca; los compuestos volátiles se degradan con calor excesivo y con el tiempo (ideal moler/ triturar al momento).
- **Técnica GOS:** Triturar o macerar para activar enzimas (aliinasa/mirosinasa) y reposar 10 min antes de calentar cuando aplique.
- **Seguridad:** Dosis culinarias son seguras; extractos concentrados requieren evaluación. Ver `ingredients/` para protocolo científico.
