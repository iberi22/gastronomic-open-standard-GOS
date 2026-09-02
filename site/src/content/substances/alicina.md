---
name: "Alicina"
formula: "C6H10OS2"
discovery_year: 1944
source_ingredient: "ajo (Allium sativum)"
benefit: "Antimicrobiano, hipotensor, antiinflamatorio"
sazon: "Pungente sulfuroso, base para adobos"
sabor: "Picante umami, se degrada con calor (>70°C pierde alicina)"
textura: "Inestable, se forma al triturar, reposar 10min antes de cocinar"
vitaminas: ["Vitamin B6", "Vitamin C", "Selenium"]
compuestos: ["S-allylcysteine", "Ajoene"]
sources: ["NIH", "PubMed"]
tags: ["sazon", "antihipertensivo", "antimicrobiano"]
image: "/images/substances/alicina.jpg"
image_attribution: "Wikimedia Commons / Pixabay — Allium sativum"
health_registry:
  - condition: "Hypertension"
    mechanism: "NO synthase vasodilation"
    evidence_level: "High"
    studies:
      - title: "Garlic for hypertension: A systematic review and meta-analysis"
        source: "BMC Cardiovascular Disorders"
        year: 2008
        doi: "10.1186/1471-2261-8-13"
  - condition: "Hyperlipidemia"
    mechanism: "Inhibits HMG-CoA reductase, lowers LDL"
    evidence_level: "Medium"
    studies:
      - title: "Garlic and serum lipids: A meta-analysis"
        source: "J. R. Coll. Physicians"
        year: 1993
        doi: "10.1111/j.1365-2796.1993.tb00630.x"
---

![Alicina](/images/substances/alicina.jpg)
*Foto: Wikimedia Commons / Pixabay — Allium sativum — placeholder real photo path `public/images/substances/alicina.jpg` (800×600 webp/jpg, atribución en frontmatter).*

## Descripción

Principal bioactivo del ajo, descubierto en 1944 por Chester J. Cavallito y John Hays Bailey al triturar dientes de *Allium sativum*. La alicina (diallyl thiosulfinate) es un tiosulfinato inestable que se genera enzimáticamente (aliinasa + aliina) y explica el aroma pungente sulfuroso del ajo recién machacado.

## Sazón / Sabor / Textura

- **Sazón:** Pungente sulfuroso, base para adobos
- **Sabor:** Picante umami, se degrada con calor (>70°C pierde alicina)
- **Textura:** Inestable, se forma al triturar, reposar 10min antes de cocinar

Usado en GOS como nodo `substance` conectado a ingredientes vía `active_compounds` y a afecciones vía `health_registry`. Ver grafo filtrado: `/graph?filter=substance:alicina`.

## Beneficio principal

> Antimicrobiano, hipotensor, antiinflamatorio

## Vitaminas asociadas

Vitamin B6, Vitamin C, Selenium

## Compuestos relacionados

S-allylcysteine, Ajoene

## Health registry

Ver `health_registry` arriba — mecanismos moleculares con nivel de evidencia y DOI PubMed.

## Almacenamiento y uso culinario

- **Conservación:** Mantener fuente `ajo (Allium sativum)` fresca; los compuestos volátiles se degradan con calor excesivo y con el tiempo (ideal moler/ triturar al momento).
- **Técnica GOS:** Triturar o macerar para activar enzimas (aliinasa/mirosinasa) y reposar 10 min antes de calentar cuando aplique.
- **Seguridad:** Dosis culinarias son seguras; extractos concentrados requieren evaluación. Ver `ingredients/` para protocolo científico.
