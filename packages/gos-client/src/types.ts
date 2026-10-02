/** Contract matching schemas/v1; passthrough metadata remains available. */
export type Nutrients = Record<string, number>
export interface EvidenceStudy {
  doi?: string
  doi_status?: string
  title?: string
  source?: string
  url?: string
  link?: string
  year?: number
  [key: string]: unknown
}
export interface HealthEvidence {
  condition?: string
  evidence_level?: string
  mechanism?: string
  compounds?: string[]
  studies?: EvidenceStudy[]
  [key: string]: unknown
}
export interface Ingredient {
  id: string
  slug: string
  name?: string
  scientific_name?: string
  names: Record<string, string> & { es: string }
  group: string
  nutrition_per_100g: Nutrients | null
  micronutrients: Nutrients | null
  allergens: string[]
  aliases: Record<string, string[]>
  tags: string[]
  portions: Record<string, unknown> | null
  health_registry: HealthEvidence[]
  active_compounds?: unknown[]
  sources?: string[]
  [key: string]: unknown
}
export interface Dish {
  id: string
  slug: string
  country: string
  nutrition_source: 'computed' | 'declared' | 'unknown'
  nutrition_per_serving?: Record<string, unknown>
  micronutrients_per_serving?: Nutrients
  aliases: Record<string, string[]>
  tags: string[]
  allergens: string[]
  health_registry: HealthEvidence[]
  portions?: Record<string, unknown> | null
  title?: string
  region?: string
  language?: string
  license?: string
  difficulty?: string
  image?: string
  prep_time?: string | number
  cook_time?: string | number
  servings?: string | number
  main_ingredients?: string[]
  categories?: string[]
  images?: { url?: string; description?: string; [key: string]: unknown }[]
  sensory?: {
    flavor?: string | string[]
    texture?: string | string[]
    aroma?: string | string[]
    presentation?: string
    [key: string]: unknown
  }
  ingredient_quantities?: {
    ingredientId: string
    grams: number
    [key: string]: unknown
  }[]
  [key: string]: unknown
}
export interface DatasetManifest {
  schemaVersion: '1'
  version: string
  contentHash: string
  generatedAt: string
  counts: {
    ingredients: number
    dishes: number
    nutrition: Record<'computed' | 'declared' | 'unknown', number>
  }
  license: string
  files: {
    ingredients: 'ingredients.json'
    dishes: 'dishes.json'
    ingredientsMin: 'ingredients.min.json'
  }
}
export interface CacheAdapter {
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T): Promise<void>
}
export interface NutritionResult {
  /** Known totals, in the units named by the source keys; absent fields stay absent. */
  nutrition: Nutrients
  micronutrients: Nutrients
  /** Missing IDs, empty blocks or missing nutrient keys relative to the input union. */
  missing: string[]
  complete: boolean
}
