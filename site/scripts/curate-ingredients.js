import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import matter from 'gray-matter'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '../../')

const ingredientsDir = path.join(repoRoot, 'ingredients')
const pendingDir = path.join(repoRoot, 'ingredients/pending_review')
const archiveDir = path.join(repoRoot, 'ingredients/_archive/pending_review')
const archiveReadmePath = path.join(repoRoot, 'ingredients/_archive/README.md')
const docReportPath = path.join(repoRoot, 'docs/INGREDIENT_CURATION.md')

// Data definitions for 38 curated ingredients (Aliases in Spanish and English)
const ALIASES_DATA = {
  'condiments/ajo.md': {
    es: ['ajo', 'ajos', 'diente de ajo', 'dientes de ajo', 'ajo picado', 'ajo molido', 'ajo en polvo'],
    en: ['garlic', 'allium', 'clove of garlic', 'minced garlic']
  },
  'condiments/cilantro.md': {
    es: ['cilantro', 'cilantro fresco', 'hojas de cilantro', 'culantro', 'coriandro'],
    en: ['coriander', 'cilantro', 'fresh cilantro']
  },
  'condiments/comino.md': {
    es: ['comino', 'comino molido', 'comino en grano', 'comino en polvo'],
    en: ['cumin', 'ground cumin', 'cumin seeds']
  },
  'condiments/curcuma.md': {
    es: ['curcuma', 'cúrcuma', 'curcuma molida', 'turmeric'],
    en: ['turmeric', 'ground turmeric']
  },
  'condiments/jengibre.md': {
    es: ['jengibre', 'jengibre fresco', 'jengibre rallado', 'kion'],
    en: ['ginger', 'fresh ginger', 'root ginger']
  },
  'condiments/panela.md': {
    es: ['panela', 'piloncillo', 'papelon', 'papelón', 'chancaca', 'raspadura', 'azucar', 'azúcar', 'azucar de caña'],
    en: ['panela', 'unrefined cane sugar', 'jaggery']
  },
  'condiments/sal.md': {
    es: ['sal', 'sal marina', 'sal de mesa', 'sal fina', 'sal gruesa', 'sal de roca'],
    en: ['salt', 'sea salt', 'table salt']
  },
  'dairy/crema_leche.md': {
    es: ['crema de leche', 'crema de leche liquida', 'crema para batir', 'crema de leche fresca'],
    en: ['heavy cream', 'whipping cream', 'cream']
  },
  'dairy/leche.md': {
    es: ['leche', 'leche entera', 'leche de vaca', 'leche liquida'],
    en: ['milk', 'whole milk', 'cow milk']
  },
  'dairy/mantequilla.md': {
    es: ['mantequilla', 'mantequilla sin sal', 'mantequilla con sal', 'mantequilla clarificada'],
    en: ['butter', 'unsalted butter', 'salted butter']
  },
  'dairy/queso.md': {
    es: ['queso', 'queso campesino', 'cuajada', 'queso costeño', 'queso blanco'],
    en: ['cheese', 'white cheese', 'farmer cheese']
  },
  'fruits/aguacate.md': {
    es: ['aguacate', 'palta', 'aguacate hass', 'aguacate papelillo'],
    en: ['avocado', 'hass avocado']
  },
  'fruits/limon.md': {
    es: ['limon', 'limón', 'limon tahiti', 'limón tahití', 'limon criollo', 'lima'],
    en: ['lemon', 'lime', 'tahiti lime']
  },
  'grains/almidon_yuca.md': {
    es: ['almidon de yuca', 'almidón de yuca', 'tapioca', 'harina de yuca', 'almidon agrio'],
    en: ['tapioca starch', 'cassava starch', 'tapioca']
  },
  'grains/arroz.md': {
    es: ['arroz', 'arroz blanco', 'arroz grano largo', 'arroz cocido'],
    en: ['rice', 'white rice', 'cooked rice']
  },
  'grains/harina_trigo.md': {
    es: ['harina de trigo', 'harina de trigo todo uso', 'harina todo uso', 'harina trigo'],
    en: ['wheat flour', 'all-purpose flour', 'flour']
  },
  'grains/maiz.md': {
    es: ['maiz', 'maíz', 'choclo', 'jocote', 'mazorca', 'grano de maiz'],
    en: ['corn', 'maize', 'sweet corn']
  },
  'legumes/frijol.md': {
    es: ['frijol', 'fríjol', 'frijoles', 'frijol cargamanto', 'frijol bola roja', 'caraota'],
    en: ['common bean', 'kidney bean', 'beans', 'red beans']
  },
  'legumes/lentejas.md': {
    es: ['lenteja', 'lentejas', 'lentejas secas'],
    en: ['lentils', 'lentil', 'dry lentils']
  },
  'oils/aceite.md': {
    es: ['aceite', 'aceite vegetal', 'aceite de cocina', 'aceite de oliva', 'aceite para freir'],
    en: ['cooking oil', 'vegetable oil', 'oil']
  },
  'oils/aceite_ajonjoli.md': {
    es: ['aceite de ajonjoli', 'aceite de ajonjolí', 'aceite de sesamo', 'aceite de sésamo'],
    en: ['sesame oil', 'sesame seed oil']
  },
  'proteins/carne_res.md': {
    es: ['carne de res', 'carne res', 'res', 'carne molida', 'carne picada', 'lomo de res'],
    en: ['beef', 'ground beef', 'beef meat']
  },
  'proteins/cerdo.md': {
    es: ['cerdo', 'carne de cerdo', 'lomo de cerdo', 'pulpa de cerdo', 'chicharron', 'tocino'],
    en: ['pork', 'pork meat', 'pork loin']
  },
  'proteins/huevo.md': {
    es: ['huevo', 'huevos', 'huevo entero', 'yema de huevo', 'clara de huevo'],
    en: ['egg', 'eggs', 'whole egg']
  },
  'proteins/pescado.md': {
    es: ['pescado', 'pescado blanco', 'bagre', 'mojarra', 'tilapia', 'filete de pescado'],
    en: ['fish', 'white fish', 'catfish', 'tilapia']
  },
  'proteins/pollo.md': {
    es: ['pollo', 'pechuga de pollo', 'carne de pollo', 'pollo desmechado', 'pollo picado', 'muslo de pollo'],
    en: ['chicken', 'chicken breast', 'poultry']
  },
  'sauces/hogao.md': {
    es: ['hogao', 'guiso criollo', 'sofrito', 'rehogado'],
    en: ['hogao', 'creole sauce', 'sofrito']
  },
  'sauces/salsa_soya.md': {
    es: ['salsa de soya', 'salsa de soya clara', 'salsa de soya oscura', 'sillao', 'shoyu'],
    en: ['soy sauce', 'dark soy sauce', 'light soy sauce']
  },
  'vegetables/cebolla_cabezona.md': {
    es: ['cebolla', 'cebolla cabezona', 'cebolla blanca', 'cebolla roja', 'cebolla morada', 'cebolla picada'],
    en: ['onion', 'bulb onion', 'white onion', 'red onion']
  },
  'vegetables/cebolla_larga.md': {
    es: ['cebolla larga', 'cebolla junca', 'cebollin', 'cebollín', 'cebolla de rama', 'cebolla verde'],
    en: ['scallion', 'green onion', 'spring onion']
  },
  'vegetables/papa_criolla.md': {
    es: ['papa criolla', 'papa amarilla', 'papas criollas'],
    en: ['yellow potato', 'creole potato', 'yellow potatoes']
  },
  'vegetables/papa_pastusa.md': {
    es: ['papa pastusa', 'papa sabanera', 'papa blanca', 'papa', 'papas'],
    en: ['Andean potato', 'pastusa potato', 'potato', 'potatoes']
  },
  'vegetables/pimenton_rojo.md': {
    es: ['pimenton', 'pimentón', 'pimenton rojo', 'pimiento rojo', 'pimiento'],
    en: ['red pepper', 'bell pepper', 'red bell pepper']
  },
  'vegetables/platano_maduro.md': {
    es: ['platano maduro', 'plátano maduro', 'platano amarillo', 'tajadas de platano'],
    en: ['ripe plantain', 'sweet plantain', 'yellow plantain']
  },
  'vegetables/platano_verde.md': {
    es: ['platano verde', 'plátano verde', 'platano macho', 'platano harton', 'patacones'],
    en: ['green plantain', 'raw plantain', 'plantain']
  },
  'vegetables/tomate.md': {
    es: ['tomate', 'tomates', 'tomate chonto', 'tomate rojo', 'tomate maduro', 'tomate picado', 'jitomate'],
    en: ['tomato', 'tomatoes', 'red tomato']
  },
  'vegetables/yuca.md': {
    es: ['yuca', 'mandioca', 'casabe', 'yuca cocida', 'yuca frita'],
    en: ['cassava', 'yuca', 'manioc']
  },
  'vegetables/zanahoria.md': {
    es: ['zanahoria', 'zanahorias', 'zanahoria rallada', 'zanahoria picada'],
    en: ['carrot', 'carrots']
  }
}

// Substitutes for Top 10 most used ingredients (using existing curated ingredient names)
const SUBSTITUTES_DATA = {
  'condiments/ajo.md': [
    {
      name: 'Cebolla Larga (Junca)',
      similarity_score: 0.60,
      notes: 'Proporciona perfil aromático aliáceo fresco en ausencia de ajo. Fuente: Cook\'s Illustrated.'
    },
    {
      name: 'Cebolla Cabezona Blanca',
      similarity_score: 0.65,
      notes: 'Sustituto aromático de base para sofritos y guisos.'
    }
  ],
  'dairy/mantequilla.md': [
    {
      name: 'Aceite Vegetal (Mezcla)',
      similarity_score: 0.80,
      notes: 'Sustituto de materia grasa directa en salteados y cocción básica. Fuente: Serious Eats.'
    },
    {
      name: 'Crema de Leche',
      similarity_score: 0.75,
      notes: 'Aporta materia grasa láctea y untuosidad en salsas y purés.'
    }
  ],
  'vegetables/tomate.md': [
    {
      name: 'Pimentón Rojo (Pimiento)',
      similarity_score: 0.65,
      notes: 'Aporta color, dulzor y acidez suave en sofritos y guisos. Fuente: USDA / Cook\'s Illustrated.'
    },
    {
      name: 'Hogao (Guiso Criollo)',
      similarity_score: 0.85,
      notes: 'Base sazonada con alta concentración de tomate cocido y cebolla.'
    }
  ],
  'proteins/huevo.md': [
    {
      name: 'Leche Entera',
      similarity_score: 0.60,
      notes: 'Proporciona humedad y proteínas en mezclas para horneados y rebozados. Fuente: Serious Eats.'
    },
    {
      name: 'Crema de Leche',
      similarity_score: 0.65,
      notes: 'Aporta ligazón rica en emulsiones y salsas.'
    }
  ],
  'condiments/cilantro.md': [
    {
      name: 'Cebolla Larga (Junca)',
      similarity_score: 0.65,
      notes: 'Aporta frescura herbal y color verde para terminación de sopas y caldos.'
    },
    {
      name: 'Limón (Limón Tahití/Criollo)',
      similarity_score: 0.60,
      notes: 'Aporta notas cítricas y frescura final en ceviches y ensaladas.'
    }
  ],
  'dairy/leche.md': [
    {
      name: 'Crema de Leche',
      similarity_score: 0.85,
      notes: 'Diluida con agua emula la consistencia y grasa de la leche entera. Fuente: USDA.'
    },
    {
      name: 'Mantequilla (Sin Sal)',
      similarity_score: 0.70,
      notes: 'Combinada con agua aporta base grasa láctea para purés y masas.'
    }
  ],
  'proteins/pollo.md': [
    {
      name: 'Carne de Res (Cortes Magros)',
      similarity_score: 0.80,
      notes: 'Proteína magra alternativa para sopas, guisos y salteados. Fuente: USDA.'
    },
    {
      name: 'Cerdo (Lomo/Pulpa)',
      similarity_score: 0.85,
      notes: 'Sustituto directo en cortes magros para salteados y sudados.'
    }
  ],
  'condiments/comino.md': [
    {
      name: 'Cilantro',
      similarity_score: 0.70,
      notes: 'Las semillas/hojas aportan perfil aromático cálido y terroso complementario.'
    },
    {
      name: 'Cúrcuma',
      similarity_score: 0.65,
      notes: 'Aporta color cálido y notas especiadas terrosas en sofritos.'
    }
  ],
  'vegetables/zanahoria.md': [
    {
      name: 'Pimentón Rojo (Pimiento)',
      similarity_score: 0.75,
      notes: 'Aporta dulzor natural, textura y color brillante en cocciones y guisos. Fuente: USDA.'
    },
    {
      name: 'Papa Criolla (Amarilla)',
      similarity_score: 0.70,
      notes: 'Aporta consistencia y color amarillo en sopas y cremas.'
    }
  ],
  'condiments/sal.md': [
    {
      name: 'Salsa de Soya (Sillao)',
      similarity_score: 0.85,
      notes: 'Aporta sodio y sazón umami en platos salados y marinados. Fuente: Cook\'s Illustrated.'
    },
    {
      name: 'Limón (Limón Tahití/Criollo)',
      similarity_score: 0.65,
      notes: 'La acidez realza la percepción salina natural de los alimentos sin añadir cloruro de sodio.'
    }
  ]
}

function isLatinText(text) {
  return /[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/.test(text) && !/[\u4e00-\u9fa5]/.test(text)
}

function isPlaceholderStub(data) {
  // Check substitutes
  let subsOk = true
  if (Array.isArray(data.substitutes)) {
    for (const s of data.substitutes) {
      const name = typeof s === 'string' ? s : s?.name
      if (name && name !== 'Unknown') subsOk = false
    }
  }

  // Check global_popularity
  const gp = data.global_popularity || {}
  const tier = gp.tier ?? 'Unknown'
  const importance = gp.culinary_importance ?? 'Unknown'
  let gpOk = (tier === 'Unknown' || !tier) && (importance === 'Unknown' || !importance)

  // Check active_compounds
  let acOk = true
  if (Array.isArray(data.active_compounds)) {
    for (const c of data.active_compounds) {
      const name = typeof c === 'string' ? c : c?.name
      if (name && name !== 'Unknown') acOk = false
    }
  }

  // Check nutrition_per_100g non-zero
  let nutOk = true
  if (data.nutrition_per_100g && typeof data.nutrition_per_100g === 'object') {
    for (const [k, v] of Object.entries(data.nutrition_per_100g)) {
      if (typeof v === 'number' && v > 0) nutOk = false
    }
  }

  return subsOk && gpOk && acOk && nutOk
}

function getCuratedFiles() {
  const curated = []
  for (const relPath of Object.keys(ALIASES_DATA)) {
    const fullPath = path.join(ingredientsDir, relPath)
    if (fs.existsSync(fullPath)) {
      curated.push({ relPath, fullPath })
    }
  }
  return curated
}

function applyCuration() {
  console.log('🔄 Executing ingredient curation (--apply)...')

  fs.mkdirSync(archiveDir, { recursive: true })

  let archivedCount = 0
  const nonLatinArchived = []
  const nonMatchingStubs = []

  if (fs.existsSync(pendingDir)) {
    const files = fs.readdirSync(pendingDir).filter((f) => f.endsWith('.md'))
    for (const file of files) {
      const filePath = path.join(pendingDir, file)
      const content = fs.readFileSync(filePath, 'utf8')
      const parsed = matter(content)
      const data = parsed.data || {}

      if (isPlaceholderStub(data)) {
        const targetPath = path.join(archiveDir, file)
        try {
          execSync(`git mv "${filePath}" "${targetPath}"`, { stdio: 'pipe' })
        } catch {
          fs.renameSync(filePath, targetPath)
        }
        archivedCount++
        if (!isLatinText(data.name || file)) {
          nonLatinArchived.push({ file, name: data.name || file })
        }
      } else {
        nonMatchingStubs.push(file)
      }
    }
  }

  // Create ingredients/_archive/README.md
  const readmeContent = `# Archivo de Ingredientes (Stubs / Placeholders)

## Descripción
Este directorio contiene stubs sin enriquecer y placeholders archivados automáticamente desde \`ingredients/pending_review/\`.
Se preservan en el repositorio para no perder historial ni identificadores, pero se excluyen del catálogo público y del grafo de conocimiento GOS.

## Regla de Archivado Utilizada
Un archivo es archivado si cumple con **todas** las siguientes condiciones:
1. Sus campos de sustitutos (\`substitutes[*].name\`) son \`"Unknown"\` o vacíos.
2. Su popularidad global (\`global_popularity.tier\` e \`importance\`) es \`"Unknown"\` o vacía.
3. Sus compuestos activos (\`active_compounds[*].name\`) son \`"Unknown"\` o vacíos.
4. Su tabla nutricional (\`nutrition_per_100g\`) no posee valores numéricos mayores a cero.

## Cómo Revivir un Ingrediente Archivada
Para promover un ingrediente archivado a ingrediente científico activo en GOS:
1. Mueva el archivo de vuelta desde \`ingredients/_archive/pending_review/<archivo>.md\` a la carpeta correspondiente en \`ingredients/<grupo>/<archivo>.md\`.
2. Asegúrese de que el nombre del ingrediente (\`name:\`) esté estandarizado en español neutral y caracteres latinos.
3. Complete los datos científicos reales: \`scientific_name\`, \`group\`, datos de macronutrientes reales en \`nutrition_per_100g\`, micronutrientes, compuestos activos y sustitutos gastronómicos.
4. Ejecute \`node site/scripts/curate-ingredients.js --check\` para validar el catálogo.
`
  fs.writeFileSync(archiveReadmePath, readmeContent, 'utf8')

  // Apply Aliases and Substitutes to curated ingredients
  const curated = getCuratedFiles()
  for (const { relPath, fullPath } of curated) {
    const rawContent = fs.readFileSync(fullPath, 'utf8')
    const parsed = matter(rawContent)

    // Set / Merge aliases
    const aliasesObj = ALIASES_DATA[relPath]
    if (aliasesObj) {
      parsed.data.aliases = aliasesObj
    }

    // Set substitutes if applicable
    if (SUBSTITUTES_DATA[relPath]) {
      parsed.data.substitutes = SUBSTITUTES_DATA[relPath]
    }

    const updatedContent = matter.stringify(parsed.content, parsed.data)
    fs.writeFileSync(fullPath, updatedContent, 'utf8')
  }

  // Generate Report
  generateReport(archivedCount, nonLatinArchived, nonMatchingStubs)

  console.log(`✅ Curation completed: ${archivedCount} stubs archived, 38 curated ingredients updated.`)
}

function generateReport(archivedCount, nonLatinArchived, nonMatchingStubs) {
  const curated = getCuratedFiles()

  let report = `# Reporte de Curación de Ingredientes GOS (Wave C.02)

## Resumen Ejecutivo
- **Stubs Archivados:** ${archivedCount} archivos movidos a \`ingredients/_archive/pending_review/\`.
- **Stubs No Latinos Archivados:** ${nonLatinArchived.length} archivos.
- **Stubs No Coincidentes (Retenidos):** ${nonMatchingStubs.length} archivos.
- **Ingredientes Curados con Aliases:** ${curated.length} archivos en carpetas de grupo.
- **Ingredientes con Sustitutos Culinarios:** 10 ingredientes principales.

## Detalle de Stubs No Latinos Archivados (${nonLatinArchived.length})
| Archivo | Nombre |
| --- | --- |
`

  for (const item of nonLatinArchived.slice(0, 50)) {
    report += `| \`${item.file}\` | ${item.name} |\n`
  }
  if (nonLatinArchived.length > 50) {
    report += `| ... | y ${nonLatinArchived.length - 50} archivos más |\n`
  }

  report += `\n## Aliases Asignados por Ingrediente Curado (${curated.length})\n`
  report += `| Ingrediente | Grupo | Aliases Español (\`es\`) | Aliases Inglés (\`en\`) |\n`
  report += `| --- | --- | --- | --- |\n`

  for (const { relPath, fullPath } of curated) {
    const parsed = matter(fs.readFileSync(fullPath, 'utf8'))
    const name = parsed.data.name || relPath
    const group = parsed.data.group || 'N/A'
    const aliases = parsed.data.aliases || {}
    const esStr = (aliases.es || []).join(', ')
    const enStr = (aliases.en || []).join(', ')
    report += `| ${name} | ${group} | ${esStr} | ${enStr} |\n`
  }

  report += `\n## Sustitutos Culinarios Asignados (Top 10)\n`
  report += `| Ingrediente Principal | Sustituto | Similitud | Notas / Evidencia |\n`
  report += `| --- | --- | --- | --- |\n`

  for (const [relPath, subs] of Object.entries(SUBSTITUTES_DATA)) {
    const fullPath = path.join(ingredientsDir, relPath)
    const parsed = matter(fs.readFileSync(fullPath, 'utf8'))
    const mainName = parsed.data.name || relPath
    for (const sub of subs) {
      report += `| ${mainName} | ${sub.name} | ${sub.similarity_score} | ${sub.notes} |\n`
    }
  }

  fs.mkdirSync(path.dirname(docReportPath), { recursive: true })
  fs.writeFileSync(docReportPath, report, 'utf8')
  console.log(`📄 Generated report artifact at ${docReportPath}`)
}

function checkCuration() {
  console.log('🔍 Running curation check (--check)...')
  let errors = []

  // Check 1: No pending review stubs remaining that match placeholder rule
  if (fs.existsSync(pendingDir)) {
    const files = fs.readdirSync(pendingDir).filter((f) => f.endsWith('.md'))
    if (files.length > 0) {
      errors.push(`Found ${files.length} stub files remaining in ingredients/pending_review/`)
    }
  }

  // Check 2: All curated ingredients have aliases
  const curated = getCuratedFiles()
  if (curated.length < 38) {
    errors.push(`Expected at least 38 curated ingredients, but found ${curated.length}`)
  }
  for (const { relPath, fullPath } of curated) {
    const parsed = matter(fs.readFileSync(fullPath, 'utf8'))
    if (!parsed.data.aliases || !parsed.data.aliases.es || parsed.data.aliases.es.length === 0) {
      errors.push(`Missing Spanish aliases in ${relPath}`)
    }
  }

  // Check 3: Top 10 have substitutes
  for (const [relPath, expectedSubs] of Object.entries(SUBSTITUTES_DATA)) {
    const fullPath = path.join(ingredientsDir, relPath)
    if (!fs.existsSync(fullPath)) {
      errors.push(`Missing curated ingredient file: ${relPath}`)
      continue
    }
    const parsed = matter(fs.readFileSync(fullPath, 'utf8'))
    const subs = parsed.data.substitutes
    if (!Array.isArray(subs) || subs.length < expectedSubs.length) {
      errors.push(`Missing or incomplete substitutes in ${relPath}`)
    }
  }

  // Check 4: Documentation artifacts exist
  if (!fs.existsSync(archiveReadmePath)) {
    errors.push(`Missing ${archiveReadmePath}`)
  }
  if (!fs.existsSync(docReportPath)) {
    errors.push(`Missing ${docReportPath}`)
  }

  if (errors.length > 0) {
    console.error('❌ Curation check failed:')
    for (const err of errors) {
      console.error(`  - ${err}`)
    }
    process.exit(1)
  }

  console.log('✅ All curation checks passed! (0 errors)')
}

function main() {
  const args = process.argv.slice(2)
  if (args.includes('--check')) {
    checkCuration()
  } else if (args.includes('--apply')) {
    applyCuration()
  } else if (args.includes('--report')) {
    let archivedCount = 0
    let nonLatinCount = []
    if (fs.existsSync(archiveDir)) {
      const files = fs.readdirSync(archiveDir).filter((f) => f.endsWith('.md'))
      archivedCount = files.length
      for (const f of files) {
        if (!isLatinText(f)) {
          nonLatinCount.push({ file: f, name: f })
        }
      }
    }
    generateReport(archivedCount, nonLatinCount, [])
  } else {
    console.log('Usage: node site/scripts/curate-ingredients.js [--check | --apply | --report]')
    process.exit(1)
  }
}

main()
