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
/**
 * One logged set.
 *
 * The v1 shape (`{weightKg, rpe}` plus one of reps/durationS/distanceM) cannot express how a
 * real gym log is written, so a session exported from a training app loses most of itself. What
 * was added here is exactly what the port proved is needed — nothing speculative:
 *
 * - **Per-side sets** (`sides`): a unilateral exercise is trained one limb at a time and the
 *   asymmetry is the point of tracking it. A single combined row cannot hold 40 kg × 5 left and
 *   32 kg × 8 right.
 * - **Drop sets** (`drops`): a main set followed by lighter drops logged with no rest. The main
 *   set is the row's own load; the drops are extra volume on top.
 * - **Rest-pause** (`clusters`): an activation set followed by short-rest bursts. Note this is NOT
 *   the same as `drops` — a rest-pause row's own `reps` is already the total across every burst, so
 *   `clusters` only says how that total breaks down and must never be added to it again.
 * - **`phase`**: warm-up vs work. A ramp-up set is not training, and an export that counted it
 *   would overstate the session.
 * - **`rir`**: effort as reps-in-reserve, alongside `rpe`. They are mutually exclusive per set —
 *   a set keeps the scale it was logged with, and nothing else reads the value.
 * - **`speedKph`** on distance rows: cardio without pace is not a cardio record.
 *
 * `estimated1RmKg` is deliberately NOT derived here. A 1RM is a function of the estimator and its
 * inputs, so it is recalculated by whoever reads the session; persisting it would let two apps
 * disagree about the same lift.
 */
export interface SetEffort {
  /** Reps in reserve. Mutually exclusive with `rpe`. */
  rir?: number
  /** Rating of perceived exertion, 0–10. Mutually exclusive with `rir`. */
  rpe?: number
}

/** One logged limb of a unilateral set. */
export interface SideSet extends SetEffort {
  weightKg?: number
  reps?: number
  durationS?: number
  /** The load was set by hand here, so a later cascade must not overwrite it. */
  weightOrigin?: 'manual'
  drops?: { weightKg: number; reps: number }[]
  clusters?: { reps: number; restSec: number }[]
}

export type SetShape = 'straight' | 'dropset' | 'restpause'

export type ExerciseSet = SetEffort & {
  weightKg?: number
  /** Warm-up rows are excluded from volume, 1RM and fatigue totals by every consumer. */
  phase?: 'warmup' | 'work'
  /** Defaults to `straight`; the two other shapes carry their extra structure below. */
  shape?: SetShape
  /** Lighter drops after the main set, oldest first. Only for `dropset`. */
  drops?: { weightKg: number; reps: number }[]
  /**
   * Short-rest bursts, oldest first. Only for `restpause`. The row's own `reps` is ALREADY the
   * sum across these — adding them again double-counts the same work.
   */
  clusters?: { reps: number; restSec: number }[]
  /** Per-limb sets for a unilateral exercise. */
  sides?: { L: SideSet; R: SideSet }
} & (
  | { reps: number; durationS?: number; distanceM?: number; speedKph?: number }
  | { reps?: number; durationS: number; distanceM?: number; speedKph?: number }
  | { reps?: number; durationS?: number; distanceM: number; speedKph?: number }
)

/** One exercise as it was logged, with what the lifter said about it. */
export interface LoggedExercise {
  ref: ExerciseRef
  sets: ExerciseSet[]
  /** Free text the lifter left on this exercise specifically. */
  notes?: string
  /** The working weight confirmed after the exercise, with no rep count attached. */
  topWeightKg?: number
}

export interface WorkoutSession {
  startedAt: string
  endedAt: string
  routineId?: string
  exercises: LoggedExercise[]
  energy?: {
    kcal: number
    method: 'met-estimate' | 'device' | 'declared' | 'unknown'
  }
  /** Whole-session effort, 0–10. Distinct from any single set's rating. */
  perceivedEffort?: number
  notes?: string
}

/**
 * A routine as prescribed, so a plan can travel between apps.
 *
 * A session alone is half a training record: without the plan it was written against, the next
 * prescription cannot be derived, and derivation is how this ecosystem avoids storing a number
 * that drifts from the log that produced it. Progression policy travels with it — a target
 * without its rule is not reproducible.
 */
export interface WorkoutPlan {
  name: string
  exercises: PlannedExercise[]
  /** Per routine; an exercise may override it. */
  progression?: ProgressionPolicy
}

export interface PlannedExercise {
  ref: ExerciseRef
  sets?: number
  /** Upper bound of the rep range, or the target reps when there is no range. */
  reps?: number
  /** Lower bound; only meaningful alongside `reps` as a range. */
  repsMin?: number
  weightKg?: number
  /** Increment the progression engine steps by. */
  inc?: number
  /** No load column at all: progress in reps, or add a set past the ceiling. */
  bodyweight?: boolean
  /** Rest for this exercise in seconds; overrides the routine default. */
  restSec?: number
  /** One side at a time. */
  side?: boolean
  mode?: 'reps' | 'time' | 'cardio'
  notes?: string
}

/**
 * How the next target is derived. `off` means the targets stay where they were set.
 *
 * The policy is part of the record on purpose: the same history read under a different rule gives
 * a different next session, so a plan that did not carry its rule could not be reproduced.
 */
export type ProgressionPolicy = 'off' | 'linear' | 'greyskull' | 'double' | 'time'

/**
 * Body weight over time.
 *
 * Separate from `workout-session` because it is a different cadence and a different consumer: the
 * weigh-in answers "how is the trend going", not "what did you do". Averaging it into a session
 * would mix a slow signal with a fast one and make both harder to read.
 */
export interface BodyweightLog {
  entries: { date: string; weightKg: number }[]
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
  'workout-plan': WorkoutPlan
  'bodyweight-log': BodyweightLog
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
