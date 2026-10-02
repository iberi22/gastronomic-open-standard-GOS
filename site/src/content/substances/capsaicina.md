---
aliases:
  en:
  - capsaicin
benefit: Analgésico, termogénico, antiinflamatorio
compuestos:
- Dihydrocapsaicin
- Nordihydrocapsaicin
discovery_year: 1816
formula: C18H27NO3
health_registry:
- condition: Pain / Neuropathy
  evidence_level: High
  mechanism: TRPV1 agonist desensitization, substance P depletion
  studies:
  - doi: 10.1016/j.ejphar.2013.10.053
    source: Eur J Pharmacol
    title: 'Mechanisms and clinical uses of capsaicin'
    year: 2013
- condition: Obesity / Metabolic syndrome
  evidence_level: Medium
  mechanism: TRPV1-mediated thermogenesis and satiety
  studies:
  - doi: 10.1016/j.appet.2012.05.015
    source: Appetite
    title: "Capsaicinoids and capsinoids. A potential role for weight management? A systematic review of the evidence"
    year: 2012
    url: "https://pubmed.ncbi.nlm.nih.gov/22634197/"
  - doi: 10.1016/bs.afnr.2015.07.002
    source: Advances in Food and Nutrition Research
    title: "Capsaicin and Related Food Ingredients Reducing Body Fat Through the Activation of TRP and Brown Fat Thermogenesis"
    year: 2015
    url: "https://pubmed.ncbi.nlm.nih.gov/26602570/"
  - doi: 10.1007/s42977-023-00174-3
    source: Biologia Futura
    title: "Peppers and their constituents against obesity"
    year: 2023
    url: "https://pubmed.ncbi.nlm.nih.gov/37493973/"
  - doi: 10.1038/s41598-025-31073-3
    source: Scientific Reports
    title: "Capsaicin camphor and caffeic acid reduce adipogenesis and promote lipolysis with TRPV1 involvement"
    year: 2025
    url: "https://pubmed.ncbi.nlm.nih.gov/41331337/"
image_attribution: Pixabay — Capsicum annuum
name: Capsaicina
sabor: Picante quemante, activa TRPV1, persistente en paladar
sazon: Pungencia intensa, escala Scoville 30k-2M
source_ingredient: ají picante (Capsicum annuum)
sources:
- PubMed
- NIH
tags:
- picante
- analgesico
- termogenico
textura: Oleosa lipofílica, soluble en grasa, no en agua
vitaminas:
- Vitamin A
- Vitamin C
- Vitamin B6
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

## Metabolismo y Termogénesis (Estudios Clínicos)

Resumen de evidencia científica sobre capsaicina, activación del receptor TRPV1 y metabolismo:

- **Aumento del Gasto Energético:** La ingesta diaria de ~2 mg de capsaicinoides (~1-3 g de chile fresco o en polvo) activa los receptores sensibles a la temperatura TRPV1 en las neuronas aferentes sensoriales. Esto estimula el sistema nervioso simpático, incrementando la secreción de catecolaminas y elevando el gasto energético basal en aproximadamente 50 kcal/día.
- **Activación de Tejido Adiposo Marrón (BAT):** La estimulación continua con capsaicina promueve el pardeamiento (*browning*) del tejido adiposo blanco mediante la inducción de la proteína desacoplante 1 (UCP1) en las mitocondrias, facilitando la disipación de energía en forma de calor.
- **Atenuación de Termogénesis Adaptativa:** En ensayos clínicos humanos bajo restricción calórica, la administración de dosis culinarias de pimiento rojo atenuó la disminución adaptativa de la tasa metabólica basal producida por el déficit energético de 24 horas.

## Almacenamiento y uso culinario

- **Conservación:** Mantener fuente `ají picante (Capsicum annuum)` fresca; los compuestos volátiles se degradan con calor excesivo y con el tiempo (ideal moler/ triturar al momento).
- **Técnica GOS:** Triturar o macerar para activar enzimas (aliinasa/mirosinasa) y reposar 10 min antes de calentar cuando aplique.
- **Seguridad:** Dosis culinarias son seguras; extractos concentrados requieren evaluación. Ver `ingredients/` para protocolo científico.
