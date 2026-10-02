export const ALLERGENS = [
  'celery',
  'crustacean',
  'egg',
  'fish',
  'gluten',
  'lupin',
  'milk',
  'mollusc',
  'mustard',
  'peanut',
  'sesame',
  'soy',
  'sulphite',
  'tree-nut',
] as const
export type AllergenRef = `gos:allergen/${(typeof ALLERGENS)[number]}`
export type IngredientRef = `gos:ingredient/${string}`
export type DishRef = `gos:dish/${string}/${string}`
export type DietRef = `gos:diet/${string}`
export type ExerciseRef = `wg:${string}`
export type Subject = `subj_${string}`
export interface Source {
  app: 'fize' | 'training' | 'orionhealth' | 'gos'
  version: string
}
export type MealItem = { ref: IngredientRef | DishRef } & (
  | { grams: number; servings?: never }
  | { servings: number; grams?: never }
)
export interface Nutrition {
  calories: number
  protein_g: number
  fat_g: number
  carbs_g: number
  fiber_g: number
  sugar_g: number
  micros: Record<string, number>
}
export interface MealLog {
  consumedAt: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  items: MealItem[]
  nutrition: Nutrition
  nutritionSource: 'computed' | 'declared' | 'unknown'
  origin: {
    app: 'fize' | 'orionhealth' | 'gos'
    venue?: string
    orderId?: string
  }
}
export type ExerciseSet = {
  weightKg?: number
  rpe?: number
} & (
  | { reps: number; durationS?: number; distanceM?: number }
  | { reps?: number; durationS: number; distanceM?: number }
  | { reps?: number; durationS?: number; distanceM: number }
)
export interface WorkoutSession {
  startedAt: string
  endedAt: string
  routineId?: string
  exercises: { ref: ExerciseRef; sets: ExerciseSet[] }[]
  energy?: {
    kcal: number
    method: 'met-estimate' | 'device' | 'declared' | 'unknown'
  }
  perceivedEffort?: number
  notes?: string
}
export interface DietaryProfile {
  allergens: AllergenRef[]
  diets: DietRef[]
  targets: { kcalPerDay?: number; proteinGPerDay?: number }
  expiresAt: string
}
export interface DataByType {
  'meal-log': MealLog
  'workout-session': WorkoutSession
  'dietary-profile': DietaryProfile
}
export type RecordType = keyof DataByType
export interface RecordOptions {
  subject: Subject
  source: Source
  gosDataset: string
}
export type HealthRecord<T extends RecordType = RecordType> = {
  [K in T]: RecordOptions & {
    schema: `swal.health/v1/${K}`
    id: string
    createdAt: string
    data: DataByType[K]
  }
}[T]
export interface ValidationResult {
  ok: boolean
  errors: string[]
}
