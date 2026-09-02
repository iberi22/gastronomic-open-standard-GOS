---
name: "Capsaicina"
formula: "C18H27NO3"
discovery_year: 1816
source_ingredient: "ají picante (Capsicum annuum)"
benefit: "Analgésico, termogénico, antiinflamatorio"
sazon: "Pungencia intensa, escala Scoville 30k-2M"
sabor: "Picante quemante, activa TRPV1, persistente en paladar"
textura: "Oleosa lipofílica, soluble en grasa, no en agua"
vitaminas: ["Vitamin A", "Vitamin C", "Vitamin B6"]
compuestos: ["Dihydrocapsaicin", "Nordihydrocapsaicin"]
sources: ["PubMed", "NIH"]
tags: ["picante", "analgesico", "termogenico"]
image: "/images/substances/capsaicina.jpg"
image_attribution: "Pixabay — Capsicum annuum"
health_registry:
  - condition: "Pain / Neuropathy"
    mechanism: "TRPV1 agonist desensitization, substance P depletion"
    evidence_level: "High"
    studies:
      - title: "Capsaicin for pain management: mechanisms and clinical uses"
        source: "Molecules"
        year: 2020
        doi: "10.3390/molecules25092152"
  - condition: "Obesity / Metabolic syndrome"
    mechanism: "TRPV1-mediated thermogenesis and satiety"
    evidence_level: "Medium"
    studies:
      - title: "Capsaicin and energy balance"
        source: "Appetite"
        year: 2012
        doi: "10.1016/j.appet.2012.05.020"
---

![Capsaicina](/images/substances/capsaicina.jpg)
*Foto: Pixabay — Capsicum annuum — placeholder real photo path `public/images/substances/capsaicina.jpg` (800×600 webp/jpg, atribución en frontmatter).*

## Descripción

Alcaloide responsable del picor de los ajíes. Aislada en forma impura en 1816 por Christian Friedrich Bucholz y cristalizada en 1876 por John Clough Thresh (C18H27NO3). Activa receptores TRPV1 de dolor y calor. Lipofílica: la caseína de la leche atenúa su picor, no el agua.

## Sazón / Sabor / Textura

- **Sazón:** Pungencia intensa, escala Scoville 30k-2M
- **Sabor:** Picante quemante, activa TRPV1, persistente en paladar
- **Textura:** Oleosa lipofílica, soluble en grasa, no en agua

Usado en GOS como nodo `substance` conectado a ingredientes vía `active_compounds` y a afecciones vía `health_registry`. Ver grafo filtrado: `/graph?filter=substance:capsaicina`.

## Beneficio principal

> Analgésico, termogénico, antiinflamatorio

## Vitaminas asociadas

Vitamin A, Vitamin C, Vitamin B6

## Compuestos relacionados

Dihydrocapsaicin, Nordihydrocapsaicin

## Health registry

Ver `health_registry` arriba — mecanismos moleculares con nivel de evidencia y DOI PubMed.

## Almacenamiento y uso culinario

- **Conservación:** Mantener fuente `ají picante (Capsicum annuum)` fresca; los compuestos volátiles se degradan con calor excesivo y con el tiempo (ideal moler/ triturar al momento).
- **Técnica GOS:** Triturar o macerar para activar enzimas (aliinasa/mirosinasa) y reposar 10 min antes de calentar cuando aplique.
- **Seguridad:** Dosis culinarias son seguras; extractos concentrados requieren evaluación. Ver `ingredients/` para protocolo científico.
