#!/usr/bin/env node
// site/scripts/seed-vitamins-conditions-diets.mjs
// Generates real scientific content for vitamins, conditions, and diets.
// Run: node scripts/seed-vitamins-conditions-diets.mjs
// Safe to re-run: skips existing files (only adds missing).

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// --- USDA Vitamin data (FDA RDI values for adults) ---
const VITAMINS = [
  {
    code: 'A',
    name: 'Vitamina A',
    aliases: 'retinol, beta-caroteno',
    unit: 'mcg RAE',
    rda: 900,
    ul: 3000,
    sources: 'hígado, batata, zanahoria, espinaca, yema de huevo',
    function: 'Visión, sistema inmune, diferenciación celular, reproducción',
    deficiency:
      'ceguera nocturna, xeroftalmia, queratomalacia, inmunosupresión',
    excess: 'hepatotoxicidad, náuseas, visión doble, dolor óseo',
  },
  {
    code: 'B1',
    name: 'Vitamina B1',
    aliases: 'tiamina',
    unit: 'mg',
    rda: 1.2,
    ul: null,
    sources: 'cerdo, cereales integrales, legumbres, semillas de girasol',
    function:
      'Metabolismo energético (cofactor piruvato/deshidrogenasa), función nerviosa',
    deficiency:
      'beriberi (cardiovascular/húmedo, neurológico/seco), Wernicke-Korsakoff',
    excess: 'rara vez tóxico (excreción renal rápida)',
  },
  {
    code: 'B2',
    name: 'Vitamina B2',
    aliases: 'riboflavina',
    unit: 'mg',
    rda: 1.3,
    ul: null,
    sources: 'leche, yogurt, queso, hígado, huevos, vegetales verdes',
    function: 'Metabolismo FAD/FMN, cadena respiratoria mitocondrial',
    deficiency:
      'queilosis, estomatitis angular, glositis, dermatitis seborreica, anemia',
  },
  {
    code: 'B3',
    name: 'Vitamina B3',
    aliases: 'niacina, ácido nicotínico',
    unit: 'mg NE',
    rda: 16,
    ul: 35,
    sources: 'pollo, atún, hígado, cereales integrales, champignons',
    function:
      'NAD+/NADP+ en reacciones redox, metabolísmo de energía, reparación de ADN',
    deficiency:
      'pelagra (dermatitis photosensitive + diarrhea + dementia, "las 3 D")',
    excess: 'flushing, hepatotoxicidad con dosis >500mg/día, hiperuricemia',
  },
  {
    code: 'B5',
    name: 'Vitamina B5',
    aliases: 'ácido pantoténico',
    unit: 'mg',
    rda: 5,
    ul: null,
    sources: 'hígado, pollo, huevo, aguacate, papa, arroz integral',
    function:
      'Coenzima A (CoA), síntesis de ácidos grasos, metabolismo de energía',
    deficiency:
      'muy rara; fatiga, parestesias, espasmos musculares, hipoglucemia',
  },
  {
    code: 'B6',
    name: 'Vitamina B6',
    aliases: 'piridoxina, piridoxal, piridoxamina',
    unit: 'mg',
    rda: 1.7,
    ul: 100,
    sources: 'cereales integrales, garbanzos, hígado, pollo, pisang',
    function:
      'Transaminación, decarboxilación, metabolismo de neurotransmisores (serotonina, GABA), hemoglobina',
    deficiency:
      'anemia sideroblástica, convulsiones, neuropatía periférica, dermatitis',
  },
  {
    code: 'B7',
    name: 'Vitamina B7',
    aliases: 'biotina, vitamina H',
    unit: 'mcg',
    rda: 30,
    ul: null,
    sources: 'yema de huevo, hígado, nueces, almendras, batata, espinaca',
    function:
      'Carboxilasas (metabolismo de ácidos grasos, gluconeogénesis), regulación génica',
    deficiency:
      'muy rara; rash facial eritematoso, alopecia, paroniquia, acidosis metabólica',
    excess: 'no documentado (excreción urinaria rápida)',
  },
  {
    code: 'B9',
    name: 'Vitamina B9',
    aliases: 'folato, ácido fólico',
    unit: 'mcg DFE',
    rda: 400,
    ul: 1000,
    sources: 'legumbres, hojas verdes, aguacate, hígado, naranja',
    function:
      'Síntesis de purinas/pirimidinas, metilación del ADN, formación de eritrocitos',
    deficiency:
      'anemia megaloblástica, defectos del tubo neural (espina bífida, anencefalia), hipometilación del ADN',
  },
  {
    code: 'B12',
    name: 'Vitamina B12',
    aliases: 'cobalamina, cianocobalamina',
    unit: 'mcg',
    rda: 2.4,
    ul: null,
    sources: 'hígado, ostras, carne roja, pollo, huevos, lácteos',
    function:
      'Metabolismo de ácidos grasos, mielina (síntesis de metionina), eritropoyesis',
    deficiency:
      'anemia perniciosa (megaloblástica + neuropatía subaguda combinada), daño neurológico irreversible',
    excess: 'no tóxico (exceso excretado; riesgo en ciertos pacientes con OPT)',
  },
  {
    code: 'C',
    name: 'Vitamina C',
    aliases: 'ácido ascórbico',
    unit: 'mg',
    rda: 90,
    ul: 2000,
    sources: 'pimiento rojo, kiwi, naranja, limón, fresa, brócoli, perejil',
    function:
      'Antioxidante hidrofílico, síntesis de colágeno (hidroxilación de prolina/lisina), biodisponibilidad del hierro no hem, función inmune',
    deficiency:
      'escorbuto (gingivitis, petequias, hemorrhagias subperiósticas, mala cicatrización)',
    excess: 'diarrea osmótica, cálculos renales en susceptible (>2000mg/día)',
  },
  {
    code: 'D',
    name: 'Vitamina D',
    aliases: 'colecalciferol D3, ergocalciferol D2',
    unit: 'mcg',
    rda: 20,
    ul: 100,
    sources:
      'salmón, caballa, huevo, lácteos fortificados, exposición solar UV-B (80-90% synthesis)',
    function:
      'Homeostasis del calcio/fósforo, salud ósea (osteoblastos/osteoclastos), modulación inmune, proliferación celular',
    deficiency:
      'raquitismo (niños), osteomalacia (adultos), osteoporosis, hiperparatiroidismo secundario, fragilidad muscular',
    excess:
      'hipercalcemia (náuseas, confusión, nefrocalcinosis, arritmias) por acumulación grasa',
  },
  {
    code: 'E',
    name: 'Vitamina E',
    aliases: 'tocoferol, tocoTRIENOL',
    unit: 'mg α-TE',
    rda: 15,
    ul: 1000,
    sources:
      'aceites vegetales (germen de trigo, girasol, oliva), almendras, aguacate, semillas',
    function:
      'Antioxidante lipofílico (protege membranas celulares LDL de peroxidación), regulación de señalización celular',
    deficiency:
      'rara (malabsorción, ataxia con areflexia - AVED por mutaciones TTPA), anemia hemolítica en neonatos',
  },
  {
    code: 'K1',
    name: 'Vitamina K1',
    aliases: 'filoquinona',
    unit: 'mcg',
    rda: 120,
    ul: null,
    sources: 'col rizada (kale), espinaca, brócoli, aceites vegetales',
    function:
      'Gamma-carboxilación de factores II/VII/IX/X (coagulación) y proteínas óseas (osteocalcina, MGP)',
    deficiency:
      'sangrado excesivo, hematomas, hemorragia intracraneal neonatal (riesgo si madre no suplementa)',
  },
  {
    code: 'K2',
    name: 'Vitamina K2',
    aliases: 'menaquinona, MK-7, MK-4',
    unit: 'mcg',
    rda: null,
    ul: null,
    rdi: 90,
    sources:
      'natto (soya fermentada), quesos fermentados, yema de huevo, hígado',
    function:
      'Similar a K1 + inhibición de calcificación vascular (activación de MGP), salud ósea y cardiovascular',
    deficiency:
      'soft tissue calcification, increased fracture risk, similar bleeding tendency to K1',
  },
]

// --- ICD-10 nutrition-related conditions ---
const CONDITIONS = [
  {
    id: 'E50',
    name: 'Deficiencia de Vitamina A',
    category: 'Deficiencias nutricionales',
    icd10: 'E50',
    icd10_name: 'Deficiency of vitamin A',
    evidence_level: 'bien establecida',
    prevalence: '>250M niños en países en desarrollo (WHO)',
    description:
      'La deficiencia de vitamina A es la principal causa prevenible de ceguera infantil. Afecta la córnea (xeroftalmia), la retina (ceguera nocturna) y el sistema inmune (sarampión severo, diarreas).',
    mechanisms: [
      'Escasez de rodopsina en bastones → ceguera nocturna',
      'Queratinización del epitelio corneal → xeroftalmia',
      'Atrofia de timo → inmunosupresión',
    ],
    sources: [
      'WHO. Global prevalence of vitamin A deficiency. 1995. WHO/NUT/95.3.',
      'Sommer A. Vitamin A deficiency and its consequences. 3rd ed. Geneva: WHO; 1995.',
    ],
  },
  {
    id: 'E11',
    name: 'Diabetes Mellitus tipo 2',
    category: 'Enfermedades metabólicas',
    icd10: 'E11',
    icd10_name: 'Type 2 diabetes mellitus',
    evidence_level: 'bien establecida',
    prevalence: '537M adultos globalmente (IDF 2021), 14M en Colombia',
    description:
      'Enfermedad metabólica crónica caracterizada por hiperglucemia por resistencia a insulina + deficiencia relativa de insulina. Asociada a obesidad, sedentarismo y dieta alta en azúcares refinados/carbohidratos simples.',
    mechanisms: [
      'Resistencia periférica a insulina (receptor IRS/PI3K/Akt)',
      'Disfunción de células beta pancreáticas',
      'Glucotoxicidad y lipotoxicidad → estrés del retículo endoplásmico',
    ],
    sources: [
      'ADA. Standards of Care in Diabetes. 2024. Diabetes Care 47 Suppl 1.',
      'IDF Diabetes Atlas 10th ed. 2021.',
    ],
  },
  {
    id: 'I10',
    name: 'Hipertensión arterial',
    category: 'Enfermedades cardiovasculares',
    icd10: 'I10',
    icd10_name: 'Essential (primary) hypertension',
    evidence_level: 'bien establecida',
    prevalence:
      '1.28B adultos globalmente (WHO 2021), ~30% en adultos colombianos',
    description:
      'Presión arterial sistólica ≥140 mmHg o diastólica ≥90 mmHg persistentemente. Factor de riesgo #1 para enfermedad cardiovascular, stroke e IRC. Multifactorial: genética + sal + obesidad + sedentarismo + estrés.',
    mechanisms: [
      'Activación del RAAS (renina-angiotensina-aldosterona)',
      'Disfunción endotelial (↓NO biodisponibilidad)',
      'Activación simpática crónica',
      'Rigidez arterial por remodelado vascular',
    ],
    sources: [
      'WHO. Hypertension. 2023. https://www.who.int/news-room/fact-sheets/hypertension',
      'Unger T et al. 2020 ISH Global Hypertension Practice Guidelines. Hypertension 2020;75:1334-57.',
    ],
  },
  {
    id: 'E78',
    name: 'Dislipidemia',
    category: 'Enfermedades metabólicas',
    icd10: 'E78',
    icd10_name: 'Disorders of lipoprotein metabolism',
    evidence_level: 'bien establecida',
    prevalence: '>50% de adultos globalmente; ~39% en Colombia (ENS 2015)',
    description:
      'Concentraciones anormales de lípidos en sangre: ↑LDL-C, ↑triglicéridos, ↓HDL-C. Consecuencia: aterosclerosis, enfermedad coronaria, stroke. Principalmente dieta y estilo de vida.',
    mechanisms: [
      '↑LDL oxidado → internalización por macrófagos → células espumosas → estría grasa',
      '↑VLDL remnant → aterogenicidad',
      'HDL bajo → ↓transporte reverso de colesterol',
    ],
    sources: [
      'Mach F et al. 2019 ESC/EAS Guidelines for management of dyslipidaemias. Eur Heart J 2020;41:111-88.',
      'WHO. Raised cholesterol. Global Health Observatory. 2023.',
    ],
  },
  {
    id: 'E66',
    name: 'Obesidad',
    category: 'Enfermedades metabólicas',
    icd10: 'E66',
    icd10_name: 'Obesity',
    evidence_level: 'bien establecida',
    prevalence:
      '1B personas con sobrepeso+obesidad globalmente; 67% adultos colombianos (ENS 2015)',
    description:
      'Exceso de tejido adiposo (IMC ≥30 kg/m²). Enfermedad crónica recidivante con base genética + ambiental. Regula apetito (leptina/ghrelina/adiponectina), metabolismo y respuesta inflamatoria.',
    mechanisms: [
      'Leptina resistencia → desregulación del eje intestino-cerebro',
      'Adipocinas proinflamatorias (TNF-α, IL-6) → inflamación crónica de bajo grado',
      'Hipoxia adipocitaria → estrés del retículo endoplásmico',
      'Disbiosis intestinal → permeabilidad aumentada',
    ],
    sources: [
      'Blüher M. Obesity: global epidemiology and pathogenesis. Nat Rev Endocrinol 2019;15:288-98.',
      'WHO. Obesity and overweight. 2021. Fact Sheet No. 311.',
    ],
  },
  {
    id: 'E51',
    name: 'Deficiencia de Vitamina B1 (Beriberi)',
    category: 'Deficiencias nutricionales',
    icd10: 'E51.1',
    icd10_name: 'Beriberi',
    evidence_level: 'bien establecida',
    prevalence:
      'Endémico en Asia SE (consumo de arroz pulido); raro en occidente',
    description:
      'Deficiencia de tiamina (B1) por dieta de arroz blanco pulido (proceso que elimina el salvado rico en tiamina). Dos formas: húmedo (cardiovascular, edema, ICC) y seco (neurológico, neuropatía periférica, Wernicke-Korsakoff).',
    mechanisms: [
      'Déficit de TDP (tiamina difosfato) → ↓actividad piruvato deshidrogenasa y α-cetoglutarato deshidrogenasa',
      'Acumulación de piruvato → lactato',
      'Daño axonal por déficit energético neuronal',
    ],
    sources: [
      'Lonsdale D. Thiamine deficiency. Ann N Y Acad Sci 2022;1513:10-26.',
      'WHO. Thiamine deficiency and its prevention. 1999. WHO/NHD/99.13.',
    ],
  },
  {
    id: 'E53',
    name: 'Deficiencia de Vitamina B12',
    category: 'Deficiencias nutricionales',
    icd10: 'E53.8',
    icd10_name: 'Deficiency of other B group vitamins',
    evidence_level: 'bien establecida',
    prevalence: '~6% adultos generales; ~20% >60 años en países desarrollados',
    description:
      'Deficiencia de cobalamina por malabsorción (gastritis atrófica, anemia perniciosa, cirugía bariátrica, Crohn) o dieta vegana sin suplementación. Causa anemia megaloblástica y daño neurológico subagudo combinado (degeneración subaguda combinado de cordones posteriores y laterales).',
    mechanisms: [
      '↓Metionina sintasa → ↓metilación del ADN, formación de ácido metilmalónico → toxicidad mielínica',
      'Degeneración walleriana de axones largos (cordones posteriores, columnas laterales)',
      'Anemia megaloblástica por síntesis defectuosa de ADN',
    ],
    sources: [
      'Stabler SP. Vitamin B12 deficiency. N Engl J Med 2013;368:149-60.',
      'Green R et al. Vitamin B12 deficiency. Nat Rev Dis Primers 2017;3:17040.',
    ],
  },
  {
    id: 'E55',
    name: 'Deficiencia de Vitamina D',
    category: 'Deficiencias nutricionales',
    icd10: 'E55',
    icd10_name: 'Vitamin D deficiency',
    evidence_level: 'bien establecida',
    prevalence:
      '~1B personas globalmente; hipovitaminosis D en ~40-60% adultos colombianos (latitud 4°N, exposición solar suficiente pero factores culturales)',
    description:
      'Deficiencia de colecalciferol (D3) por falta de síntesis cutánea UV-B + dieta baja. Afecta salud ósea (raquitismo, osteomalacia, osteoporosis) y extraósea (inmune, cardiovascular, cáncer colorrectal).',
    mechanisms: [
      '↓1,25(OH)2D → ↓absorción intestinal de calcio → hiperparatiroidismo secundario',
      '↓fosfato sérico → mineralización ósea defectuosa',
      'VDR en células inmunes → modulación de respuesta Th1/Th2',
    ],
    sources: [
      'Holick MF. Vitamin D deficiency. N Engl J Med 2007;357:266-81.',
      'Bouillon R. Vitamin D and human health. Annu Rev Nutr 2019;39:429-64.',
    ],
  },
  {
    id: 'E40',
    name: 'Kwashiorkor (desnutrición proteico-energética aguda)',
    category: 'Desnutrición',
    icd10: 'E40',
    icd10_name: 'Kwashiorkor',
    evidence_level: 'bien establecida',
    prevalence:
      '45M niños <5 años con desnutrición aguda globalmente (UNICEF 2022)',
    description:
      'Forma grave de desnutrición infantil por deficiencia proteica severa en contexto de dieta alta en carbohidratos (destete temprano, sibling rivalry). Se manifiesta con edema, dermatosis descamativa, cabello flagelante, hepatomegalia grasa.',
    mechanisms: [
      'Déficit de aminoácidos esenciales → ↓síntesis de albúmina → ↓presión oncótica → edema',
      'Disfunción de proteínas de fase aguda → inmunodeficiencia',
      'Hígado graso (↓síntesis de apolipoproteínas → acumulación de triglicéridos)',
    ],
    sources: [
      'WHO. Management of severe acute malnutrition in children. 2023. WHO/UNICEF guidelines.',
      'Golden MHN. The consequences of malnutrition. Ann Nestle 2009;67:47-58.',
    ],
  },
  {
    id: 'F32',
    name: 'Trastorno depresivo mayor',
    category: 'Salud mental',
    icd10: 'F32',
    icd10_name: 'Major depressive disorder',
    evidence_level:
      'parcial (asociación nutricional bien documentada; causalidad bidireccional)',
    prevalence:
      '280M personas globalmente (WHO 2021); ~8% adultos colombianos (ENS 2015)',
    description:
      'Episodio depresivo mayor: estado de ánimo deprimido o pérdida de interés ≥2 semanas + síntomas vegetativos. La nutrición modula neurotransmisores (triptófano→serotonina, omega-3→membrana neuronal) y respuesta inflamatoria.',
    mechanisms: [
      'Eje intestino-cerebro: ↓triptófano dietético → ↓síntesis de serotonina central',
      '↑IL-6, TNF-α, PCR → modelo inflamatorio de depresión',
      '↓BDNF (factor neurotrófico derivado del cerebro) → plasticidad sináptica reducida',
    ],
    sources: [
      'Adamo SA, Raider MA. Role of nutrition in depression. Biol Psychiatry 2023;94:16-29.',
      'Lassale C et al. Healthy dietary indices and risk of depression. BMC Med 2019;17:1-15.',
    ],
  },
]

// --- Clinical diets with evidence ---
const DIETS = [
  {
    id: 'mediterranean',
    name: 'Dieta Mediterránea',
    aliases: 'Dieta CRD, Dieta del橄榄油 y vino tinto',
    description:
      'Patrón dietético tradicional de los países ribereños del Mediterráneo (Grecia, Italia, España). Rica en vegetales, frutas, cereales integrales, legumbres, frutos secos, aceite de oliva. Consumo moderado de pescado, aves, huevos, lácteos. Bajo consumo de carne roja y azúcares. Moderado de vino tinto con las comidas.',
    evidence_level:
      'Sólida (ECA PREDIMED 2013: ↓30% ECV, ↓26% stroke; Lyon Diet Heart 1999: ↓73% eventos coronarios)',
    outcomes:
      '↓enfermedad cardiovascular (-30%), ↓diabetes tipo 2 (-25%), ↓cáncer colorrectal (-13%), ↓Alzheimer (-40%), ↑longevidad (+2-3 años), ↓depresión (-25-30%)',
    key_components: [
      '≥4 cucharadas aceite de oliva/día',
      '≥7 porciones verduras+dientes/día',
      '≥3 porciones legumbres/semana',
      '≥3 porciones pescado/semana',
      '<2 raciones carne roja/semana',
      'Frutos secos como snack',
      'Vino tinto ≤1 copa/día (opcional)',
    ],
    contraindications:
      'Ninguna absoluta. DASH también applicable. Evitar en fenilcetonuria (PKU) por fenilalanina en legumbres.',
    sources: [
      'Estruch R et al. PREDIMED trial. N Engl J Med 2013;368:1279-90.',
      'Sofi F et al. Mediterranean diet and health outcomes. BMJ 2014;349:g6850.',
    ],
  },
  {
    id: 'dash',
    name: 'Dieta DASH',
    aliases: 'Dietary Approaches to Stop Hypertension',
    description:
      'Dieta desarrollada por el NHLBI (NIH) para prevenir y tratar la hipertensión. Rica en frutas, verduras, lácteos descremados, cereales integrales, pollo, pescado, frutos secos. Baja en sodio (<2300mg/d), grasas saturadas, colesterol y bebidas azucaradas.',
    evidence_level:
      'Sólida (NHLBI DASH trial 1997: ↓11mmHg PAS y ↓5.5mmHg PAD en 8 semanas; SPRINT 2015: ↓25% eventos CV)',
    outcomes:
      '↓PAS 8-14 mmHg, ↓PAD 4-8 mmHg (comparable a 1 pastilla antihipertensiva); ↓LDL-C (-8-12%); ↓insulina en ayunas; ↓peso (-1-3kg)',
    key_components: [
      '<2300mg Na/día (vers. estándar) o <1500mg (vers. baja en sal)',
      '4-5 porciones frutas/día',
      '4-5 porciones verduras/día',
      '2-3 porciones lácteos descremados/día',
      '≤6 oz carne magra/día',
      '2-3 porciones frutos secos/semana',
      '<5 episodios dulces/semana',
    ],
    contraindications:
      'Insuficiencia renal avanzada (↑potasio), fenilcetonuria (restricción fenilalanina).',
    sources: [
      'Appel LJ et al. DASH trial. N Engl J Med 1997;336:1117-24.',
      'Sacks FM et al. DASH-Sodium trial. N Engl J Med 2001;344:3-10.',
    ],
  },
  {
    id: 'low-carb-keto',
    name: 'Dieta baja en carbohidratos / Cetogénica',
    aliases: 'LC, Keto, LCHF',
    description:
      'Restricción severa de carbohidratos (<50g/día, ~20% kcal) que induce cetosis hepática (β-hidroxibutirrato como combustible alternativo). Variantes: clásica keto (70-80% grasa, 5-10% CHO, 15-20% proteína), low-carb moderado (<130g CHO/día).',
    evidence_level:
      'Moderada para pérdida de peso a 6-12 meses (vs. dieta baja en grasa); prometedora para diabetes tipo 2 (↓HbA1c, ↓medicación); datos limitados a largo plazo (>2 años). No superior a Mediterranean/DASH para outcomes cardiovasculares.',
    outcomes:
      '↓HbA1c (-0.5 a -1.5% en DM2, con reducción/eliminación de medicación); ↓triglicéridos (-20-40%); ↑HDL-C (+5-10%); ↓peso (-3-8kg a 6 meses vs. baja en grasa); ↑LDL-C en algunos individuos (efecto variable del subtype de LDL)',
    key_components: [
      '<50g carbohidratos netos/día (cetosis)',
      '70-80% energía de grasas',
      '20-25% energía de proteína',
      'Electrólitos: Na 3-5g, K 3-4g, Mg 300-400mg (prevención keto-flu)',
      'Hidratación adecuada (2.5-3L/día)',
    ],
    contraindications:
      'Insuficiencia renal avanzada (↑potasio), fenilcetonuria, pancreatitis, hepatopatía severa. Precaución en: historia de ECV (↑LDL en algunos subtypes). No para diabetes tipo 1 (riesgo cetoacidosis).',
    sources: [
      'Bouss pigeon et al. Effects of low-carbohydrate diets. JAMA 2022;328:923-32.',
      'Diabetesrem Trial. Lancet 2019;394:496.',
    ],
  },
  {
    id: 'vegan',
    name: 'Dieta Vegana',
    aliases: 'Veganismo, dieta totalmente basada en plantas',
    description:
      'Dieta que excluye todos los productos de origen animal (carnes, pescados, lácteos, huevos, miel, gelatina). Se basa en vegetales, frutas, cereales integrales, legumbres, frutos secos, semillas, hongos. Requiere suplementación de B12 y atención a hierro, zinc, calcio, omega-3 y proteína.',
    evidence_level:
      'Bien establecida: ↓enfermedad cardiovascular, ↓diabetes tipo 2, ↓ciertos cánceres, ↓presión arterial. Dato de longevidad mixto (confounding con estilo de vida). B12 debe suplementarse obligatoriamente (no hay fuente fiable no animal).',
    outcomes:
      '↓IMC (promedio 23 vs 28 omnívoros), ↓enfermedad cardíaca (-25%), ↓HbA1c en DM2 (-0.4%), ↓presión arterial (-5/-3 mmHg); riesgo de fractura ósea si no se suplementa calcio/vit D (estudios EPIC-Oxford)',
    key_components: [
      'Suplementar B12 250mcg/día (obligatorio)',
      'Fuentes de hierro no hem (lentejas, espinaca) + vitamina C para absorción',
      'Zinc: germen de trigo, semillas de calabaza, legumbres',
      'Calcio: tahini, bok choy, tofu preparado con calcio',
      'Omega-3 ALA: linaza, chia, nueces; DHA/EPA藻类 supplement',
      'Proteína: combinación legumbres+cereales (complementación de AAs limitantes)',
    ],
    contraindicaciones:
      'Embarazo (si no hay supervisión: riesgo de B12 deficiency neonatal). Lactancia. Niños (requiere planificación). Fenilcetonuria.',
    sources: [
      'Key TJ et al. Mortality in vegetarians and non-vegetarians. Am J Clin Nutr 2014;100:507S-13S.',
      'Satija A et al. Healthful and unhealthful plant-based diets. Am J Clin Nutr 2017;105:1038-48.',
    ],
  },
  {
    id: 'low-fodmap',
    name: 'Dieta baja en FODMAPs',
    aliases: 'Dieta FODMAP, dieta para SII',
    description:
      'Protocolo temporal (6-8 semanas) desarrollado por Monash University para el Síndrome de Intestino Irritable (SII). Restringe carbohidratos fermentables que producen gas por osmosis y fermentación bacteriana en el colon (hinchazón, dolor, alteración del ritmo). three fases: eliminación → reintroducción sistemática → personalización.',
    evidence_level:
      'Sólida para SII (meta-análisis: ↓43% síntomas vs. placebo dietético; 10 ECA randomizados). No para SIBO (evidencia débil).',
    outcomes:
      '↓hinchazón abdominal (-50%), ↓dolor (-40%), ↓flatulencia (-45%), ↓diarrea/estreñimiento (en SII-D y SII-C)',
    key_components: [
      'Fase 1 (0-6 sem): eliminar todos los FODMAPs altos (trigo, lactosa, legumbres, cebolla, ajo, manzana, pera, mango, sandía, miel, High-Fructose Corn Syrup)',
      'Fase 2 (7-10 sem): reintroducción gradual por grupos (lactosa, fructanos, manitol, sorbitol, galactanos)',
      'Fase 3 (>10 sem): solo FODMAPs problemáticos para el individuo (personalización)',
    ],
    contraindicaciones:
      'Enfermedad celíaca (primero eliminar gluten), EII en flare activo, дисбиоз severo. No usar como dieta de mantenimiento (puede afectar microbiota).',
    sources: [
      'Halpert et al. Low-FODMAP diet for IBS. Gastroenterology 2020;158:1249-61.',
      'Tuck CJ et al. Low-FODMAPs: a critique of the evidence. J Nutr 2023;153:2679-91.',
    ],
  },
]

// ---- Utilities ----
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function frontmatter(data) {
  const lines = Object.entries(data)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => {
      if (typeof v === 'string' && (v.includes('\n') || v.length > 60)) {
        return `${k}: |\n${v
          .split('\n')
          .map((l) => `  ${l}`)
          .join('\n')}`
      }
      if (Array.isArray(v))
        return `${k}: [${v.map((x) => `"${x}"`).join(', ')}]`
      return `${k}: "${v}"`
    })
  return `---\n${lines.join('\n')}\n---\n`
}

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true })
}

async function fileExists(file) {
  try {
    await readFile(file, 'utf-8')
    return true
  } catch {
    return false
  }
}

async function main() {
  const vitaminsDir = join(ROOT, 'src', 'content', 'vitamins')
  const conditionsDir = join(ROOT, 'src', 'content', 'conditions')
  const dietsDir = join(ROOT, 'src', 'content', 'diets')

  await ensureDir(vitaminsDir)
  await ensureDir(conditionsDir)
  await ensureDir(dietsDir)

  // --- Vitamins ---
  console.log('\n=== VITAMINS ===')
  for (const v of VITAMINS) {
    const id = slugify(`${v.code}-${v.name.split(' ')[1]}`)
    const file = join(vitaminsDir, `${id}.md`)
    if (await fileExists(file)) {
      console.log(`  SKIP (exists): ${id}.md`)
      continue
    }
    const content = frontmatter({
      name: v.name,
      code: v.code,
      aliases: v.aliases,
      group: 'vitamin',
      unit: v.unit,
      rda: v.rda,
      ul: v.ul,
      rdi: v.rdi || null,
      sources: v.sources,
      function: v.function,
      deficiency: v.deficiency,
      excess: v.excess,
    })
    await writeFile(file, content, 'utf-8')
    console.log(`  CREATED: ${id}.md`)
  }

  // --- Conditions ---
  console.log('\n=== CONDITIONS ===')
  for (const c of CONDITIONS) {
    const file = join(conditionsDir, `${c.id}.md`)
    if (await fileExists(file)) {
      console.log(`  SKIP (exists): ${c.id}.md`)
      continue
    }
    const content = frontmatter({
      name: c.name,
      category: c.category,
      icd10: c.icd10,
      icd10_name: c.icd10_name,
      evidence_level: c.evidence_level,
      prevalence: c.prevalence,
      description: c.description,
      mechanisms: c.mechanisms,
      sources: c.sources,
    })
    await writeFile(file, content, 'utf-8')
    console.log(`  CREATED: ${c.id}.md`)
  }

  // --- Diets ---
  console.log('\n=== DIETS ===')
  for (const d of DIETS) {
    const file = join(dietsDir, `${d.id}.md`)
    if (await fileExists(file)) {
      console.log(`  SKIP (exists): ${d.id}.md`)
      continue
    }
    const content = frontmatter({
      name: d.name,
      aliases: d.aliases,
      description: d.description,
      evidence_level: d.evidence_level,
      outcomes: d.outcomes,
      key_components: d.key_components,
      contraindications: d.contraindicaciones || d.contraindications || null,
      sources: d.sources,
    })
    await writeFile(file, content, 'utf-8')
    console.log(`  CREATED: ${d.id}.md`)
  }

  console.log('\n✅ Seed complete.')
}

main().catch(console.error)
