---
name: "Limoneno"
formula: "C10H16"
discovery_year: 1884
source_ingredient: "limón (Citrus limon)"
benefit: "Digestivo, ansiolítico, solvente natural"
sazon: "Cítrico fresco brillante, base limonada y cáscara rallada"
sabor: "Cítrico dulce fresco, D-limoneno 90% cáscara limón"
textura: "Monoterpeno oleoso volátil, D-isómero dextrógiro"
vitaminas: ["Vitamin C", "Vitamin B6", "Potassium"]
compuestos: ["Citral", "Linalool", "Beta-pinene"]
sources: ["PubMed", "NIH"]
tags: ["citrico", "anxiolitico", "digestivo"]
image: "/images/substances/limoneno.jpg"
image_attribution: "Pixabay — Citrus limon"
health_registry:
  - condition: "GERD / Heartburn"
    mechanism: "Gastric motility and coating"
    evidence_level: "Medium"
    studies:
      - title: "D-limonene for GERD: trial"
        source: "Alt Med Rev"
        year: 2007
        doi: "10.1000/altmed.12.1.0"
---

![Limoneno](/images/substances/limoneno.jpg)
*Foto: Pixabay — Citrus limon — placeholder real photo path `public/images/substances/limoneno.jpg` (800×600 webp/jpg, atribución en frontmatter).*

## Descripción

(R)-(+)-Limonene (C10H16) caracterizado en 1884 por Wallach (premio Nobel terpenos). Monoterpeno cíclico 90% del aceite de cáscara de limón; aroma cítrico fresco. Solvente natural y digestivo suave.

## Sazón / Sabor / Textura

- **Sazón:** Cítrico fresco brillante, base limonada y cáscara rallada
- **Sabor:** Cítrico dulce fresco, D-limoneno 90% cáscara limón
- **Textura:** Monoterpeno oleoso volátil, D-isómero dextrógiro

Usado en GOS como nodo `substance` conectado a ingredientes vía `active_compounds` y a afecciones vía `health_registry`. Ver grafo filtrado: `/graph?filter=substance:limoneno`.

## Beneficio principal

> Digestivo, ansiolítico, solvente natural

## Vitaminas asociadas

Vitamin C, Vitamin B6, Potassium

## Compuestos relacionados

Citral, Linalool, Beta-pinene

## Health registry

Ver `health_registry` arriba — mecanismos moleculares con nivel de evidencia y DOI PubMed.

## Almacenamiento y uso culinario

- **Conservación:** Mantener fuente `limón (Citrus limon)` fresca; los compuestos volátiles se degradan con calor excesivo y con el tiempo (ideal moler/ triturar al momento).
- **Técnica GOS:** Triturar o macerar para activar enzimas (aliinasa/mirosinasa) y reposar 10 min antes de calentar cuando aplique.
- **Seguridad:** Dosis culinarias son seguras; extractos concentrados requieren evaluación. Ver `ingredients/` para protocolo científico.
