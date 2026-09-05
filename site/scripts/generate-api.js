import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ORIGIN = process.env.SITE_ORIGIN || 'https://gos-site.pages.dev'

const repoRoot = path.resolve(__dirname, '../../')
const dishesDir = path.join(repoRoot, 'dishes')
const apiDir = path.join(__dirname, '../public/api')

// Language detection patterns
const LANGUAGE_PATTERNS = {
  spanish: /[áéíóúñ¿¡]/i,
  english: /^[a-zA-Z0-9\s\-_.,!?'"()]+$/,
}

// Country/region detection
const COUNTRY_MAPPING = {
  colombian: 'colombia',
  peruvian: 'peru',
}

/**
 * Detect language from text content
 */
function detectLanguage(text) {
  if (LANGUAGE_PATTERNS.spanish.test(text)) return 'spanish'
  return 'english'
}

/**
 * Extract country from file path
 */
function extractCountry(filePath) {
  const parts = filePath.split(path.sep)
  const dishesIndex = parts.indexOf('dishes')
  if (dishesIndex === -1) return 'unknown'

  const category = parts[dishesIndex + 1]
  return COUNTRY_MAPPING[category] || 'unknown'
}

/**
 * Parse markdown file and extract metadata
 */
function parseRecipe(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const parsed = matter(content)

  // Detect language from content
  const language = detectLanguage(parsed.content)
  const country = extractCountry(filePath)

  // Extract title
  let title = parsed.data.title
  if (!title) {
    // Try to extract from first heading
    const match = parsed.content.match(/^#\s+(.+)$/m)
    title = match ? match[1] : path.basename(filePath, '.md')
  }

  // Build recipe object
  const recipe = {
    id: path
      .relative(dishesDir, filePath)
      .replace(/\\/g, '/')
      .replace('.md', ''),
    title: title,
    language: language,
    country: country,
    hasMetadata: Object.keys(parsed.data).length > 0,
    metadata: parsed.data,
    category: parsed.data.categories || [],
    difficulty: parsed.data.difficulty || null,
    prepTime: parsed.data.prep_time || null,
    cookTime: parsed.data.cook_time || null,
    servings: parsed.data.servings || null,
    mainIngredients: parsed.data.main_ingredients || [],
    tags: parsed.data.tags || [],
    filePath: path.relative(repoRoot, filePath).replace(/\\/g, '/'),
  }

  return recipe
}

/**
 * Scan all recipe files
 */
function scanRecipes() {
  const recipes = []

  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        if (
          entry.name.toLowerCase() === 'china' ||
          /[\u4e00-\u9fa5]/.test(entry.name)
        ) {
          continue
        }
        scanDir(fullPath)
      } else if (
        entry.isFile() &&
        entry.name.endsWith('.md') &&
        entry.name !== 'README.md'
      ) {
        if (/[\u4e00-\u9fa5]/.test(entry.name)) continue
        try {
          const recipe = parseRecipe(fullPath)
          recipes.push(recipe)
        } catch (error) {
          console.error(`Error parsing ${fullPath}:`, error.message)
        }
      }
    }
  }

  scanDir(dishesDir)
  return recipes
}

/**
 * Group recipes by language and country
 */
function groupRecipes(recipes) {
  const grouped = {
    byLanguage: {},
    byCountry: {},
    byLanguageAndCountry: {},
    withMetadata: recipes.filter((r) => r.hasMetadata),
    withoutMetadata: recipes.filter((r) => !r.hasMetadata),
  }

  recipes.forEach((recipe) => {
    // By language
    if (!grouped.byLanguage[recipe.language]) {
      grouped.byLanguage[recipe.language] = []
    }
    grouped.byLanguage[recipe.language].push(recipe)

    // By country
    if (!grouped.byCountry[recipe.country]) {
      grouped.byCountry[recipe.country] = []
    }
    grouped.byCountry[recipe.country].push(recipe)

    // By language and country
    const key = `${recipe.language}/${recipe.country}`
    if (!grouped.byLanguageAndCountry[key]) {
      grouped.byLanguageAndCountry[key] = []
    }
    grouped.byLanguageAndCountry[key].push(recipe)
  })

  return grouped
}

/**
 * Generate API files
 */
function generateAPI() {
  console.log('🔍 Scanning recipes...')
  const recipes = scanRecipes()
  console.log(`✅ Found ${recipes.length} recipes`)

  console.log('📊 Grouping recipes...')
  const grouped = groupRecipes(recipes)

  console.log(`   - With metadata: ${grouped.withMetadata.length}`)
  console.log(`   - Without metadata: ${grouped.withoutMetadata.length}`)

  // Clean and create API directory
  if (fs.existsSync(apiDir)) {
    fs.rmSync(apiDir, { recursive: true, force: true })
  }
  fs.mkdirSync(apiDir, { recursive: true })

  console.log('\n📝 Generating API endpoints...')

  // 1. Create index with all available endpoints
  const index = {
    totalRecipes: recipes.length,
    languages: Object.keys(grouped.byLanguage).map((lang) => ({
      language: lang,
      count: grouped.byLanguage[lang].length,
      endpoint: `/api/${lang}/index.json`,
    })),
    countries: Object.keys(grouped.byCountry).map((country) => ({
      country: country,
      count: grouped.byCountry[country].length,
      endpoint: `/api/by-country/${country}.json`,
    })),
    endpoints: {
      all: '/api/all.json',
      withMetadata: '/api/with-metadata.json',
      withoutMetadata: '/api/without-metadata.json',
    },
  }

  fs.writeFileSync(
    path.join(apiDir, 'index.json'),
    JSON.stringify(index, null, 2),
  )
  console.log('   ✓ /api/index.json')

  // 2. All recipes
  fs.writeFileSync(
    path.join(apiDir, 'all.json'),
    JSON.stringify({ recipes, count: recipes.length }, null, 2),
  )
  console.log('   ✓ /api/all.json')

  // 3. With/without metadata
  fs.writeFileSync(
    path.join(apiDir, 'with-metadata.json'),
    JSON.stringify(
      { recipes: grouped.withMetadata, count: grouped.withMetadata.length },
      null,
      2,
    ),
  )
  console.log('   ✓ /api/with-metadata.json')

  fs.writeFileSync(
    path.join(apiDir, 'without-metadata.json'),
    JSON.stringify(
      {
        recipes: grouped.withoutMetadata,
        count: grouped.withoutMetadata.length,
      },
      null,
      2,
    ),
  )
  console.log('   ✓ /api/without-metadata.json')

  // 4. By language/country structure
  Object.entries(grouped.byLanguageAndCountry).forEach(([key, recipesList]) => {
    const [language, country] = key.split('/')
    const langDir = path.join(apiDir, language)

    if (!fs.existsSync(langDir)) {
      fs.mkdirSync(langDir, { recursive: true })
    }

    fs.writeFileSync(
      path.join(langDir, `${country}.json`),
      JSON.stringify(
        { recipes: recipesList, count: recipesList.length },
        null,
        2,
      ),
    )
    console.log(
      `   ✓ /api/${language}/${country}.json (${recipesList.length} recipes)`,
    )
  })

  // 5. Language index files
  Object.entries(grouped.byLanguage).forEach(([language, recipesList]) => {
    const langDir = path.join(apiDir, language)

    if (!fs.existsSync(langDir)) {
      fs.mkdirSync(langDir, { recursive: true })
    }

    fs.writeFileSync(
      path.join(langDir, 'index.json'),
      JSON.stringify(
        { recipes: recipesList, count: recipesList.length },
        null,
        2,
      ),
    )
    console.log(
      `   ✓ /api/${language}/index.json (${recipesList.length} recipes)`,
    )
  })

  // 6. Countries directory
  const countriesDir = path.join(apiDir, 'by-country')
  fs.mkdirSync(countriesDir, { recursive: true })

  Object.entries(grouped.byCountry).forEach(([country, recipesList]) => {
    fs.writeFileSync(
      path.join(countriesDir, `${country}.json`),
      JSON.stringify(
        { recipes: recipesList, count: recipesList.length },
        null,
        2,
      ),
    )
    console.log(
      `   ✓ /api/by-country/${country}.json (${recipesList.length} recipes)`,
    )
  })

  console.log('\n✅ API generation complete!')
  console.log(`\n📍 Access your API at:`)
  console.log(`   ${ORIGIN}/api/index.json`)
  console.log(`   ${ORIGIN}/api/spanish/colombia.json`)
}

// Run
generateAPI()
