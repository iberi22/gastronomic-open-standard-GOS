import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Graph from 'graphology'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import matter from 'gray-matter'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const repoRoot = path.resolve(__dirname, '../../')
const dishesDir = path.join(repoRoot, 'dishes')
const ingredientsDir = path.join(repoRoot, 'ingredients')
const siteContentIngredientsDir = path.join(
  __dirname,
  '../src/content/ingredients',
)

const outputFileSite = path.join(__dirname, '../graph-data.json')
const outputFilePublic = path.join(__dirname, '../public/graph-data.json')
const outputFileDocs = path.join(repoRoot, 'docs/graph.json')

const COOKING_TECHNIQUES = new Set([
  'cocinar',
  'hervir',
  'freír',
  'fritar',
  'asar',
  'hornear',
  'cocir',
  'saltear',
  'sofrito',
  'sofreír',
  'brasear',
  'ahumar',
  'cocer',
  'guisar',
  'estofar',
  'pochar',
  'escalfar',
  'gratinar',
  'flambear',
  'marinar',
  'adobar',
  'empanar',
  'rehogar',
  'blanquear',
  'dorar',
  'caramelizar',
  'glasear',
  'trocear',
  'picar',
  'machacar',
  'majar',
  'triturar',
  'licuar',
  'batir',
  'mezclar',
  'revolver',
  'integrar',
  'incorporar',
  'agregar',
  'añadir',
  'verter',
  'colar',
  'filtrar',
  'escurrir',
  'enfriar',
  'congelar',
  'refrigerar',
  'calentar',
  'derretir',
  'disolver',
  'diluir',
  'sancochar',
  'confitar',
  'cook',
  'boil',
  'fry',
  'bake',
  'roast',
  'grill',
  'broil',
  'steam',
  'simmer',
  'sauté',
  'sear',
  'braise',
  'smoke',
  'stew',
  'poach',
  'blanch',
  'gratinate',
  'flambé',
  'marinate',
  'season',
  'bread',
  'dice',
  'chop',
  'mince',
  'crush',
  'grind',
  'blend',
  'mix',
  'stir',
  'fold',
  'whisk',
  'beat',
  'pour',
  'drain',
  'cool',
  'freeze',
  'refrigerate',
  'heat',
  'melt',
  'dissolve',
])

const NODE_COLORS = {
  recipe: '#FF6B6B',
  ingredient: '#4ECDC4',
  region: '#FFE66D',
  flavor: '#95E1D3',
  texture: '#F38181',
  technique: '#AA96DA',
  place: '#B2E2F2',
  category: '#A8D8A8',
  vitamin: '#F9C74F',
  condition: '#F94144',
  substance: '#9D4EDD',
  diet: '#06D6A0',
  nutrient: '#F9C74F',
}

const INGREDIENT_CATEGORIES = {
  Proteins: [
    'pollo',
    'carne',
    'res',
    'cerdo',
    'pescado',
    'mariscos',
    'huevo',
    'camarones',
    'carnero',
    'chivo',
    'pavo',
    'atun',
    'salmon',
    'bacalao',
    'calamar',
    'pulpo',
    'langosta',
    'cangrejo',
    'chicharron',
    'tocino',
    'costilla',
    'jaiba',
    'tollo',
    'bagre',
    'mojarra',
    'trucha',
  ],
  Dairy: [
    'leche',
    'crema',
    'mantequilla',
    'queso',
    'cuajada',
    'yogur',
    'nata',
    'suero',
    'leche condensada',
    'queso costeño',
    'arequipe',
  ],
  Vegetables: [
    'cebolla',
    'ajo',
    'tomate',
    'papa',
    'yuca',
    'platano',
    'zanahoria',
    'habichuela',
    'coliflor',
    'brocoli',
    'espinaca',
    'acelga',
    'lechuga',
    'remolacha',
    'rabano',
    'pimenton',
    'pimiento',
    'pepino',
    'calabaza',
    'berenjena',
    'choclo',
    'maiz',
    'auyama',
    'ahuyama',
    'guascas',
  ],
  Fruits: [
    'limon',
    'lima',
    'naranja',
    'mango',
    'aguacate',
    'papaya',
    'banano',
    'manzana',
    'pera',
    'uva',
    'fresa',
    'mora',
    'guanabana',
    'lulo',
    'maracuya',
    'sandia',
    'melon',
    'kiwi',
    'coco',
    'pina',
    'piña',
    'tamarindo',
  ],
  Grains: [
    'arroz',
    'maiz',
    'trigo',
    'harina',
    'pan',
    'fideos',
    'pasta',
    'tallarines',
    'semola',
    'avena',
    'cebada',
    'quinoa',
    'masa',
    'harina de maiz',
  ],
  Legumes: [
    'frijoles',
    'lentejas',
    'garbanzos',
    'soya',
    'caraotas',
    'blanquillo',
    'frijol',
    'arveja',
  ],
  Oils_Fats: [
    'aceite',
    'manteca',
    'grasa',
    'aceite de oliva',
    'aceite vegetal',
    'mantequilla',
    'manteca de cerdo',
  ],
  Condiments: [
    'sal',
    'pimienta',
    'comino',
    'achiote',
    'culantro',
    'cilantro',
    'oregano',
    'tomillo',
    'romero',
    'laurel',
    'albahaca',
    'hierbabuena',
    'menta',
    'eneldo',
    'hinojo',
    'azafran',
    'canela',
    'clavo',
    'nuez moscada',
    'jengibre',
    'vainilla',
  ],
  Sauces: [
    'salsa',
    'aji',
    'ají',
    'aji amarillo',
    'chimichurri',
    'hogao',
    'sofrito',
    'salsa de tomate',
    'pasta de ajo',
    'pasta de aji',
    'guacamole',
    'salsa criolla',
    'suero costeño',
  ],
  Spices: [
    'comino',
    'pimenton',
    'paprika',
    'cayena',
    'chile',
    'aji molido',
    'curry',
    'curcuma',
    'cardamomo',
    'canela',
    'clavo',
    'pimienta negra',
  ],
  Sweeteners: [
    'panela',
    'azucar',
    'miel',
    'melaza',
    'azucar morena',
    'miel de caña',
  ],
  Liquids: [
    'agua',
    'caldo',
    'consome',
    'vinagre',
    'vino blanco',
    'vino tinto',
    'cerveza',
    'aguardiente',
    'ron',
    'jugo',
  ],
  Roots_Tubers: [
    'yuca',
    'papa',
    'ñame',
    'arracacha',
    'zanahoria',
    'remolacha',
    'rabano',
    'papa criolla',
    'papa sabanera',
  ],
  Seafood: [
    'pescado',
    'mariscos',
    'camarones',
    'cangrejo',
    'langosta',
    'pulpo',
    'calamar',
    'mejillones',
    'almejas',
    'trucha',
    'mojarra',
    'pargo',
    'robalo',
    'corvina',
    'bagre',
    'jaiba',
    'tollo',
  ],
}

const REGION_PLACES = {
  Andina: [
    'Antioquia',
    'Bogota',
    'Cundinamarca',
    'Risaralda',
    'Quindio',
    'Caldas',
    'Huila',
    'Tolima',
    'Narino',
    'Santander',
    'Boyaca',
    'Norte de Santander',
  ],
  Caribe: [
    'Barranquilla',
    'Cartagena',
    'Santa Marta',
    'Monteria',
    'Sincelejo',
    'Valledupar',
    'Riohacha',
    'Cienaga',
    'Maicao',
    'Turbo',
  ],
  Pacifica: [
    'Cali',
    'Buenaventura',
    'Palmira',
    'Pasto',
    'Popayan',
    'Tumaco',
    'Guadalajara de Buga',
  ],
  Amazonia: [
    'Leticia',
    'Florencia',
    'San Jose del Guaviare',
    'Puerto Loretoso',
    'Puerto Inirida',
    'Mitu',
    'Vaupes',
  ],
  Orinoquia: [
    'Villavicencio',
    'Yopal',
    'Arauca',
    'Tunja',
    'Puerto Carreno',
    'Meta',
    'Casanare',
    'Vichada',
  ],
  'Valle del Cauca': [
    'Cali',
    'Buga',
    'Tulua',
    'Palmira',
    'Jamundi',
    'Cartago',
    'Buenaventura',
  ],
  Insular: ['San Andres', 'Providencia', 'Santa Catalina'],
  Nacional: ['Colombia'],
  Peruvian: [
    'Lima',
    'Cusco',
    'Arequipa',
    'Trujillo',
    'Chiclayo',
    'Piura',
    'Iquitos',
  ],
  Costa: ['Lima', 'Trujillo', 'Chiclayo', 'Piura'],
  Sierra: ['Cusco', 'Arequipa', 'Huancayo'],
  Selva: ['Iquitos', 'Tarapoto', 'Pucallpa'],
}

const DIETS = [
  { id: 'diet_vegano', label: 'Vegano', rule: 'Sin productos animales' },
  { id: 'diet_vegetariano', label: 'Vegetariano', rule: 'Sin carnes' },
  {
    id: 'diet_sin_gluten',
    label: 'Sin gluten',
    rule: 'Excluye trigo/cebada/centeno',
  },
  { id: 'diet_keto', label: 'Keto', rule: 'Bajo carbohidrato, alto grasa' },
  {
    id: 'diet_mediterranea',
    label: 'Mediterránea',
    rule: 'Aceite oliva, pescado, vegetales',
  },
  {
    id: 'diet_alta_proteina',
    label: 'Alta proteína',
    rule: 'Proteínas magras',
  },
]

function isLatinText(text) {
  return /[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/.test(text) && !/[\u4e00-\u9fa5]/.test(text)
}

function sanitizeId(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '_')
}

// Nombres que no aportan información ("unknown", vacíos o pura puntuación).
// Evita ids fantasma tipo ingredient_unknown / ingredient____ en aristas.
function isPlaceholderName(text) {
  const t = String(text ?? '').trim()
  if (!t) return true
  if (/^(unknown|n\/?a|none|null|tbd|desconocido|sin datos)$/i.test(t))
    return true
  const slug = sanitizeId(t)
  return slug.length === 0 || /^_+$/.test(slug)
}

// Carpeta de staging: ingredientes auto-generados sin curar (nombres no latinos,
// etiquetas con cantidad+unidad, substitutes "Unknown"). No entra al grafo
// público: ensuciaba el mapa con nodos-stub y ~2.300 aristas fantasma que luego
// se podaban en silencio. El catálogo /ingredients sí puede seguir usándola.
const PENDING_REVIEW_DIRNAME = 'pending_review'

function autoCategorizeIngredient(ingredientLabel) {
  const ingLower = ingredientLabel.toLowerCase()
  for (const [category, keywords] of Object.entries(INGREDIENT_CATEGORIES)) {
    for (const kw of keywords) {
      if (ingLower.includes(kw.toLowerCase())) {
        return category
      }
    }
  }
  return null
}

function extractIngredientsFromContent(content) {
  const ingredients = []
  const lines = content.split('\n')
  let inSection = false

  for (const line of lines) {
    if (
      /^##\s*(?:[\u{1F300}-\u{1F9FF}\s\d]*?)?\s*(?:Ingredientes|Ingredients)\s*$/iu.test(
        line,
      )
    ) {
      inSection = true
      continue
    }
    if (inSection) {
      if (/^##\s+/.test(line) || /^---/.test(line)) {
        inSection = false
        continue
      }
      const bulletMatch = line.match(/^[-*+]\s+(.+?)(?:\s*[-–—]\s*(.+))?$/)
      if (bulletMatch) {
        let ingText = bulletMatch[1].replace(/\*\*|__|\*|_/g, '')
        ingText = ingText
          .replace(
            /^[\d½¼¾⅓⅔⅛⅜⅝⅞/\s]+(?:g|kg|ml|l|taza|cucharada|cucharadita|cdta|cdas|kilo|libra|lb|oz|onza)s?\s+(?:de\s+)?/i,
            '',
          )
          .trim()
        if (
          ingText &&
          ingText.length > 1 &&
          !/^\d+$/.test(ingText) &&
          isLatinText(ingText)
        ) {
          ingredients.push(ingText)
        }
      }
    }
  }
  return ingredients
}

function extractTechniquesFromContent(content) {
  const techniques = []
  const lines = content.split('\n')
  let inSection = false

  for (const line of lines) {
    if (
      /^##\s*(?:[\u{1F300}-\u{1F9FF}\s\d]*?)?\s*(?:Instrucciones|Instructions|Preparaci(?:ó|o)n|Receta)\s*$/iu.test(
        line,
      )
    ) {
      inSection = true
      continue
    }
    if (inSection) {
      if (/^##\s+/.test(line) || /^---/.test(line)) {
        inSection = false
        continue
      }
      const cleanLine = line
        .replace(/\*\*|__|\*|_/g, '')
        .replace(/^\d+\.\s*/, '')
        .replace(/^[-*+]\s*/, '')
      const words = cleanLine.toLowerCase().match(/[a-záéíóúüñ]+/g) || []
      for (const word of words) {
        if (COOKING_TECHNIQUES.has(word)) {
          const display = word.charAt(0).toUpperCase() + word.slice(1)
          if (!techniques.includes(display)) {
            techniques.push(display)
          }
        }
      }
    }
  }
  return techniques
}

export function generateGraph() {
  console.log('🕸️ Generating GOS Knowledge Graph...')

  const nodes = new Map()
  const edges = []
  const recipeIngredients = new Map()
  const recipeRegions = new Map()
  const ingredientCategoriesAdded = new Set()
  const ingredientRecipes = new Map()

  function getOrCreateCategoryNode(categoryName) {
    const catId = `category_${sanitizeId(categoryName)}`
    if (!nodes.has(catId)) {
      nodes.set(catId, {
        id: catId,
        label: categoryName,
        type: 'category',
        color: NODE_COLORS.category,
        size: 18,
      })
    }
    return catId
  }

  function addPlaceEdges(regionId, regionLabel) {
    const places = REGION_PLACES[regionLabel] || []
    for (const placeName of places) {
      const placeId = `place_${sanitizeId(placeName)}`
      if (!nodes.has(placeId)) {
        nodes.set(placeId, {
          id: placeId,
          label: placeName,
          type: 'place',
          color: NODE_COLORS.place,
          size: 12,
        })
      }
      edges.push({
        source: regionId,
        target: placeId,
        type: 'PLACE',
        weight: 1,
      })
    }
  }

  // ---- Scientifc enrichment: scan ingredients/ for vitamins, substances, conditions ----
  function scanIngredientsScience() {
    if (!fs.existsSync(ingredientsDir)) return
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name)
        if (e.isDirectory()) {
          if (e.name === PENDING_REVIEW_DIRNAME) {
            for (const f of fs.readdirSync(p)) {
              if (f.endsWith('.md')) pendingFilesSkipped.add(f) // basename: dedupe entre copias
            }
            continue
          }
          walk(p)
        } else if (e.isFile() && e.name.endsWith('.md')) {
          try {
            const raw = fs.readFileSync(p, 'utf8')
            const pm = matter(raw)
            const fm = pm.data
            // MISMO criterio que scanIngredients(): si el archivo no va a tener
            // nodo (sin name latino), no se emiten aristas hacia un id fantasma.
            if (!fm.name || !isLatinText(fm.name)) {
              excludedSkips.noLatin++
              continue
            }
            const ingId = `ingredient_${sanitizeId(fm.name)}`
            // micronutrients -> vitamin nodes
            if (fm.micronutrients && typeof fm.micronutrients === 'object') {
              for (const [nutKey] of Object.entries(fm.micronutrients)) {
                const vitLabel = nutKey
                  .replace(/_mg$|_ug$|_iu$/, '')
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, (c) => c.toUpperCase())
                const vitId = `vitamin_${sanitizeId(vitLabel)}`
                if (!nodes.has(vitId))
                  nodes.set(vitId, {
                    id: vitId,
                    label: vitLabel,
                    type: 'vitamin',
                    color: NODE_COLORS.vitamin,
                    size: 14,
                    unit: nutKey.match(/_(mg|ug|iu)$/)?.[1] || '',
                  })
                edges.push({
                  source: ingId,
                  target: vitId,
                  type: 'CONTAINS_VITAMIN',
                  weight: 1,
                })
                // vitamin -> condition via health_registry? handle later
              }
            }
            if (fm.nutrition_per_100g) {
              // expose macro nutrients
              for (const k of ['protein_g', 'fat_g', 'carbs_g', 'fiber_g']) {
                if (fm.nutrition_per_100g[k] != null) {
                  const nLabel = k
                    .replace('_g', '')
                    .replace(/\b\w/g, (c) => c.toUpperCase())
                  const nId = `nutrient_${sanitizeId(nLabel)}`
                  if (!nodes.has(nId))
                    nodes.set(nId, {
                      id: nId,
                      label: nLabel,
                      type: 'nutrient',
                      color: NODE_COLORS.nutrient,
                      size: 12,
                    })
                  edges.push({
                    source: ingId,
                    target: nId,
                    type: 'HAS_NUTRIENT',
                    weight: 0.6,
                  })
                }
              }
            }
            // active_compounds -> substance nodes
            if (Array.isArray(fm.active_compounds)) {
              for (const c of fm.active_compounds) {
                const subName = typeof c === 'string' ? c : c.name || ''
                if (!subName) continue
                const sId = `substance_${sanitizeId(subName)}`
                if (!nodes.has(sId))
                  nodes.set(sId, {
                    id: sId,
                    label: subName,
                    type: 'substance',
                    color: NODE_COLORS.substance,
                    size: 16,
                    benefit: c.benefit || '',
                  })
                edges.push({
                  source: ingId,
                  target: sId,
                  type: 'HAS_SUBSTANCE',
                  weight: 1,
                })
                edges.push({
                  source: sId,
                  target: ingId,
                  type: 'FOUND_IN',
                  weight: 0.7,
                })
              }
            }
            // health_registry -> condition nodes + edges substance/ingredient -> condition
            if (Array.isArray(fm.health_registry)) {
              for (const h of fm.health_registry) {
                const condName = h.condition || h.name
                if (!condName) continue
                const cId = `condition_${sanitizeId(condName)}`
                if (!nodes.has(cId))
                  nodes.set(cId, {
                    id: cId,
                    label: condName,
                    type: 'condition',
                    color: NODE_COLORS.condition,
                    size: 18,
                    category: h.evidence_level || 'medium',
                    mechanism: h.mechanism || '',
                  })
                edges.push({
                  source: ingId,
                  target: cId,
                  type: 'HELPS_CONDITION',
                  weight: 1.2,
                })
                if (Array.isArray(h.compounds)) {
                  for (const comp of h.compounds) {
                    const subId = `substance_${sanitizeId(comp)}`
                    if (nodes.has(subId))
                      edges.push({
                        source: subId,
                        target: cId,
                        type: 'TREATS',
                        weight: 1,
                      })
                  }
                }
              }
            }
            // diet inference via tags
            if (Array.isArray(fm.tags)) {
              const tagMap = {
                'sin gluten': 'diet_sin_gluten',
                vegano: 'diet_vegano',
                vegetariano: 'diet_vegetariano',
                keto: 'diet_keto',
                mediterranea: 'diet_mediterranea',
              }
              for (const tg of fm.tags) {
                const key = String(tg).toLowerCase()
                for (const [k, dietId] of Object.entries(tagMap)) {
                  if (key.includes(k)) {
                    const dietLabel =
                      DIETS.find((d) => d.id === dietId)?.label || k
                    if (!nodes.has(dietId))
                      nodes.set(dietId, {
                        id: dietId,
                        label: dietLabel,
                        type: 'diet',
                        color: NODE_COLORS.diet,
                        size: 20,
                      })
                    edges.push({
                      source: ingId,
                      target: dietId,
                      type: 'FITS_DIET',
                      weight: 0.8,
                    })
                  }
                }
              }
            }
          } catch {
            /* ignore */
          }
        }
      }
    }
    walk(ingredientsDir)
    // ensure diet hubs exist even if no tag
    for (const d of DIETS)
      if (!nodes.has(d.id))
        nodes.set(d.id, {
          id: d.id,
          label: d.label,
          type: 'diet',
          color: NODE_COLORS.diet,
          size: 18,
          rule: d.rule,
        })
  }

  // Find all recipe files in dishesDir
  function scanDishes(dir) {
    if (!fs.existsSync(dir)) return
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        // Skip china directory or Chinese named directories
        if (
          entry.name.toLowerCase() === 'china' ||
          /[\u4e00-\u9fa5]/.test(entry.name)
        ) {
          continue
        }
        scanDishes(fullPath)
      } else if (
        entry.isFile() &&
        entry.name.endsWith('.md') &&
        entry.name !== 'README.md'
      ) {
        if (/[\u4e00-\u9fa5]/.test(entry.name)) continue

        try {
          const content = fs.readFileSync(fullPath, 'utf8')
          const parsed = matter(content)
          const fm = parsed.data

          const title = fm.title || entry.name.replace('.md', '')
          if (!title || !isLatinText(title)) continue

          // Compute relative slug for route navigation
          const relPath = path
            .relative(dishesDir, fullPath)
            .replace(/\\/g, '/')
            .replace(/\.md$/, '')
          const recipeId = `recipe_${sanitizeId(title)}`

          const region = fm.region || ''
          const categories = fm.categories || fm.category || []

          nodes.set(recipeId, {
            id: recipeId,
            label: title,
            type: 'recipe',
            color: NODE_COLORS.recipe,
            region: region,
            slug: relPath,
            categories: Array.isArray(categories) ? categories : [categories],
            difficulty: fm.difficulty || null,
            prep_time: fm.prep_time || null,
            cook_time: fm.cook_time || null,
            tags: fm.tags || [],
            size: 30,
          })

          // Extract ingredients
          const contentIngredients = extractIngredientsFromContent(
            parsed.content,
          )
          const allIngredients = Array.isArray(fm.main_ingredients)
            ? [...fm.main_ingredients]
            : []
          for (const ing of contentIngredients) {
            if (
              !allIngredients.some((i) => i.toLowerCase() === ing.toLowerCase())
            ) {
              allIngredients.push(ing)
            }
          }

          const currentRecipeIngIds = []

          for (const ing of allIngredients) {
            if (!isLatinText(ing)) continue
            const ingId = `ingredient_${sanitizeId(ing)}`
            currentRecipeIngIds.push(ingId)

            if (!nodes.has(ingId)) {
              nodes.set(ingId, {
                id: ingId,
                label: ing,
                type: 'ingredient',
                color: NODE_COLORS.ingredient,
                size: 25,
              })
            }

            edges.push({
              source: recipeId,
              target: ingId,
              type: 'USES',
              weight: 2,
            })

            if (!ingredientRecipes.has(ingId)) {
              ingredientRecipes.set(ingId, [])
            }
            ingredientRecipes.get(ingId).push(recipeId)

            // Auto categorize
            const cat = autoCategorizeIngredient(ing)
            if (cat) {
              const catId = getOrCreateCategoryNode(cat)
              const key = `${ingId}->${catId}`
              if (!ingredientCategoriesAdded.has(key)) {
                edges.push({
                  source: ingId,
                  target: catId,
                  type: 'BELONGS_TO',
                  weight: 1,
                })
                ingredientCategoriesAdded.add(key)
              }
            }
          }

          recipeIngredients.set(recipeId, currentRecipeIngIds)

          // Sensory profile
          const sensory = fm.sensory || {}
          if (Array.isArray(sensory.flavor)) {
            for (const flavor of sensory.flavor) {
              if (!isLatinText(flavor)) continue
              const fId = `flavor_${sanitizeId(flavor)}`
              if (!nodes.has(fId)) {
                nodes.set(fId, {
                  id: fId,
                  label: flavor,
                  type: 'flavor',
                  color: NODE_COLORS.flavor,
                  size: 15,
                })
              }
              edges.push({
                source: recipeId,
                target: fId,
                type: 'HAS_FLAVOR',
                weight: 1,
              })
            }
          }

          if (Array.isArray(sensory.texture)) {
            for (const texture of sensory.texture) {
              if (!isLatinText(texture)) continue
              const tId = `texture_${sanitizeId(texture)}`
              if (!nodes.has(tId)) {
                nodes.set(tId, {
                  id: tId,
                  label: texture,
                  type: 'texture',
                  color: NODE_COLORS.texture,
                  size: 15,
                })
              }
              edges.push({
                source: recipeId,
                target: tId,
                type: 'HAS_TEXTURE',
                weight: 1,
              })
            }
          }

          // Region
          if (region && isLatinText(region)) {
            const regId = `region_${sanitizeId(region)}`
            recipeRegions.set(recipeId, region)

            if (!nodes.has(regId)) {
              nodes.set(regId, {
                id: regId,
                label: region,
                type: 'region',
                color: NODE_COLORS.region,
                size: 35,
              })
            }

            edges.push({
              source: recipeId,
              target: regId,
              type: 'FROM_REGION',
              weight: 1.5,
            })

            addPlaceEdges(regId, region)
          }

          // Techniques
          const techniques = extractTechniquesFromContent(parsed.content)
          for (const tech of techniques) {
            const techId = `technique_${sanitizeId(tech)}`
            if (!nodes.has(techId)) {
              nodes.set(techId, {
                id: techId,
                label: tech,
                type: 'technique',
                color: NODE_COLORS.technique,
                size: 15,
              })
            }
            edges.push({
              source: recipeId,
              target: techId,
              type: 'USES_TECHNIQUE',
              weight: 1,
            })
          }
        } catch (e) {
          console.warn(`Warning reading ${fullPath}:`, e.message)
        }
      }
    }
  }

  // Archivos de ingredients/ excluidos del grafo (se reportan al final)
  const excludedSkips = { pending: 0, noLatin: 0, placeholder: 0 }
  const pendingFilesSkipped = new Set()

  scanDishes(dishesDir)
  scanIngredientsScience()

  // Scan scientific ingredient files
  function scanIngredients(dir) {
    if (!fs.existsSync(dir)) return
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === PENDING_REVIEW_DIRNAME) {
          for (const f of fs.readdirSync(fullPath)) {
            if (f.endsWith('.md')) pendingFilesSkipped.add(f) // basename: dedupe entre copias
          }
          continue
        }
        scanIngredients(fullPath)
      } else if (
        entry.isFile() &&
        entry.name.endsWith('.md') &&
        entry.name !== 'README.md'
      ) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8')
          const parsed = matter(content)
          const fm = parsed.data
          if (!fm.name || !isLatinText(fm.name)) {
            excludedSkips.noLatin++
            continue
          }
          if (isPlaceholderName(fm.name)) {
            excludedSkips.placeholder++
            continue
          }

          const ingId = `ingredient_${sanitizeId(fm.name)}`
          if (nodes.has(ingId)) {
            const node = nodes.get(ingId)
            node.scientific_name = fm.scientific_name || ''
            node.group = fm.group || ''
          } else {
            nodes.set(ingId, {
              id: ingId,
              label: fm.name,
              type: 'ingredient',
              color: NODE_COLORS.ingredient,
              scientific_name: fm.scientific_name || '',
              group: fm.group || '',
              size: 25,
            })
          }

          if (Array.isArray(fm.substitutes)) {
            for (const sub of fm.substitutes) {
              const subName = typeof sub === 'string' ? sub : sub.name || ''
              if (
                subName &&
                isLatinText(subName) &&
                !isPlaceholderName(subName)
              ) {
                const subId = `ingredient_${sanitizeId(subName)}`
                if (subId !== ingId) {
                  edges.push({
                    source: ingId,
                    target: subId,
                    type: 'SUBSTITUTE_FOR',
                    weight: 3,
                  })
                }
              }
            }
          }
        } catch (e) {
          console.warn(`Warning reading ingredient ${fullPath}:`, e.message)
        }
      }
    }
  }

  scanIngredients(ingredientsDir)
  scanIngredients(siteContentIngredientsDir)

  // Related dishes by ingredients (>= 3 shared)
  const recipeIds = Array.from(recipeIngredients.keys())
  for (let i = 0; i < recipeIds.length; i++) {
    for (let j = i + 1; j < recipeIds.length; j++) {
      const r1 = recipeIds[i]
      const r2 = recipeIds[j]
      const set1 = new Set(recipeIngredients.get(r1) || [])
      const set2 = new Set(recipeIngredients.get(r2) || [])
      let sharedCount = 0
      for (const item of set1) {
        if (set2.has(item)) sharedCount++
      }
      if (sharedCount >= 3) {
        edges.push({
          source: r1,
          target: r2,
          type: 'RELATED_DISHES',
          weight: sharedCount,
        })
      }
    }
  }

  // Related dishes by region
  const regionRecipes = new Map()
  for (const [rId, reg] of recipeRegions.entries()) {
    if (!regionRecipes.has(reg)) regionRecipes.set(reg, [])
    regionRecipes.get(reg).push(rId)
  }
  for (const [, list] of regionRecipes.entries()) {
    if (list.length >= 2) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          edges.push({
            source: list[i],
            target: list[j],
            type: 'RELATED_DISHES',
            weight: 2,
          })
        }
      }
    }
  }

  // Ingredient co-occurrence
  const ingIds = Array.from(ingredientRecipes.keys())
  for (let i = 0; i < ingIds.length; i++) {
    for (let j = i + 1; j < ingIds.length; j++) {
      const ing1 = ingIds[i]
      const ing2 = ingIds[j]
      const set1 = new Set(ingredientRecipes.get(ing1) || [])
      const set2 = new Set(ingredientRecipes.get(ing2) || [])
      let shared = 0
      for (const r of set1) {
        if (set2.has(r)) shared++
      }
      if (shared >= 2) {
        edges.push({
          source: ing1,
          target: ing2,
          type: 'OFTEN_TOGETHER',
          weight: shared,
        })
      }
    }
  }

  // ForceAtlas2 layout precomputado (sigma.js/WebGL renderiza x,y estaticos:
  // cero fisica en cliente, pan/zoom por GPU). Determinista via seed LCG para
  // diffs estables entre builds.
  computeLayout(nodes, edges)

  // Poda de aristas huérfanas: emisiones que referencian nodos inexistentes
  // (nombres vacíos/no-latinos, sustitutos fuera de la DB). Evita ~10% de
  // aristas muertas en el JSON y reporta los ids para depurar fuentes.
  const missingIds = new Set()
  const cleanEdges = edges.filter((e) => {
    const ok =
      nodes.has(e.source) && nodes.has(e.target) && e.source !== e.target
    if (!ok) {
      if (!nodes.has(e.source)) missingIds.add(e.source)
      if (!nodes.has(e.target)) missingIds.add(e.target)
    }
    return ok
  })
  if (missingIds.size > 0) {
    // Reporte completo para depurar las FUENTES: id + nº de aristas que lo
    // referenciaban (el aviso original truncaba a 12 ids y se perdía el resto).
    const orphanCounts = new Map()
    for (const e of edges) {
      for (const end of [e.source, e.target]) {
        if (missingIds.has(end))
          orphanCounts.set(end, (orphanCounts.get(end) || 0) + 1)
      }
    }
    const ordered = [...orphanCounts.entries()].sort((a, b) => b[1] - a[1])
    console.log(
      `⚠️ ${edges.length - cleanEdges.length} aristas huérfanas podadas (${missingIds.size} ids faltantes):`,
    )
    for (const [id, n] of ordered.slice(0, 40)) {
      console.log(`   ${String(n).padStart(5)} aristas ← ${id}`)
    }
    if (ordered.length > 40)
      console.log(`   … y ${ordered.length - 40} ids más`)
  }
  const totalSkips =
    pendingFilesSkipped.size + excludedSkips.noLatin + excludedSkips.placeholder
  if (totalSkips > 0) {
    console.log(
      `ℹ️ ingredients/: ${totalSkips} omisiones — staging "${PENDING_REVIEW_DIRNAME}": ${pendingFilesSkipped.size} archivos (repo + copia del sitio) · sin nombre latino: ${excludedSkips.noLatin} · placeholders: ${excludedSkips.placeholder}`,
    )
  }

  const graph = {
    nodes: Array.from(nodes.values()),
    edges: cleanEdges,
    metadata: {
      total_nodes: nodes.size,
      total_edges: cleanEdges.length,
      node_types: Object.keys(NODE_COLORS),
    },
  }

  const jsonStr = JSON.stringify(graph, null, 2)

  // Write outputs
  fs.mkdirSync(path.dirname(outputFileSite), { recursive: true })
  fs.writeFileSync(outputFileSite, jsonStr, 'utf8')

  fs.mkdirSync(path.dirname(outputFilePublic), { recursive: true })
  fs.writeFileSync(outputFilePublic, jsonStr, 'utf8')

  try {
    fs.mkdirSync(path.dirname(outputFileDocs), { recursive: true })
    fs.writeFileSync(outputFileDocs, jsonStr, 'utf8')
  } catch {}

  console.log(
    `✅ Knowledge graph generated: ${nodes.size} nodes, ${cleanEdges.length} edges`,
  )
}

// Layout ForceAtlas2 sincrono con seed determinista (LCG). Escribe x,y en cada
// nodo para render estatico WebGL (sigma.js). Barns-Hut activado para grafos
// grandes; iteraciones via FA2_LAYOUT_ITERATIONS (default 400).
//
// Ajuste de compacidad (medido con scripts/layout-stats.mjs sobre 3.625 nodos):
//  - strongGravityMode: la gravedad es un tiron CONSTANTE hacia el centro
//    (independiente de la distancia); en modo debil cae con 1/d y los nodos
//    perifericos escapan -> "tendriles" largos y bandas vacias.
//  - gravity 0.30 (subido desde 0.02) + scalingRatio 10 (bajado desde 20):
//    mas atraccion al centro, menos repulsion. Medido: ocupacion de la rejilla
//    16x16 pasa de 75.8% a 89.5% y tendril (full/p99) de 1.24 a 1.05.
//  - Compresion radial suave de la cola (>p95) en la normalizacion: acerca los
//    ultimos outliers sin apilarlos en el borde (el clamp solo ya los pegaba).
function computeLayout(nodes, edges) {
  const iterations = Number(process.env.FA2_LAYOUT_ITERATIONS || 400)
  const gravity = Number(process.env.FA2_GRAVITY || 0.3)
  const scalingRatio = Number(process.env.FA2_SCALING_RATIO || 10)
  const tailCompression = Number(process.env.FA2_TAIL_COMPRESSION || 0.35)
  let seed = 0x9e3779b9
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const g = new Graph({ multi: true, allowSelfLoops: false })
  for (const n of nodes.values()) {
    g.addNode(n.id, { x: rand() * 100, y: rand() * 100 })
  }
  let skipped = 0
  for (const e of edges) {
    if (!g.hasNode(e.source) || !g.hasNode(e.target) || e.source === e.target) {
      skipped++
      continue
    }
    try {
      g.addEdge(e.source, e.target)
    } catch {
      skipped++
    }
  }
  const settings = forceAtlas2.inferSettings(g)
  settings.barnesHutOptimize = true
  settings.barnesHutTheta = 0.6
  settings.strongGravityMode = true
  settings.scalingRatio = scalingRatio
  settings.gravity = gravity
  forceAtlas2.assign(g, { iterations, settings })
  // Normalización ROBUSTA a [0,1] (convención sigma: cámara default
  // (0.5, 0.5, ratio 1) encuadra [0,1]). Mediana + span p99-p1 (NO min-max:
  // unos pocos outliers estiraban el frame y la masa densa quedaba en un
  // rincón) + compresión radial suave de la cola (>p95) + clamp de seguridad.
  // Determinista.
  const xs = []
  const ys = []
  g.forEachNode((_id, a) => {
    xs.push(a.x)
    ys.push(a.y)
  })
  xs.sort((a, b) => a - b)
  ys.sort((a, b) => a - b)
  const q = (arr, p) =>
    arr[Math.min(arr.length - 1, Math.floor(arr.length * p))]
  const xmed = q(xs, 0.5)
  const ymed = q(ys, 0.5)
  const span = Math.max(
    q(xs, 0.99) - q(xs, 0.01),
    q(ys, 0.99) - q(ys, 0.01),
    1e-9,
  )
  // radio p95 alrededor de la mediana: más allá, la cola se comprime
  const radii = []
  g.forEachNode((_id, a) => {
    radii.push(Math.hypot(a.x - xmed, a.y - ymed))
  })
  radii.sort((a, b) => a - b)
  const r95 = q(radii, 0.95) || 1e-9
  const clamp01 = (v) => Math.min(1, Math.max(0, v))
  g.forEachNode((id, a) => {
    let dx = a.x - xmed
    let dy = a.y - ymed
    const r = Math.hypot(dx, dy)
    if (tailCompression > 0 && r > r95) {
      const s = (r95 + (r - r95) * tailCompression) / r
      dx *= s
      dy *= s
    }
    g.setNodeAttribute(id, 'x', clamp01(0.5 + (dx / span) * 0.8))
    g.setNodeAttribute(id, 'y', clamp01(0.5 + (dy / span) * 0.8))
  })
  g.forEachNode((id, attrs) => {
    const n = nodes.get(id)
    if (n) {
      n.x = attrs.x
      n.y = attrs.y
    }
  })
  console.log(
    `✅ FA2 layout: ${g.order} nodos, ${g.size} aristas, ${iterations} iters, ${skipped} aristas omitidas`,
  )
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateGraph()
}
