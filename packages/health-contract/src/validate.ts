import { ALLERGENS, type ValidationResult } from './types.js'

const ULID = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/
const SLUG = '[a-z0-9]+(?:[-_][a-z0-9]+)*'
const DATE =
  /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?([Zz]|[+-](\d{2}):(\d{2}))$/
const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/
const DATASET = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\+sha256:[a-f0-9]{64}$/
type Obj = Record<string, unknown>
const own = (x: Obj, k: string) => Object.hasOwn(x, k)
function isDate(x: unknown): boolean {
  if (typeof x !== 'string') return false
  const m = DATE.exec(x)
  if (!m || m[0].length !== x.length) return false
  const [y, month, day, h, min, sec] = m.slice(1, 7).map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ]
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= (days[month - 1] ?? 0) &&
    h <= 23 &&
    min <= 59 &&
    sec <= 59 &&
    Number(m[8] ?? 0) <= 23 &&
    Number(m[9] ?? 0) <= 59
  )
}

/** Hand-written, dependency-free validation of all v1 records. Errors use JSON Pointer paths. */
export function validateRecord(input: unknown): ValidationResult {
  const errors: string[] = []
  const fail = (path: string, message: string) => {
    errors.push(`${path || '/'}: ${message}`)
  }
  const object = (
    x: unknown,
    path: string,
    allowed: string[],
    required = allowed,
  ): x is Obj => {
    if (x === null || typeof x !== 'object' || Array.isArray(x)) {
      fail(path, 'expected object')
      return false
    }
    const o = x as Obj
    for (const key of Object.keys(o))
      if (!allowed.includes(key)) fail(`${path}/${key}`, 'unknown property')
    for (const key of required)
      if (!own(o, key)) fail(`${path}/${key}`, 'required property')
    return true
  }
  const string = (
    x: unknown,
    path: string,
    pattern?: RegExp,
    nonempty = false,
  ) => {
    if (
      typeof x !== 'string' ||
      (nonempty && x.length === 0) ||
      (pattern && !pattern.test(x))
    )
      fail(path, 'invalid string')
  }
  const enumeration = (x: unknown, path: string, values: readonly string[]) => {
    if (typeof x !== 'string' || !values.includes(x))
      fail(path, 'unsupported value')
  }
  const number = (
    x: unknown,
    path: string,
    positive = false,
    max = Infinity,
    integer = false,
  ) => {
    if (
      typeof x !== 'number' ||
      !Number.isFinite(x) ||
      (positive ? x <= 0 : x < 0) ||
      x > max ||
      (integer && !Number.isInteger(x))
    )
      fail(path, 'invalid number')
  }
  const date = (x: unknown, path: string) => {
    if (!isDate(x)) fail(path, 'invalid ISO date-time')
  }
  const array = (
    x: unknown,
    path: string,
    visit: (v: unknown, p: string) => void,
    min = 0,
    unique = false,
  ) => {
    if (!Array.isArray(x)) {
      fail(path, 'expected array')
      return
    }
    if (x.length < min) fail(path, 'empty array')
    if (unique && new Set(x).size !== x.length) fail(path, 'duplicate value')
    Array.from(x).forEach((v, i) => {
      visit(v, `${path}/${i}`)
    })
  }
  if (
    !object(input, '', [
      'schema',
      'id',
      'subject',
      'createdAt',
      'source',
      'gosDataset',
      'data',
    ])
  )
    return { ok: false, errors }
  enumeration(input.schema, '/schema', [
    'swal.health/v1/meal-log',
    'swal.health/v1/workout-session',
    'swal.health/v1/dietary-profile',
  ])
  string(input.id, '/id', ULID)
  string(input.subject, '/subject', new RegExp(`^subj_${ULID.source.slice(1)}`))
  date(input.createdAt, '/createdAt')
  string(input.gosDataset, '/gosDataset', DATASET)
  if (object(input.source, '/source', ['app', 'version'])) {
    enumeration(input.source.app, '/source/app', [
      'fize',
      'training',
      'orionhealth',
      'gos',
    ])
    string(input.source.version, '/source/version', VERSION)
  }
  const data = input.data
  if (
    input.schema === 'swal.health/v1/meal-log' &&
    object(data, '/data', [
      'consumedAt',
      'mealType',
      'items',
      'nutrition',
      'nutritionSource',
      'origin',
    ])
  ) {
    date(data.consumedAt, '/data/consumedAt')
    enumeration(data.mealType, '/data/mealType', [
      'breakfast',
      'lunch',
      'dinner',
      'snack',
    ])
    enumeration(data.nutritionSource, '/data/nutritionSource', [
      'computed',
      'declared',
      'unknown',
    ])
    array(
      data.items,
      '/data/items',
      (v, p) => {
        if (!object(v, p, ['ref', 'servings', 'grams'], ['ref'])) return
        string(
          v.ref,
          `${p}/ref`,
          new RegExp(`^gos:(?:ingredient/${SLUG}|dish/${SLUG}/${SLUG})$`),
        )
        if (own(v, 'grams') === own(v, 'servings'))
          fail(p, 'exactly one of grams or servings required')
        for (const k of ['grams', 'servings'])
          if (own(v, k)) number(v[k], `${p}/${k}`, true)
      },
      1,
    )
    const keys = [
      'calories',
      'protein_g',
      'fat_g',
      'carbs_g',
      'fiber_g',
      'sugar_g',
      'micros',
    ]
    if (object(data.nutrition, '/data/nutrition', keys)) {
      for (const k of keys.slice(0, -1))
        number(data.nutrition[k], `/data/nutrition/${k}`)
      const micros = data.nutrition.micros
      if (
        micros !== null &&
        typeof micros === 'object' &&
        !Array.isArray(micros)
      ) {
        for (const [k, v] of Object.entries(micros)) {
          string(k, `/data/nutrition/micros/${k}`, new RegExp(`^${SLUG}$`))
          number(v, `/data/nutrition/micros/${k}`)
        }
      } else fail('/data/nutrition/micros', 'expected object')
    }
    if (
      object(data.origin, '/data/origin', ['app', 'venue', 'orderId'], ['app'])
    ) {
      enumeration(data.origin.app, '/data/origin/app', [
        'fize',
        'orionhealth',
        'gos',
      ])
      for (const k of ['venue', 'orderId'])
        if (own(data.origin, k))
          string(data.origin[k], `/data/origin/${k}`, undefined, true)
    }
  } else if (
    input.schema === 'swal.health/v1/workout-session' &&
    object(
      data,
      '/data',
      [
        'startedAt',
        'endedAt',
        'routineId',
        'exercises',
        'energy',
        'perceivedEffort',
        'notes',
      ],
      ['startedAt', 'endedAt', 'exercises'],
    )
  ) {
    date(data.startedAt, '/data/startedAt')
    date(data.endedAt, '/data/endedAt')
    if (own(data, 'routineId'))
      string(data.routineId, '/data/routineId', undefined, true)
    if (own(data, 'notes')) string(data.notes, '/data/notes')
    if (own(data, 'perceivedEffort'))
      number(data.perceivedEffort, '/data/perceivedEffort', false, 10)
    if (
      own(data, 'energy') &&
      object(data.energy, '/data/energy', ['kcal', 'method'])
    ) {
      number(data.energy.kcal, '/data/energy/kcal')
      enumeration(data.energy.method, '/data/energy/method', [
        'met-estimate',
        'device',
        'declared',
        'unknown',
      ])
    }
    array(
      data.exercises,
      '/data/exercises',
      (v, p) => {
        if (!object(v, p, ['ref', 'sets'])) return
        string(v.ref, `${p}/ref`, new RegExp(`^wg:${SLUG}$`))
        array(
          v.sets,
          `${p}/sets`,
          (set, sp) => {
            if (
              !object(
                set,
                sp,
                ['reps', 'weightKg', 'rpe', 'durationS', 'distanceM'],
                [],
              )
            )
              return
            if (!['reps', 'durationS', 'distanceM'].some((k) => own(set, k)))
              fail(sp, 'reps, durationS or distanceM required')
            for (const k of ['reps', 'durationS', 'distanceM'])
              if (own(set, k))
                number(set[k], `${sp}/${k}`, true, Infinity, k === 'reps')
            if (own(set, 'weightKg')) number(set.weightKg, `${sp}/weightKg`)
            if (own(set, 'rpe')) number(set.rpe, `${sp}/rpe`, false, 10)
          },
          1,
        )
      },
      1,
    )
  } else if (
    input.schema === 'swal.health/v1/dietary-profile' &&
    object(data, '/data', ['allergens', 'diets', 'targets', 'expiresAt'])
  ) {
    array(
      data.allergens,
      '/data/allergens',
      (v, p) =>
        enumeration(
          v,
          p,
          ALLERGENS.map((a) => `gos:allergen/${a}`),
        ),
      0,
      true,
    )
    array(
      data.diets,
      '/data/diets',
      (v, p) => string(v, p, new RegExp(`^gos:diet/${SLUG}$`)),
      0,
      true,
    )
    date(data.expiresAt, '/data/expiresAt')
    if (
      object(
        data.targets,
        '/data/targets',
        ['kcalPerDay', 'proteinGPerDay'],
        [],
      )
    ) {
      if (own(data.targets, 'kcalPerDay'))
        number(data.targets.kcalPerDay, '/data/targets/kcalPerDay', true)
      if (own(data.targets, 'proteinGPerDay'))
        number(data.targets.proteinGPerDay, '/data/targets/proteinGPerDay')
    }
  }
  return { ok: errors.length === 0, errors }
}
