import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(root, 'site/package.json'))
const matter = require('gray-matter')
const Ajv = require('ajv/dist/2020.js')

export const fold = (value) =>
  value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
const isNumber = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0
const numericRecord = (value) =>
  value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.values(value).every(isNumber)

function filesIn(dir) {
  return fs
    .readdirSync(dir, { recursive: true })
    .filter((file) => file.endsWith('.md'))
    .sort()
}

function readEntries(dir) {
  return filesIn(dir).map((file) => ({
    file: file.replaceAll(path.sep, '/'),
    ...matter(fs.readFileSync(path.join(dir, file), 'utf8')),
  }))
}

export function ingredientRecord(data, file) {
  const slug = path.posix.basename(file, '.md')
  const aliases = { es: [], en: [], ...data.aliases }
  const names = { es: data.name || slug }
  for (const [lang, translation] of Object.entries(data.i18n || {})) {
    if (translation.common_name && translation.common_name !== 'TODO')
      names[lang] = translation.common_name
    aliases[lang] = [
      ...new Set([
        ...(aliases[lang] || []),
        ...(translation.other_names || []),
      ]),
    ]
  }
  for (const [lang, values] of Object.entries(aliases))
    if (!names[lang] && values.length) names[lang] = values[0]
  // pending_review contains placeholder zeroes, not measured nutrient values.
  const pending = file.startsWith('pending_review/')
  return {
    ...data,
    id: `gos:ingredient/${slug}`,
    slug,
    names,
    group: data.group || file.split('/')[0],
    aliases,
    tags: data.tags || [],
    allergens: data.allergens || data.allergy_profile?.allergens || [],
    portions: data.portions || null,
    health_registry: data.health_registry || [],
    nutrition_per_100g: pending ? null : (data.nutrition_per_100g ?? null),
    micronutrients: pending ? null : (data.micronutrients ?? null),
  }
}

function resolver(ingredients) {
  const map = new Map()
  for (const ingredient of ingredients) {
    for (const term of [
      ingredient.id,
      ingredient.slug,
      ingredient.name,
      ...Object.values(ingredient.names),
      ...Object.values(ingredient.aliases).flat(),
    ].filter(Boolean)) {
      const key = fold(term)
      const existing = map.get(key)
      if (existing === undefined) map.set(key, ingredient)
      else if (existing?.id !== ingredient.id) map.set(key, null) // ambiguous names never resolve
    }
  }
  return (term) => (typeof term === 'string' ? map.get(fold(term)) : undefined)
}

// Explicit grams/kilograms only; no volume, count or guessed portion conversion.
export function parseQuantity(line) {
  let match = line
    .trim()
    .replace(/^[-*+]\s+/, '')
    .match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|gramos?|kilogramos?)\s+(?:de\s+)?(.+)$/i)
  if (match)
    return {
      ingredientId: match[3].trim(),
      grams:
        Number(match[1].replace(',', '.')) * (/^k/i.test(match[2]) ? 1000 : 1),
    }
  match = line
    .trim()
    .replace(/^[-*+]\s+/, '')
    .match(/^(.+?)\s*:\s*(\d+(?:[.,]\d+)?)\s*(kg|g|gramos?|kilogramos?)$/i)
  if (match)
    return {
      ingredientId: match[1].trim(),
      grams:
        Number(match[2].replace(',', '.')) * (/^k/i.test(match[3]) ? 1000 : 1),
    }
  return null
}

function quantitiesFrom(data, body) {
  if (Array.isArray(data.ingredient_quantities))
    return data.ingredient_quantities
  if (Array.isArray(data.ingredients))
    return data.ingredients.map((item) =>
      typeof item === 'string' ? parseQuantity(item) : item,
    )
  const heading = /^(#{1,6})[^\n]*(?:ingredientes|ingredients)[^\n]*\n/im.exec(
    body,
  )
  if (!heading) return []
  const remaining = body.slice(heading.index + heading[0].length)
  const nextHeading = new RegExp(`^#{1,${heading[1].length}}\\s`, 'm').exec(
    remaining,
  )
  const section = nextHeading
    ? remaining.slice(0, nextHeading.index)
    : remaining
  // Every nonempty line must parse. Tables, subheadings or prose block computation
  // rather than silently dropping a constituent and reporting an incomplete sum.
  const lines = section
    .split('\n')
    .filter((line) => line.trim() && !/^\s*---+\s*$/.test(line))
  return lines.map(parseQuantity)
}

export function dishRecord(data, file, body, ingredients) {
  const [country, ...parts] = file.replace(/\.md$/, '').split('/')
  if (!parts.length)
    throw new Error(`Dish requires a country directory: ${file}`)
  const dish = {
    ...data,
    id: `gos:dish/${country}/${parts.join('/')}`,
    slug: parts.join('/'),
    country,
    aliases: { es: [], en: [], ...data.aliases },
    tags: data.tags || [],
    allergens: data.allergens || [],
    health_registry: data.health_registry || [],
    nutrition_source: 'unknown',
  }
  const declared = data.nutrition_per_serving || data.nutrition
  if (declared && typeof declared === 'object' && Object.keys(declared).length)
    dish.nutrition_source = 'declared'
  const quantities = quantitiesFrom(data, body)
  if (Array.isArray(data.ingredient_quantities)) {
    dish.declared_ingredient_quantities = data.ingredient_quantities
    delete dish.ingredient_quantities
  }
  const servings = Number(data.servings)
  const resolve = resolver(ingredients)
  const resolved = quantities.map(
    (item) =>
      item && {
        ingredient: resolve(item.ingredientId || item.id || item.name),
        grams: item.grams,
      },
  )
  if (
    !resolved.length ||
    !Number.isFinite(servings) ||
    servings <= 0 ||
    resolved.some(
      (item) =>
        !item?.ingredient ||
        !isNumber(item.grams) ||
        item.grams === 0 ||
        !numericRecord(item.ingredient.nutrition_per_100g) ||
        !Object.keys(item.ingredient.nutrition_per_100g).length,
    )
  )
    return dish
  // Only sum fields supplied by every ingredient. Missing values remain absent.
  const sum = (field) => {
    const records = resolved.map(({ ingredient }) => ingredient[field])
    if (records.some((record) => !numericRecord(record))) return {}
    return Object.fromEntries(
      Object.keys(records[0])
        .filter((key) => records.every((record) => key in record))
        .map((key) => [
          key,
          resolved.reduce(
            (total, item, i) =>
              total + (records[i][key] * item.grams) / 100 / servings,
            0,
          ),
        ]),
    )
  }
  const nutrition = sum('nutrition_per_100g')
  if (!Object.keys(nutrition).length) return dish
  dish.nutrition_per_serving = nutrition
  dish.micronutrients_per_serving = sum('micronutrients')
  dish.ingredient_quantities = resolved.map(({ ingredient, grams }) => ({
    ingredientId: ingredient.id,
    grams,
  }))
  dish.nutrition_source = 'computed'
  return dish
}

export function validateDataset(dataset, repoRoot = root) {
  const ajv = new Ajv({ allErrors: true, strict: false })
  for (const [name, entries] of [
    ['ingredient', dataset.ingredients],
    ['dish', dataset.dishes],
    ['dataset-manifest', [dataset.manifest]],
  ]) {
    const validate = ajv.compile(
      JSON.parse(
        fs.readFileSync(
          path.join(repoRoot, `schemas/v1/${name}.schema.json`),
          'utf8',
        ),
      ),
    )
    const ids = new Set()
    for (const entry of entries) {
      if (!validate(entry))
        throw new Error(
          `${name} ${entry.id || ''}: ${JSON.stringify(validate.errors)}`,
        )
      if (entry.id && ids.has(entry.id))
        throw new Error(`Duplicate ID: ${entry.id}`)
      ids.add(entry.id)
    }
  }
}

export function buildDataset({
  repoRoot = root,
  contentDir = path.join(repoRoot, 'site/src/content'),
  generatedAt = new Date().toISOString(),
} = {}) {
  const ingredients = readEntries(path.join(contentDir, 'ingredients')).map(
    ({ data, file }) => ingredientRecord(data, file),
  )
  const dishes = readEntries(path.join(contentDir, 'dishes')).map(
    ({ data, file, content }) => dishRecord(data, file, content, ingredients),
  )
  const ingredientsMin = ingredients.map(
    ({ id, names, group, nutrition_per_100g, allergens }) => ({
      id,
      names,
      group,
      nutrition_per_100g,
      allergens,
    }),
  )
  const license = fs.readFileSync(path.join(repoRoot, 'LICENSE'), 'utf8')
  const version = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
  ).version
  const contentHash = createHash('sha256')
    .update(JSON.stringify({ ingredients, dishes, ingredientsMin, license }))
    .digest('hex')
  const manifest = {
    schemaVersion: '1',
    version,
    contentHash,
    generatedAt,
    counts: {
      ingredients: ingredients.length,
      dishes: dishes.length,
      nutrition: { computed: 0, declared: 0, unknown: 0 },
    },
    license,
    files: {
      ingredients: 'ingredients.json',
      dishes: 'dishes.json',
      ingredientsMin: 'ingredients.min.json',
    },
  }
  for (const dish of dishes) manifest.counts.nutrition[dish.nutrition_source]++
  const dataset = { ingredients, dishes, ingredientsMin, manifest }
  validateDataset(dataset, repoRoot)
  return dataset
}

export function exportDataset(options = {}) {
  const dataset = buildDataset(options)
  const outDir = options.outDir || path.join(root, 'site/public/api/v1')
  fs.mkdirSync(outDir, { recursive: true })
  for (const [file, value] of [
    ['ingredients.json', dataset.ingredients],
    ['dishes.json', dataset.dishes],
    ['ingredients.min.json', dataset.ingredientsMin],
    ['manifest.json', dataset.manifest],
  ])
    fs.writeFileSync(path.join(outDir, file), `${JSON.stringify(value)}\n`)
  console.log(
    `GOS v1 ${dataset.manifest.version}: ${JSON.stringify(dataset.manifest.counts)} sha256=${dataset.manifest.contentHash}`,
  )
  return dataset
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  exportDataset()
