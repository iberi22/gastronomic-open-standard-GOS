---
name: "Teobromina"
formula: "C7H8N4O2"
discovery_year: 1841
source_ingredient: "cacao (Theobroma cacao)"
benefit: "Diurético, vasodilatador, antitúsico"
sazon: "Chocolate amargo suave, menos estimulante que cafeína"
sabor: "Amarga suave achocolatada, 10x más lenta que cafeína"
textura: "Alcaloide cristal blanco, 1-2% cacao, estable al calor"
vitaminas: ["Magnesium", "Iron", "Copper"]
compuestos: ["Caffeine", "Theophylline", "Flavanols"]
sources: ["PubMed", "NIH"]
tags: ["chocolate", "vasodilatador", "antitusivo"]
image: "/gastronomic-open-standard-GOS/images/substances/teobromina.jpg"
image_attribution: "Pixabay — Theobroma cacao"
health_registry:
  - condition: "Hypertension"
    mechanism: "Phosphodiesterase inhibition, vasodilation"
    evidence_level: "Medium"
    studies:
      - title: "Theobromine and blood pressure: review"
        source: "Front Pharmacol"
        year: 2017
        doi: "10.3389/fphar.2017.00460"
---

![Teobromina](/gastronomic-open-standard-GOS/images/substances/teobromina.jpg)
*Foto: Pixabay — Theobroma cacao — placeholder real photo path `public/images/substances/teobromina.jpg` (800×600 webp/jpg, atribución en frontmatter).*

## Descripción

3,7-Dimethylxanthine (C7H8N4O2) aislada en 1841 por Woskresensky del cacao. Alcaloide hermano de cafeína pero 10x menos estimulante; diurético suave y vasodilatador. Responsable del efecto cacao.

## Sazón / Sabor / Textura

- **Sazón:** Chocolate amargo suave, menos estimulante que cafeína
- **Sabor:** Amarga suave achocolatada, 10x más lenta que cafeína
- **Textura:** Alcaloide cristal blanco, 1-2% cacao, estable al calor

Usado en GOS como nodo `substance` conectado a ingredientes vía `active_compounds` y a afecciones vía `health_registry`. Ver grafo filtrado: `/graph?filter=substance:teobromina`.

## Beneficio principal

> Diurético, vasodilatador, antitúsico

## Vitaminas asociadas

Magnesium, Iron, Copper

## Compuestos relacionados

Caffeine, Theophylline, Flavanols

## Health registry

Ver `health_registry` arriba — mecanismos moleculares con nivel de evidencia y DOI PubMed.

## Almacenamiento y uso culinario

- **Conservación:** Mantener fuente `cacao (Theobroma cacao)` fresca; los compuestos volátiles se degradan con calor excesivo y con el tiempo (ideal moler/ triturar al momento).
- **Técnica GOS:** Triturar o macerar para activar enzimas (aliinasa/mirosinasa) y reposar 10 min antes de calentar cuando aplique.
- **Seguridad:** Dosis culinarias son seguras; extractos concentrados requieren evaluación. Ver `ingredients/` para protocolo científico.
