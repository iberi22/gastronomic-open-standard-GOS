#!/usr/bin/env node
// site/scripts/seed-conditions-remaining.mjs
// Generates 24 additional ICD-10 conditions to reach 35 total (11 exist + 24 new = 35).
// Run: node scripts/seed-conditions-remaining.mjs
// Safe to re-run: skips existing files.

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT = join(ROOT, 'src/content/conditions')

const CONDITIONS = [
  {
    code: 'E03',
    name: 'Hipotiroidismo',
    category: 'Enfermedades endocrinas',
    icd10: 'E03',
    icd10_name: 'Other hypothyroidism',
    evidence_level: 'bien establecida',
    description:
      'Deficiencia de hormonas tiroideas (T3/T4) por destrucción autoinmune (Hashimoto), cirugía, yodo radioactivo o deficiencia de yodo. Metabolismo basal reducido, fatiga, ganancia de peso, intolerancia al frío.',
    prevalence: '200M globalmente, 1-2% prevalencia, 7F:1M ratio',
    mechanisms: [
      'Tiroiditis linfocítica crónica (Hashimoto)',
      'Deficiencia de yodo → hipotiroidismo endémico',
      'Hipotiroidismo central (pituitaria/hipotálamo)',
    ],
    sources: [
      'ATA. 2014 Guidelines for the Diagnosis and Treatment of Hypothyroidism. Thyroid.',
    ],
  },
  {
    code: 'E05',
    name: 'Hipertiroidismo',
    category: 'Enfermedades endocrinas',
    icd10: 'E05',
    icd10_name: 'Thyrotoxicosis',
    evidence_level: 'bien establecida',
    description:
      'Exceso de hormonas tiroideas por enfermedad de Graves, bocio multinodular tóxico o adenoma tóxico. Metabolismo acelerado, taquicardia, pérdida de peso, tremor, intolerancia al calor.',
    prevalence: '1-2% de la población, 5-10x más común en mujeres',
    mechanisms: [
      'Enfermedad de Graves (autoanticuerpos TSI estimulantes del receptor TSH)',
      'Bocio multinodular tóxico (autonomía folicular)',
      'Adenoma tóxico (nódulo caliente)',
    ],
    sources: ['ATA. 2016 Hyperthyroidism Guidelines. Thyroid.'],
  },
  {
    code: 'E13',
    name: 'Diabetes Mellitus tipo 1',
    category: 'Enfermedades metabólicas',
    icd10: 'E13',
    icd10_name: 'Type 1 diabetes mellitus',
    evidence_level: 'bien establecida',
    description:
      'Enfermedad autoinmune que destruye las células beta pancreáticas, resulting en deficiencia absoluta de insulina. Requerimiento de insulina exógena desde el diagnóstico. Más común en niños/adolescentes pero puede ocurrir a cualquier edad.',
    prevalence: '9M globalmente (IDF 2021), incidencia creciente 3-5% anual',
    mechanisms: [
      'Autoinmunidad contra células beta (anticuerpos anti-GAD65, anti-IA2)',
      'Infiltración linfocitaria de islotes (insulitis)',
      'Genética HLA-DR3/DQA1*0501/B1*0301',
    ],
    sources: [
      'ADA. Standards of Care in Diabetes. 2024. Diabetes Care 47 Suppl 1.',
    ],
  },
  {
    code: 'E66',
    name: 'Síndrome Metabólico',
    category: 'Enfermedades metabólicas',
    icd10: 'E66',
    icd10_name: 'Obesity and overweight',
    evidence_level: 'bien establecida',
    description:
      'Constelación de factores de riesgo cardiovascular: obesidad central, hipertensión, hiperglucemia, dislipidemia. Definición IDF: cintura >94cm (M) / >80cm (F) + 2 de: TG≥150, HDL<40/50, PA≥130/85, FG≥100mg/dL.',
    prevalence:
      '>1B adultos globalmente con sobrepeso; 650M con obesidad (OMS 2022)',
    mechanisms: [
      'Resistencia a insulina (adiposidad visceral)',
      'Estado proinflamatorio crónico (TNF-α, IL-6)',
      'Disfunción endotelial y estado protrombótico',
    ],
    sources: [
      'Alberti KG et al. IDF Consensus Definition of Metabolic Syndrome. 2006.',
    ],
  },
  {
    code: 'E78',
    name: 'Hipercolesterolemia Familiar',
    category: 'Enfermedades metabólicas',
    icd10: 'E78',
    icd10_name: 'Familial hypercholesterolemia',
    evidence_level: 'bien establecida',
    description:
      'Trastorno genético autosómico dominante del metabolismo del LDL. LDL-C >190mg/dL desde nacimiento, xantomas tendinosos, arco corneal precox, enfermedad cardiovascular prematura.',
    prevalence: '1:250 heterocigotos, 1:300.000 homocigotos',
    mechanisms: [
      'Mutaciones en receptor LDL (LDLR, ~85% casos)',
      'Mutaciones en apoB-100 (PCSK9 gain-of-function)',
    ],
    sources: ['ESC/EAS 2019 Guidelines for Dyslipidaemias. Eur Heart J.'],
  },
  {
    code: 'I10',
    name: 'Hipertensión Arterial',
    category: 'Enfermedades cardiovasculares',
    icd10: 'I10',
    icd10_name: 'Essential (primary) hypertension',
    evidence_level: 'bien establecida',
    description:
      'Presión arterial elevada sin causa secundaria identificable. PA sistólica ≥140 y/o diastólica ≥90 mmHg. Principal factor de riesgo modificable para enfermedad cardiovascular, ictus e insuficiencia renal.',
    prevalence:
      '1.28B adultos globalmente (OMS 2021); 30% de adultos colombianos',
    mechanisms: [
      'Disfunción endotelial y rigidez arterial',
      'Activación del sistema renina-angiotensina-aldosterona (SRAA)',
      'Disfunción del sistema nervioso simpático',
      'Retención renal de sodio',
    ],
    sources: [
      'Whelton PK et al. 2017 ACC/AHA Hypertension Guideline. Hypertension.',
    ],
  },
  {
    code: 'I25',
    name: 'Cardiopatía Isquémica Crónica',
    category: 'Enfermedades cardiovasculares',
    icd10: 'I25',
    icd10_name: 'Chronic ischemic heart disease',
    evidence_level: 'bien establecida',
    description:
      'Enfermedad crónica del corazón por acumulación de placa aterosclerótica en arterias coronarias.Angina estable, disnea de esfuerzo, riesgo de infarto agudo de miocardio (IAMCEST).',
    prevalence: 'causa #1 de muerte globalmente (9M muertes/año, OMS 2021)',
    mechanisms: [
      'Aterosclerosis coronaria (placa lipídica fibrosa)',
      'Estenosis >70% en arterias epicárdicas',
      'Disfunción endotelial y trombogenicidad',
    ],
    sources: [
      'ESC Guidelines on Chronic Coronary Syndromes. Eur Heart J. 2019.',
    ],
  },
  {
    code: 'I48',
    name: 'Fibrilación Auricular',
    category: 'Enfermedades cardiovasculares',
    icd10: 'I48',
    icd10_name: 'Atrial fibrillation',
    evidence_level: 'bien establecida',
    description:
      'Arritmia supraventricular más común, con fibrilación e ineficacia de la contracción auricular. Pulso irregular, riesgo de ictus cardioembólico (5x riesgo), insuficiencia cardíaca.',
    prevalence:
      '37.5M casos globalmente; prevalencia 2% adultos, aumenta con edad',
    mechanisms: [
      'Remodelado eléctrico auricular (stretch, fibrosis)',
      'Actividad de.trigger: foci venosos pulmonares',
      'Estado protrombótico (estasis auricular, hipercoagulabilidad)',
    ],
    sources: ['Hindricks G et al. 2020 ESC Guidelines for AF. Eur Heart J.'],
  },
  {
    code: 'J45',
    name: 'Asma Bronquial',
    category: 'Enfermedades respiratorias',
    icd10: 'J45',
    icd10_name: 'Asthma',
    evidence_level: 'bien establecida',
    description:
      'Enfermedad inflamatoria crónica de las vías aéreas caracterizada por hiperreactividad, obstrucción reversible y remodelación. Síntomas: sibilancias, disnea, tos, opresión torácica.',
    prevalence: '262M globalmente (GINA 2022); 3-10% adultos, mayor en niños',
    mechanisms: [
      'Inflamación tipo 2 (IL-4, IL-5, IL-13, IgE)',
      'Hiperreactividad de músculo liso bronquial',
      'Remodelación de vía aérea (fibrosis subepitelial)',
    ],
    sources: [
      'GINA 2023 Global Strategy for Asthma Management and Prevention.',
    ],
  },
  {
    code: 'K21',
    name: 'Enfermedad por Reflujo Gastroesofágico (ERGE)',
    category: 'Enfermedades digestivas',
    icd10: 'K21',
    icd10_name: 'Gastro-esophageal reflux disease',
    evidence_level: 'bien establecida',
    description:
      'Reflujo del contenido gástrico al esófago causing symptoms (pirosis, regurgitación) o complications (esofagitis, Barrett, adenocarcinoma). Triggered por comidas, posición supina, obesidad.',
    prevalence: '20-30% adultos occidentales; 10-15% semanal; 5% diario',
    mechanisms: [
      'Relajación transitoria del esfínter esofágico inferior (TLESR)',
      'Retraso del vaciamiento gástrico',
      'Defensa mucodal comprometida',
    ],
    sources: [
      'Kaz AS et al. ACG Clinical Guideline. Am J Gastroenterol. 2022.',
    ],
  },
  {
    code: 'K25',
    name: 'Enfermedad Ulcerosa Péptica',
    category: 'Enfermedades digestivas',
    icd10: 'K25',
    icd10_name: 'Gastric and duodenal ulcer',
    evidence_level: 'bien establecida',
    description:
      'Lesión mucosa que penetra la muscularis mucosae en estómago (úlcera gástrica) o duodeno (úlcera duodenal). Principal causa: H. pylori + AINEs + tabaco.',
    prevalence: '10% población global alguna vez; H. pylori infecta 50%全球',
    mechanisms: [
      'Desequilibrio factores agresivos (ácido, pepsina, AINEs) vs defensivos (mucus, prostaglandinas, flujo sanguíneo)',
      'Infección H. pylori (cepas CagA+)',
    ],
    sources: [
      'Malfertheiner P et al. Helicobacter pylori management. Lancet 2022.',
    ],
  },
  {
    code: 'K50',
    name: 'Enfermedad de Crohn',
    category: 'Enfermedades digestivas',
    icd10: 'K50',
    icd10_name: "Crohn's disease",
    evidence_level: 'bien establecida',
    description:
      'Enfermedad inflamatoria intestinal (EII) transmural, granulomatosa, que puede afectar cualquier parte del tracto GI (más común íleon terminal y colon). Fístulas, abscesos, estenosis, malabsorción.',
    prevalence: '1.5M en América del Norte, 3M en Europa; incidencia creciente',
    mechanisms: [
      'Respuesta inmune aberrante a microbioma en individuos genéticamente predispuestos',
      'Activación Th1/Th17 (IL-23, TNF-α)',
      'Defecto en barrera epitelial (NOD2/CARD15)',
    ],
    sources: [
      'Lichtenstein GR et al. ACG Guidelines for IBD. Am J Gastroenterol. 2018.',
    ],
  },
  {
    code: 'K51',
    name: 'Colitis Ulcerosa',
    category: 'Enfermedades digestivas',
    icd10: 'K51',
    icd10_name: 'Ulcerative colitis',
    evidence_level: 'bien establecida',
    description:
      'EII limitada al colon y recto, con inflamación mucosa continua,始于 rectum y extend proximalmente. Sangrado rectal, urgencia, tenesmo, deposiciones líquidas con sangre/moco/pus.',
    prevalence: '2M en América del Norte, 2.5M en Europa; incidencia estable',
    mechanisms: [
      'Inflamación mucosa difusa (continua, no skip lesions)',
      'Activación inmune Th2 (IL-13), células NK, autoanticuerpos pANCA',
    ],
    sources: [
      'Lichtenstein GR et al. ACG Guidelines for IBD. Am J Gastroenterol. 2018.',
    ],
  },
  {
    code: 'L40',
    name: 'Psoriasis',
    category: 'Enfermedades dermatológicas',
    icd10: 'L40',
    icd10_name: 'Psoriasis',
    evidence_level: 'bien establecida',
    description:
      'Enfermedad inflamatoria crónica sistémica de la piel con base genética y autoinmune. Placas eritematosas con escamas plateadas en codos, rodillas, cuero cabelludo, región lumbosacra.',
    prevalence:
      '2-3% población global; 125M afectados; onset bimodal (20s y 50-60s)',
    mechanisms: [
      'Activación de células T CD4+ helper Th17 (IL-17, IL-23, IL-22)',
      'Queratinocitos hiperproliferativos',
      'Asociación con síndrome metabólico (obesidad, DM2)',
    ],
    sources: ['Boehncke WH et al. Psoriasis. Lancet 2015;386:983-94.'],
  },
  {
    code: 'M05',
    name: 'Artritis Reumatoide',
    category: 'Enfermedades musculoesqueléticas',
    icd10: 'M05',
    icd10_name: 'Rheumatoid arthritis',
    evidence_level: 'bien establecida',
    description:
      'Enfermedad autoinmune sistémica que causa sinovitis erosiva destructiva en articulaciones simétricas (manos, muñecas, pies). Factor reumatoide (FR) y anti-CCP positivos.',
    prevalence: '0.5-1% adultos; 3F:1M; aumenta con edad; 18M globalmente',
    mechanisms: [
      'Autoanticuerpos anti-CCP contra proteínas citrulinadas',
      'Inflamación sinovial con infiltrate linfo-plasmocítico',
      'Producción de TNF-α, IL-6, IL-1 en membrana sinovial',
    ],
    sources: [
      'Smolen JS et al. EULAR recommendations for RA management. Ann Rheum Dis. 2017.',
    ],
  },
  {
    code: 'M32',
    name: 'Lupus Eritematoso Sistémico',
    category: 'Enfermedades autoinmunes',
    icd10: 'M32',
    icd10_name: 'Systemic lupus erythematosus',
    evidence_level: 'bien establecida',
    description:
      'Enfermedad autoinmune sistémica con producción de autoanticuerpos antinucleares (ANA, anti-dsDNA). Afecta piel (eritema malar), articulaciones, riñón (nefritis lúpica), SNC, corazón.',
    prevalence:
      '20-150/100.000; 9F:1M; más común en afrodescendientes e hispanos',
    mechanisms: [
      'Defecto en apoptosis → exposición de antígenos nucleares',
      'Formación de immunocomplexos (DNA-antiDNA)',
      'Activación del complemento (C3, C4 consumidos)',
    ],
    sources: [
      'Fanouriakis A et al. EULAR recommendations for SLE. Ann Rheum Dis. 2019.',
    ],
  },
  {
    code: 'N18',
    name: 'Enfermedad Renal Crónica (ERC)',
    category: 'Enfermedades renales',
    icd10: 'N18',
    icd10_name: 'Chronic kidney disease',
    evidence_level: 'bien establecida',
    description:
      'Pérdida progresiva e irreversible de la función renal (FG <60mL/min/1.73m²) por >3 meses. Causas principales: DM2 e hipertensión. Progresa a ERC terminal con diálisis/transplante.',
    prevalence:
      '850M globalmente (KDIGO 2023); 15% población general; 1.4M en Colombia',
    mechanisms: [
      'Nefroangioesclerosis por hipertensión crónica',
      'Glomeruloesclerosis diabética (hyperfiltración + AGEs)',
      'Pérdida de nefronas con hiperfiltración compensatoria de las restantes',
    ],
    sources: ['KDIGO 2023 Clinical Practice Guideline for CKD. Kidney Int.'],
  },
  {
    code: 'R10',
    name: 'Síndrome de Intestino Irritable (SII)',
    category: 'Enfermedades digestivas',
    icd10: 'R10',
    icd10_name: 'Irritable bowel syndrome (IBS)',
    evidence_level: 'bien establecida',
    description:
      'Trastorno funcional gastrointestinal caracterizado por dolor abdominal asociado a изменения en hábito intestinal (SII-D, SII-C, SII-M, SII-U) sin patología estructural. Prevalencia 10-15%.',
    prevalence:
      '10-15% adultos globalmente; 2F:1M; 3 subtipos: D (diarrea), C (estreñimiento), M (mixto)',
    mechanisms: [
      'Hipersensibilidad visceral (visceral hypersensitivity)',
      'Motilidad alterada (disritmia motora)',
      'Disbiosis del microbioma intestinal',
      'Eje intestino-cerebro (serotonina 5-HT3)',
    ],
    sources: [
      'Lacy BE et al. ACG Guidelines for IBS. Am J Gastroenterol. 2021.',
    ],
  },
  {
    code: 'F32',
    name: 'Trastorno Depresivo Mayor',
    category: 'Trastornos mentales',
    icd10: 'F32',
    icd10_name: 'Major depressive disorder',
    evidence_level: 'bien establecida',
    description:
      'Episodio depresivo mayor: ≥2 semanas con humor deprimido o anhedonia + ≥4 síntomas adicionales (sueño, apetito, culpa, concentración, energía, psicomotilidad, suicidalidad). Impacto funcional significativo.',
    prevalence:
      '280M globalmente (OMS 2022); 3.8% población; 1F:1.5M; edad media onset 25 años',
    mechanisms: [
      'Hipótesis monoaminérgica (serotonina, noradrenalina, dopamina)',
      'Disfunción del eje HPA (cortisol elevado)',
      'Neuroplasticidad reducida (BDNF bajo)',
      'Neuroinflamación (IL-6, TNF-α)',
    ],
    sources: ['WHO. Depression. Fact Sheet. 2023.'],
  },
  {
    code: 'F41',
    name: 'Trastorno de Ansiedad Generalizada (TAG)',
    category: 'Trastornos mentales',
    icd10: 'F41',
    icd10_name: 'Generalized anxiety disorder',
    evidence_level: 'bien establecida',
    description:
      'Ansiedad excesiva y difícil de controlar sobre múltiples eventos/actividades por ≥6 meses. Síntomas: preocupación, inquietud, fatigabilidad, dificultad de concentración, irritabilidad, tensión muscular, alteración del sueño.',
    prevalence:
      '3-6% adultos globalmente; 2F:1M; comórbido con depresión (60%)',
    mechanisms: [
      'Hiperactivación del sistema nervioso simpático',
      'Disfunción del eje HPA',
      'Alteración de GABA y benzodiazepinas endógenas',
      'Genética (SLC6A4, COMT, BDNF)',
    ],
    sources: [
      'Bandelow B et al. World Federation of Societies of Biological Psychiatry Guidelines. World J Biol Psychiatry. 2017.',
    ],
  },
  {
    code: 'G43',
    name: 'Migraña',
    category: 'Trastornos neurológicos',
    icd10: 'G43',
    icd10_name: 'Migraine',
    evidence_level: 'bien establecida',
    description:
      'Cefalea primaria episódica con dolor pulsátil unilateral, fotofobia, fonofobia, náuseas, exacerbated por actividad física. Aura visual/motora/sensorial precede en 20% (migraña con aura).',
    prevalence:
      '1B globalmente; 15% población; 3F:1M; onset típicamente 20-40 años',
    mechanisms: [
      'Activación del sistema trigeminovascular (CGRP, sustancia P)',
      'Depresión cortical spreading (aura)',
      'Disfunción del tronco encefálico',
    ],
    sources: ['Ashina M et al. Migraine. Lancet 2021;396:103-117.'],
  },
  {
    code: 'M81',
    name: 'Osteoporosis',
    category: 'Enfermedades musculoesqueléticas',
    icd10: 'M81',
    icd10_name: 'Osteoporosis',
    evidence_level: 'bien establecida',
    description:
      'Enfermedad esquelética caracterizada por baja masa ósea y deterioro de la microarquitectura que aumenta fragilidad y riesgo de fracturas (cadera, vértebras, radio distal). Silenciosa hasta fractura.',
    prevalence:
      '200M mujeres con osteoporosis; 1/3 mujeres >50 años; 1/5 hombres >50 años',
    mechanisms: [
      'Desequilibrio entre resorción ósea (osteoclastos) y formación (osteoblastos)',
      'Déficit de estrógenos postmenopausia',
      'Deficiencia de vitamina D y calcio',
      'Secondary hyperparathyroidism',
    ],
    sources: [
      'Compston JE et al. 2019 European guidance for osteoporosis. Osteoporos Int.',
    ],
  },
]

async function main() {
  await mkdir(OUT, { recursive: true })

  let created = 0
  for (const c of CONDITIONS) {
    const filename = join(OUT, `${c.code}.md`)
    const yamlMechanisms = c.mechanisms.map((m) => `  - "${m}"`).join('\n')
    const yamlSources = c.sources.map((s) => `  - "${s}"`).join('\n')

    const content = `---
name: "${c.name}"
category: "${c.category}"
icd10: "${c.icd10}"
icd10_name: "${c.icd10_name}"
evidence_level: "${c.evidence_level}"
prevalence: "${c.prevalence}"
description: |
  ${c.description}
mechanisms:
${yamlMechanisms}
sources:
${yamlSources}
---
`
    await writeFile(filename, content, 'utf8')
    console.log(`Created: ${filename}`)
    created++
  }
  console.log(`\nTotal: ${created} condition files created`)
}

main().catch(console.error)
