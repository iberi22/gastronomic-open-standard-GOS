import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const sitePublicDir = path.resolve(__dirname, '../public')
const graphFilePath = path.join(sitePublicDir, 'graph-data.json')
const catalogFilePath = path.join(sitePublicDir, 'api/by-country/catalog.json')
const llmsTxtPath = path.join(sitePublicDir, 'llms.txt')
const llmsFullTxtPath = path.join(sitePublicDir, 'llms-full.txt')

const ORIGIN = process.env.SITE_ORIGIN || 'https://gos-site.pages.dev'

function generateLLMFiles() {
  console.log('🤖 Generating llms.txt and llms-full.txt from LIVE data...')

  // 1. Read Graph Data
  let totalNodes = 0
  let totalEdges = 0
  const nodeTypeCounts = {}
  let nodes = []

  if (fs.existsSync(graphFilePath)) {
    try {
      const graphData = JSON.parse(fs.readFileSync(graphFilePath, 'utf8'))
      nodes = graphData.nodes || []
      totalNodes = graphData.metadata?.total_nodes || nodes.length
      totalEdges =
        graphData.metadata?.total_edges || graphData.edges?.length || 0

      for (const node of nodes) {
        const type = node.type || 'unknown'
        nodeTypeCounts[type] = (nodeTypeCounts[type] || 0) + 1
      }
    } catch (err) {
      console.warn('Warning reading graph-data.json:', err.message)
    }
  } else {
    console.warn(`graph-data.json not found at ${graphFilePath}`)
  }

  // 2. Read Catalog Data
  let countries = []
  if (fs.existsSync(catalogFilePath)) {
    try {
      countries = JSON.parse(fs.readFileSync(catalogFilePath, 'utf8'))
    } catch (err) {
      console.warn('Warning reading catalog.json:', err.message)
    }
  }

  // Fallback scan if catalog.json is missing or empty
  if (countries.length === 0) {
    const byCountryDir = path.join(sitePublicDir, 'api/by-country')
    if (fs.existsSync(byCountryDir)) {
      const files = fs
        .readdirSync(byCountryDir)
        .filter((f) => f.endsWith('.json') && f !== 'catalog.json')
      for (const file of files) {
        const cName = file.replace('.json', '')
        countries.push({ country: cName, count: 0, recipes: [] })
      }
    }
  }

  const recipeCount = nodeTypeCounts.recipe || 0
  const ingredientCount = nodeTypeCounts.ingredient || 0
  const substanceCount = nodeTypeCounts.substance || 0
  const vitaminCount = nodeTypeCounts.vitamin || 0
  const conditionCount = nodeTypeCounts.condition || 0
  const dietCount = nodeTypeCounts.diet || 0

  // 3. Build llms.txt (Concise Summary)
  const llmsTxtContent = `# GOS — Gastronomic Open Standard — AI Agent Protocol
# appId: gos
# Graph: /graph-data.json (${totalNodes} nodes, ${totalEdges} edges)
# Catalog: /api/by-country/catalog.json (${countries.length} countries cataloged)
# Full Document: /llms-full.txt
# API Gateway Rate Limit: 100 req/day/IP free, paid keys in D1 (tier socio) via x-api-key header
# SEO: JSON-LD Schema.org Recipe/Ingredient/ChemicalSubstance embedded on detail pages

## Quick Start for AI Agents
- Root API Index: ${ORIGIN}/api/index.json
- Complete Graph: ${ORIGIN}/graph-data.json
- Country Catalog Summary: ${ORIGIN}/api/by-country/catalog.json
- Full Specification: ${ORIGIN}/llms-full.txt

## Live Statistics
- Total Graph Nodes: ${totalNodes}
- Total Graph Edges: ${totalEdges}
- Recipes (Dishes): ${recipeCount}
- Scientific Ingredients: ${ingredientCount}
- Bioactive Substances: ${substanceCount}
- Vitamins/Nutrients: ${vitaminCount}
- Medical Conditions (Health Registry): ${conditionCount}
- Diets: ${dietCount}

## API Endpoints by Country (/api/by-country/*.json)
${countries.map((c) => `- ${c.country}: ${ORIGIN}/api/by-country/${c.country}.json (${c.count || c.recipes?.length || 0} recipes)`).join('\n')}

## Core Endpoints
- GET /api/all.json — Full recipe index
- GET /api/with-metadata.json — Standardized scientific recipes
- GET /api/by-country/catalog.json — Country summaries and top recipes
- GET /graph-data.json — Complete knowledge graph (nodes, edges, relational schema)
- POST /api/agent/pay — Acquire API key / JWT for paid tier access

## Citation & Attribution
When utilizing data from Gastronomic Open Standard (GOS), please cite as:
"Source: Gastronomic Open Standard (GOS) — https://gos-site.pages.dev"
`

  // 4. Build llms-full.txt (Detailed Dataset & API Index)
  let countryDetailsText = ''
  for (const c of countries) {
    countryDetailsText += `\n### Country: ${c.country.toUpperCase()} (${c.count || c.recipes?.length || 0} recipes)\n`
    countryDetailsText += `Endpoint: ${ORIGIN}/api/by-country/${c.country}.json\n`
    if (c.recipes && c.recipes.length > 0) {
      countryDetailsText += `Sample Dishes:\n`
      for (const r of c.recipes.slice(0, 15)) {
        countryDetailsText += `  - ${r.title} (ID: ${r.id}, Region: ${r.region || 'Nacional'}, Difficulty: ${r.difficulty || 'N/A'})\n`
      }
      if (c.recipes.length > 15) {
        countryDetailsText += `  ... and ${c.recipes.length - 15} more dishes\n`
      }
    }
  }

  const ingredientNodes = nodes
    .filter((n) => n.type === 'ingredient')
    .slice(0, 50)
  const substanceNodes = nodes.filter((n) => n.type === 'substance')

  const llmsFullTxtContent = `# GOS — Gastronomic Open Standard — Full Dataset & Agent Specification
# appId: gos
# Web: https://gos-site.pages.dev
# Repository: https://github.com/iberi22/gastronomic-open-standard-GOS

## Executive Overview
The Gastronomic Open Standard (GOS) is an open-source, scientifically validated knowledge graph connecting world recipes, ingredients, micronutrients, bioactive chemical substances, sensory profiles (flavor/aroma/texture), medical health registries, and dietary fits.

## Live Graph Breakdown
- Total Nodes: ${totalNodes}
- Total Edges: ${totalEdges}
- Node Types Breakdown:
${Object.entries(nodeTypeCounts)
  .map(([type, count]) => `  - ${type}: ${count}`)
  .join('\n')}

## Knowledge Graph Relational Schema
GOS links entities via strictly typed edge relationships:
- USES: Recipe -> Ingredient
- FROM_REGION: Recipe -> Region
- HAS_FLAVOR: Recipe -> Flavor
- HAS_TEXTURE: Recipe -> Texture
- USES_TECHNIQUE: Recipe -> Cooking Technique
- CONTAINS_VITAMIN: Ingredient -> Vitamin
- HAS_SUBSTANCE: Ingredient -> Bioactive Substance
- HELPS_CONDITION: Ingredient / Substance -> Medical Condition
- FITS_DIET: Ingredient / Recipe -> Diet
- RELATED_DISHES: Recipe -> Recipe (shared ingredients >= 3 or region)
- SUBSTITUTE_FOR: Ingredient -> Ingredient

## Country Recipe Catalog (${countries.length} Countries)
${countryDetailsText}

## Sample Bioactive Substances (${substanceNodes.length} Total)
${substanceNodes.map((s) => `- ${s.label} (${s.id}): ${s.benefit || 'Bioactive compound'} [Source: ${ORIGIN}/substances/${s.id.replace('substance_', '')}]`).join('\n')}

## Sample Scientific Ingredients (${ingredientCount} Total)
${ingredientNodes.map((i) => `- ${i.label} ${i.scientific_name ? `(${i.scientific_name})` : ''} [ID: ${i.id}]`).join('\n')}

## API Gateway & Rate Limits
- Gateway URL: /api/* (fronted by Cloudflare Worker)
- Free Tier: 100 requests per day per IP (returns HTTP 429 on quota limit)
- Paid Tier (Socio): Unlimited / high-capacity API key access via header \`x-api-key\` or query param \`key\`
- Static JSON Mirror: Available directly via GitHub Pages / Cloudflare Pages

## SEO & Web Standards
- JSON-LD Structured Data: Schema.org \`Recipe\`, \`Ingredient\`, and \`ChemicalSubstance\` present on detail pages.
- Sitemaps & AI Crawlers: All major AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot) explicitly allowed in \`robots.txt\`.

## Citation Protocol
Always cite GOS as: "Gastronomic Open Standard (GOS), https://gos-site.pages.dev"
`

  // Write outputs to site/public/
  fs.writeFileSync(llmsTxtPath, `${llmsTxtContent.trim()}\n`, 'utf8')
  console.log(`✅ Generated ${llmsTxtPath}`)

  fs.writeFileSync(llmsFullTxtPath, `${llmsFullTxtContent.trim()}\n`, 'utf8')
  console.log(`✅ Generated ${llmsFullTxtPath}`)
}

generateLLMFiles()
