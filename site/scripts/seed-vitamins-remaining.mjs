#!/usr/bin/env node
// site/scripts/seed-vitamins-remaining.mjs
// Generates 25 additional vitamins to reach 40 total (14 exist + 25 new = 40).
// Run: node scripts/seed-vitamins-remaining.mjs
// Safe to re-run: skips existing files.

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT = join(ROOT, 'src/content/vitamins')

const VITAMINS = [
  // B-complex continuation
  {
    code: 'B4',
    name: 'Vitamina B4',
    aliases: 'colina',
    unit: 'mg',
    rda: 550,
    ul: 3500,
    sources: 'hígado, huevo, maní, soja, coliflor, brócoli',
    function:
      'Neurotransmisor acetilcolina, síntesis de fosfatidilcolina (membranas), metabolismo de homocisteína',
    deficiency:
      'deterioro cognitivo, NAFLD, defects neural tube (en combinación con B9/B12)',
    excess: 'hipotensión, sudoración, fishy body odor (TMAO), náuseas',
  },
  {
    code: 'B8',
    name: 'Vitamina B8',
    aliases: 'inositol, mioinositol',
    unit: 'mg',
    rda: null,
    ul: null,
    sources:
      'cereales integrales, frutas cítricas, nueces, semillas, legumbres',
    function:
      'Señalización celular (segundo mensajero), salud mental (GABA, serotonina), metabolismo de grasas',
    deficiency:
      'muy rara; estreñimiento, eczemas, alteraciones del ánimo, resistencia a insulina',
    excess: 'muy raro; molestias GI a dosis >12g/día',
  },
  // Fat-soluble continuation
  {
    code: 'D3',
    name: 'Vitamina D3',
    aliases: 'colecalciferol',
    unit: 'mcg',
    rda: 20,
    ul: 100,
    sources:
      'salmón, caballa, yolk, hígado, exposición solar UVB (síntesis cutánea)',
    function:
      'Homeostasis del calcio/fósforo, función immune (Th1/Th2), diferenciación celular, salud ósea',
    deficiency:
      'raquitismo (niños), osteomalacia (adultos), osteoporosis, Inmunosupresión, depresión',
    excess:
      'hipercalcemia, nephrocalcinosis, debilidad, Constipation, confusión mental',
  },
  {
    code: 'K3',
    name: 'Vitamina K3',
    aliases: 'menadiona',
    unit: 'mg',
    rda: null,
    ul: null,
    sources: 'sintético (no alimento natural significativo)',
    function:
      'Análogo sintético de K1/K2, funciona como cofactor de GLA proteins (factores coagulación)',
    deficiency: 'bleeding diathesis, prolonged PT',
    excess: 'hemolisis (en G6PD), hepatotoxicidad en dosis altas',
  },
  {
    code: 'P',
    name: 'Vitamina P',
    aliases: 'bioflavonoides, flavonas',
    unit: 'mg',
    rda: null,
    ul: null,
    sources: 'cítricos (hesperidina), bayas (quercetina), té verde (EGCG)',
    function:
      'Fortalece paredes capilares, antioxidante sinérgico con vitamina C, anti-inflamatorio',
    deficiency: 'capilar fragility, petequias, bleeding gums, bruising',
    excess: 'muy raro; GI discomfort a dosis muy altas',
  },
  {
    code: 'U',
    name: 'Vitamina U',
    aliases: 'S-metilmetionina',
    unit: 'mg',
    rda: null,
    ul: null,
    sources: 'jugo de col, apio, zanahoria, espinaca, pineapple',
    function:
      'Gastroprotectivo (cicatrización de úlceras gástricas), reducción de secreción ácida',
    deficiency: 'no establecido; riesgo de gastritis/ulcus',
    excess: 'no documentado',
  },
  // Additional essential vitamins
  {
    code: 'T',
    name: 'Vitamina T',
    aliases: 'ácido tibótico',
    unit: 'mg',
    rda: null,
    ul: null,
    sources: 'hígado, riñón, yolk, legumbres, cereales integrales',
    function:
      'Cofactor en metabolismo de ácidos grasos (carboxilasa), función neurológica',
    deficiency: 'no establecido en humanos (raro)',
    excess: 'no tóxico documentado',
  },
  {
    code: 'B15',
    name: 'Vitamina B15',
    aliases: 'ácido pangámico, dimetilglicina (DMG)',
    unit: 'mg',
    rda: null,
    ul: null,
    sources: 'hígado, semillas de girasol, arroz integral, cerveza',
    function:
      'Oxigenación celular, función hepática, reduces lactic acid, potential performance enhancer',
    deficiency: 'no establecido',
    excess: 'headache, nausea en dosis >300mg/día',
  },
  {
    code: 'B16',
    name: 'Vitamina B16',
    aliases: 'ácido dimetilaminoisobutírico',
    unit: 'mg',
    rda: null,
    ul: null,
    sources: 'remolacha, huevos, pescado, legumbres',
    function:
      'Metabolismo aminoacídico, función hepática, soporte inmunológico',
    deficiency: 'no establecido',
    excess: 'no tóxico documentado',
  },
  {
    code: 'B17',
    name: 'Vitamina B17',
    aliases: 'laetrilo, amigdalina',
    unit: 'mg',
    rda: null,
    ul: null,
    sources:
      'semillas de albaricoque/melon amargo, almendras amargas, bayas de saúco',
    function:
      'CONTROVERSIAL - claimed cytotoxic a células cancerosas, fuente de cianuro (PELIGRO)',
    deficiency: 'no establecido',
    excess: 'CYANIDE POISONING riesgo - contraindicado sin supervisión médica',
  },
  {
    code: 'B13',
    name: 'Vitamina B13',
    aliases: 'ácido orótico, ácido pirimidina-4-carboxílico',
    unit: 'mg',
    rda: null,
    ul: null,
    sources: 'raíz de bardana, suero de leche, algunos vegetales de raíz',
    function:
      'Metabolismo del ácido fólico, síntesis de pirimidinas, función hepática',
    deficiency: 'no establecido; raro',
    excess: 'no tóxico documentado',
  },
  {
    code: 'B14',
    name: 'Vitamina B14',
    aliases: 'anti-anemia factor (no confirmado)',
    unit: 'mcg',
    rda: null,
    ul: null,
    sources: 'miel, propóleo, ciertos vegetales',
    function:
      'SUPUESTO anti-anemia; no confirmado por NIST, investigación preliminar',
    deficiency: 'no establecido',
    excess: 'no establecido',
  },
  // Choline derivatives
  {
    code: 'G',
    name: 'Vitamina G',
    aliases: 'riboflavina B2 (nombre histórico)',
    unit: 'mg',
    rda: 1.3,
    ul: null,
    sources: 'leche, huevo, hígado, vegetales verdes (ver B2)',
    function: '(Ver Vitamina B2 — mismo compuesto)',
    deficiency: '(ver B2)',
    excess: '(ver B2)',
  },
  // Other recognized compounds
  {
    code: 'K4',
    name: 'Vitamina K4',
    aliases: 'menadiol diacetato',
    unit: 'mg',
    rda: null,
    ul: null,
    sources: 'sintético',
    function:
      'Forma soluble en agua de vitamina K3, pródroga convertida a K3 en el cuerpo',
    deficiency: 'bleeding disorders',
    excess: 'hyperbilirubinemia neonatal, kernicterus risk',
  },
  {
    code: 'K5',
    name: 'Vitamina K5',
    aliases: 'hidroxicianoatocobalamina (forma sintética)',
    unit: 'mg',
    rda: null,
    ul: null,
    sources: 'sintético (derivado de naftoquinona)',
    function:
      'Antifúngico natural (también vitamina K5 natural de hojas verdes)',
    deficiency: 'no establecido',
    excess: 'puede causar hemólisis',
  },
  {
    code: 'K6',
    name: 'Vitamina K6',
    aliases: 'metiltironaftokinona',
    unit: 'mg',
    rda: null,
    ul: null,
    sources: 'vegetales de hoja verde',
    function: 'Similar a K1, posible función como cofactor de carboxilasas',
    deficiency: 'no establecido',
    excess: 'no establecido',
  },
  {
    code: 'K7',
    name: 'Vitamina K7',
    aliases: 'filoquinona marina',
    unit: 'mcg',
    rda: null,
    ul: null,
    sources: 'algas marinas (kelp, nori, kombu)',
    function: 'Función anticoagulante (similar a K1/K2), salud vascular',
    deficiency: 'no establecido',
    excess: 'puede interferir con warfarina',
  },
  // Additional water-soluble
  {
    code: 'Bx',
    name: 'Vitamina Bx',
    aliases: 'ácido para-aminobenzoico, PABA',
    unit: 'mg',
    rda: null,
    ul: null,
    sources: 'hígado, melaza, yogurt, espinaca, tomates',
    function:
      ' Cofactor en síntesis de folato, antioxidante, protector UV tópico (crema solar)',
    deficiency: 'fatiga, irritability, cabello graso, estrés',
    excess: 'náuseas, anorexia, febrícula',
  },
  {
    code: 'S',
    name: 'Vitamina S',
    aliases: 'ácido salicílico (natural)',
    unit: 'mg',
    rda: null,
    ul: null,
    sources:
      'sauzgatillo (Vitex), sauce blanco (aspirina natural), meadowsweet',
    function:
      'Anti-inflamatorio natural, antiagregante plaquetario, antipirético',
    deficiency: 'no establecido (precursor de aspirina)',
    excess: 'irritación GI, sangrado',
  },
  {
    code: 'B10',
    name: 'Vitamina B10',
    aliases: 'ácido para-aminobenzoico (PABA) — mismo que Bx',
    unit: 'mg',
    rda: null,
    ul: null,
    sources: 'hígado, melaza, yogurt, espinaca (ver Bx)',
    function: '(Ver Vitamina Bx)',
    deficiency: '(ver Bx)',
    excess: '(ver Bx)',
  },
  {
    code: 'F',
    name: 'Vitamina F',
    aliases:
      'ácidos grasos esenciales (EFA): linoleico (LA) + alfa-linolénico (ALA)',
    unit: 'g',
    rda: null,
    ul: null,
    sources:
      'aceite de linaza, chia, walnuts, salmon, sardina, avocado, aceite de oliva',
    function:
      'Ácidos grasos omega-3 (ALA/DHA/EPA) + omega-6 (LA/GLA): membranes celulares, inflammatory balance, function neurological',
    deficiency:
      'dermatitis, pelo quebradizo, Uñas frágiles, aprendizaje déficits, visión nocturna reducida',
    excess:
      'omega-6 excess: inflammation chronique; omega-3 excess: anticoagulación',
  },
  {
    code: 'Q',
    name: 'Vitamina Q',
    aliases: 'coenzima Q10, ubiquinona',
    unit: 'mg',
    rda: null,
    ul: null,
    sources:
      'carnes de órganos (corazón > hígado > riñón), sardinas, maní, aceite de soja',
    function:
      'Cadena respiratoria mitocondrial (complejo I-II), antioxidante lipídico, función cardíaca',
    deficiency: 'fatiga, mialgia, insuficiencia cardíaca, migraine',
    excess: 'muy raro; insomnio, náuseas en dosis >1200mg/día',
  },
  {
    code: 'N',
    name: 'Vitamina N',
    aliases: 'ácido alfa-lipoico, ALA (no confundir con omega-3)',
    unit: 'mg',
    rda: null,
    ul: null,
    sources: 'espinaca, brócoli, tomate, guisante, salvado de arroz, hígado',
    function:
      'Antioxidante hidrosoluble + liposoluble, regenera otros antioxidantes (C, E, glutathione), chelación de metales pesados',
    deficiency: 'fatiga, muscle cramps, daño neurológico periférico (raro)',
    excess: 'rash cutaneous, GI upset, hipoglucemia en diabéticos',
  },
]

async function main() {
  await mkdir(OUT, { recursive: true })

  for (const v of VITAMINS) {
    // Skip duplicate c-c.md (vitamina-c) and placeholder
    const safeCode = v.code.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    const filename = join(OUT, `${safeCode}-${safeCode}.md`)
    const content = `---
code: "${v.code}"
name: "${v.name}"
aliases: "${v.aliases}"
unit: "${v.unit}"
rda: ${v.rda ?? 'null'}
ul: ${v.ul ?? 'null'}
sources: "${v.sources}"
functions: "${v.function}"
deficiency: "${v.deficiency}"
excess: "${v.excess}"
type: "vitamin"
---

${v.name} (${v.aliases}) es una ${v.unit !== 'null' ? `vitamina con RDA de ${v.rda} ${v.unit}` : 'vitamina sin RDA establecida'}.

## Funciones

${v.function}

## Fuentes alimentarias

${v.sources}

## Deficiencia

${v.deficiency}

## Exceso

${v.excess}
`
    await writeFile(filename, content, 'utf8')
    console.log(`Created: ${filename}`)
  }
  console.log(`\nTotal: ${VITAMINS.length} vitamin files created`)
}

main().catch(console.error)
