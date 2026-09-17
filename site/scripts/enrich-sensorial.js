import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const repoRoot = path.resolve(__dirname, '../../')
const dishesDir = path.join(repoRoot, 'dishes')

function walkDishes(dir) {
  let results = []
  if (!fs.existsSync(dir)) return results
  const list = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of list) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results = results.concat(walkDishes(fullPath))
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.md') &&
      entry.name !== 'README.md' &&
      !entry.name.startsWith('recetas_')
    ) {
      results.push(fullPath)
    }
  }
  return results
}

function titleCase(str) {
  const s = String(str || '').trim()
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function cleanTitle(rawTitle) {
  return String(rawTitle || '')
    .trim()
    .replace(/的做法$/, '')
    .trim()
}

function extractIngredientsFromBody(content) {
  const ingredients = []
  const lines = content.split('\n')
  let inIngredients = false

  for (const line of lines) {
    if (/^##\s*(?:[\u{1F300}-\u{1F9FF}\s\d]*?)?\s*(?:Ingredientes|Ingredients)\s*$/iu.test(line)) {
      inIngredients = true
      continue
    }
    if (inIngredients) {
      if (/^##\s+/.test(line) || /^---/.test(line)) {
        inIngredients = false
        continue
      }
      const bulletMatch = line.match(/^[-*+]\s+(.+?)(?:\s*[-–—]\s*(.+))?$/)
      if (bulletMatch) {
        let ingText = bulletMatch[1].replace(/\*\*|__|\*|_/g, '').trim()
        ingText = ingText
          .replace(
            /^[\d½¼¾⅓⅔⅛⅜⅝⅞/\s\.-]+(?:g|kg|ml|l|taza|cucharada|cucharadita|cdta|cdas|kilo|libra|lb|oz|onza)s?\s+(?:de\s+)?/i,
            '',
          )
          .trim()
        if (ingText && ingText.length > 1 && !/^\d+$/.test(ingText)) {
          ingText = titleCase(ingText)
          if (!ingredients.includes(ingText)) {
            ingredients.push(ingText)
          }
        }
      }
    }
  }
  return ingredients
}

function formatSensoryBlock(title, sensory = {}) {
  const flavorItems = (sensory.flavor || []).map((x) => titleCase(x)).filter(Boolean)
  const flavorStr = flavorItems.join(', ')

  const textureItems = (sensory.texture || []).map((x) => titleCase(x)).filter(Boolean)
  const textureStr = textureItems.join(', ')

  let aromaStr = ''
  if (Array.isArray(sensory.aroma) && sensory.aroma.length > 0) {
    aromaStr = sensory.aroma.map((x) => String(x).trim()).filter(Boolean).join(', ')
  } else if (typeof sensory.aroma === 'string' && sensory.aroma.trim()) {
    aromaStr = sensory.aroma.trim()
  }
  if (!aromaStr) {
    aromaStr = `Aroma característico de ${title}`
  }

  let presStr = ''
  if (typeof sensory.presentation === 'string' && sensory.presentation.trim()) {
    presStr = sensory.presentation.trim().replace(/\s+/g, ' ')
  } else {
    presStr = `${title} presentado de forma vistosa tradicional.`
  }

  return `## 🔬 Perfil Sensorial Estandarizado\n\n* **Sabor:** ${flavorStr}\n* **Textura:** ${textureStr}\n* **Aroma:** ${aromaStr}\n* **Presentación:** ${presStr}`
}

function formatMainIngredientsFrontmatter(frontmatterRaw, rawContent) {
  if (frontmatterRaw.includes('main_ingredients:')) {
    // Re-indent unindented main_ingredients list items (- item ->   - item)
    return frontmatterRaw.replace(
      /^(main_ingredients:\s*\n)((?:- .*\n?)+)/m,
      (_match, header, items) => {
        const indented = items
          .split('\n')
          .map((line) => (line.startsWith('- ') ? `  ${line}` : line))
          .join('\n')
        return header + indented
      },
    )
  }

  // Extract from body if missing in frontmatter
  const extracted = extractIngredientsFromBody(rawContent)
  if (extracted.length === 0) return frontmatterRaw

  const listYaml = `main_ingredients:\n` + extracted.map((ing) => `  - ${ing}`).join('\n') + `\n`

  // Insert main_ingredients before description: or nutrition: or before end of frontmatter
  if (frontmatterRaw.includes('nutrition:')) {
    return frontmatterRaw.replace('nutrition:', `${listYaml}nutrition:`)
  } else if (frontmatterRaw.includes('description:')) {
    return frontmatterRaw.replace('description:', `${listYaml}description:`)
  } else if (frontmatterRaw.endsWith('\n---\n')) {
    return frontmatterRaw.slice(0, -5) + `${listYaml}---\n`
  }
  return frontmatterRaw
}

function insertSensorialSection(body, block) {
  if (body.includes('Perfil Sensorial Estandarizado')) return body

  const anchorsBefore = [
    '## 🔬 Análisis Detallado',
    '## 📸 Galería',
    '## Fuentes',
    '## Referencias',
    '## 📚 Fuentes',
    '## 🤓 Sabiduría Colectiva',
  ]

  for (const anchor of anchorsBefore) {
    const idx = body.indexOf(anchor)
    if (idx !== -1) {
      const preceding = body.slice(0, idx)
      if (preceding.trimEnd().endsWith('---')) {
        const lastDash = preceding.lastIndexOf('---')
        return body.slice(0, lastDash) + block + '\n\n---\n\n' + body.slice(idx)
      }
      return preceding.trimEnd() + '\n\n---\n\n' + block + '\n\n---\n\n' + body.slice(idx)
    }
  }

  const footerIdx = body.indexOf('如果您遵循本指南')
  if (footerIdx !== -1) {
    return body.slice(0, footerIdx).trimEnd() + '\n\n---\n\n' + block + '\n\n' + body.slice(footerIdx)
  }

  return body.trimEnd() + '\n\n---\n\n' + block + '\n'
}

export function enrichSensorial({ check = false } = {}) {
  const files = walkDishes(dishesDir)
  let changedCount = 0
  let skippedCompliant = 0
  const skippedNoSensory = []
  const modifiedFiles = []

  for (const filePath of files) {
    const rawContent = fs.readFileSync(filePath, 'utf8')
    const endFmIdx = rawContent.indexOf('\n---\n', 4)

    let frontmatterRaw = rawContent
    let bodyRaw = ''

    if (endFmIdx !== -1) {
      frontmatterRaw = rawContent.slice(0, endFmIdx + 5)
      bodyRaw = rawContent.slice(endFmIdx + 5)
    }

    const fixedFrontmatter = formatMainIngredientsFrontmatter(frontmatterRaw, rawContent)
    const { data } = matter(rawContent)
    const title = cleanTitle(data.title || path.basename(filePath, '.md'))

    const hasFlavor = Array.isArray(data.sensory?.flavor) && data.sensory.flavor.length > 0
    const hasTexture = Array.isArray(data.sensory?.texture) && data.sensory.texture.length > 0

    let newBody = bodyRaw

    if (!bodyRaw.includes('Perfil Sensorial Estandarizado')) {
      if (!hasFlavor || !hasTexture) {
        // Anti-Hallucination Guard: Do NOT invent sensory data. Skip and record file.
        skippedNoSensory.push(path.relative(repoRoot, filePath))
      } else {
        const block = formatSensoryBlock(title, data.sensory || {})
        newBody = insertSensorialSection(bodyRaw, block)
      }
    }

    const newContent = fixedFrontmatter + newBody

    if (newContent !== rawContent) {
      changedCount++
      modifiedFiles.push(path.relative(repoRoot, filePath))
      if (!check) {
        fs.writeFileSync(filePath, newContent, 'utf8')
      }
    } else {
      skippedCompliant++
    }
  }

  console.log(`\n🔬 Sensory Profile Standardization Summary:`)
  console.log(`   - Total recipe files scanned: ${files.length}`)
  console.log(`   - Modified/Enriched: ${changedCount}`)
  console.log(`   - Compliant/Untouched: ${skippedCompliant}`)
  console.log(`   - Skipped (no sensory data in FM): ${skippedNoSensory.length}`)

  if (skippedNoSensory.length > 0) {
    console.log(`\nℹ️ SKIPPED (no sensory data in frontmatter - Anti-Hallucination Guard):`)
    skippedNoSensory.slice(0, 15).forEach((f) => console.log(`   - ${f}`))
    if (skippedNoSensory.length > 15) {
      console.log(`   ... and ${skippedNoSensory.length - 15} more files.`)
    }
  }

  if (check && changedCount > 0) {
    console.error(`\n❌ --check mode failed: ${changedCount} file(s) require enrichment:`)
    modifiedFiles.slice(0, 20).forEach((f) => console.error(`   - ${f}`))
    if (modifiedFiles.length > 20) {
      console.error(`   ... and ${modifiedFiles.length - 20} more files.`)
    }
    process.exit(1)
  }

  if (check) {
    console.log(`\n✅ --check mode passed: All recipes with valid sensory metadata are enriched.`)
  }

  return {
    total: files.length,
    changed: changedCount,
    skipped: skippedCompliant,
    skippedNoSensory: skippedNoSensory.length,
  }
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isDirectRun) {
  const isCheck = process.argv.includes('--check')
  enrichSensorial({ check: isCheck })
}
