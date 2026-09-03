---
name: "Gingerol"
formula: "C17H26O4"
discovery_year: 1879
source_ingredient: "jengibre (Zingiber officinale)"
benefit: "Antiemético, antiinflamatorio, digestivo"
sazon: "Picante cítrico, base salteados y tés"
sabor: "Pungente fresco cítrico, se convierte en shogaol picante al secar/calentar"
textura: "Oleoresina viscosa, soluble en alcohol y aceite, cristal estable"
vitaminas: ["Vitamin B6", "Vitamin C", "Magnesium"]
compuestos: ["6-Shogaol", "Zingerone", "Paradol"]
sources: ["PubMed", "NIH"]
tags: ["antiemetico", "antiinflamatorio", "digestivo"]
image_attribution: "Pixabay — Zingiber officinale"
health_registry:
  - condition: "Nausea / Motion sickness"
    mechanism: "5-HT3 receptor antagonism in gut"
    evidence_level: "High"
    studies:
      - title: "Efficacy of ginger for nausea and vomiting: systematic review"
        source: "British Journal of Anaesthesia"
        year: 2000
        doi: "10.1093/bja/84.3.367"
  - condition: "Inflammation"
    mechanism: "COX-2 inhibition similar to NSAIDs"
    evidence_level: "Medium"
    studies:
      - title: "Gingerol and shogaol anti-inflammatory mechanisms"
        source: "Int J Food Sci Nutr"
        year: 2016
        doi: "10.1080/09637486.2016.1244665"
---

![Gingerol](/images/substances/gingerol.jpg)
*Foto: Pixabay — Zingiber officinale — placeholder real photo path `public/images/substances/gingerol.jpg` (800×600 webp/jpg, atribución en frontmatter).*

## Descripción

[6]-Gingerol (C17H26O4), aislado en 1879 por Thresh del rizoma de jengibre. Es el principal gingerolide picante; al deshidratarse o cocinar se convierte en 6-shogaol (doble pungencia) y zingerona (dulce). Responsable del aroma fresco cítrico-pungente y del efecto antiemético validado para embarazo y mareo.

## Sazón / Sabor / Textura

- **Sazón:** Picante cítrico, base salteados y tés
- **Sabor:** Pungente fresco cítrico, se convierte en shogaol picante al secar/calentar
- **Textura:** Oleoresina viscosa, soluble en alcohol y aceite, cristal estable

Usado en GOS como nodo `substance` conectado a ingredientes vía `active_compounds` y a afecciones vía `health_registry`. Ver grafo filtrado: `/graph?filter=substance:gingerol`.

## Beneficio principal

> Antiemético, antiinflamatorio, digestivo

## Vitaminas asociadas

Vitamin B6, Vitamin C, Magnesium

## Compuestos relacionados

6-Shogaol, Zingerone, Paradol

## Health registry

Ver `health_registry` arriba — mecanismos moleculares con nivel de evidencia y DOI PubMed.

## Almacenamiento y uso culinario

- **Conservación:** Mantener fuente `jengibre (Zingiber officinale)` fresca; los compuestos volátiles se degradan con calor excesivo y con el tiempo (ideal moler/ triturar al momento).
- **Técnica GOS:** Triturar o macerar para activar enzimas (aliinasa/mirosinasa) y reposar 10 min antes de calentar cuando aplique.
- **Seguridad:** Dosis culinarias son seguras; extractos concentrados requieren evaluación. Ver `ingredients/` para protocolo científico.
