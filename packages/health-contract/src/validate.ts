import { ALLERGENS, type ValidationResult } from './types.js'

const ULID = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/
const SLUG = '[a-z0-9]+(?:[-_][a-z0-9]+)*'
const DATE =
  /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?([Zz]|[+-](\d{2}):(\d{2}))$/
const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/
const DATASET = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\+sha256:[a-f0-9]{64}$/
type Obj = Record<string, unknown>
const own = (x: Obj, k: string) => Object.hasOwn(x, k)
/**
 * Real days in a month, leap years included.
 *
 * Both date paths go through this: `isDate` for a full timestamp, and the bodyweight weigh-in for a
 * bare YYYY-MM-DD. It used to be written out inline in `isDate` only, so the plain-date path bounded
 * the day to 1-31 and accepted 2026-02-30, 2026-04-31 and 2025-02-29 — dates that do not exist.
 * One rule, so the two paths cannot drift apart again.
 */
function daysInMonth(year: number, month: number): number {
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  return (
    [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0
  )
}

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
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(y, month) &&
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
  /**
   * The drops or clusters attached to a row or to one limb. The two shapes carry different fields
   * but are checked the same way, and both ride on a full set and on a per-side set — so this is
   * the one place that knows how.
   */
  const intensifier = (kind: string, v: unknown, path: string) => {
    const drops = kind === 'drops'
    if (!object(v, path, drops ? ['weightKg', 'reps'] : ['reps', 'restSec']))
      return
    if (drops) {
      number(v.weightKg, `${path}/weightKg`)
      number(v.reps, `${path}/reps`, true, Infinity, true)
    } else {
      number(v.reps, `${path}/reps`, true, Infinity, true)
      number(v.restSec, `${path}/restSec`, true, Infinity, true)
    }
  }
  const eachIntensifier = (src: Obj, path: string) => {
    for (const k of ['drops', 'clusters'])
      if (own(src, k))
        array(src[k], `${path}/${k}`, (v, p) => intensifier(k, v, p), 1)
  }

  /**
   * One logged set. `sides` is checked separately because a per-side row carries its numbers on
   * each limb rather than on the row, so the reps/duration/distance rule applies per side.
   */
  const exerciseSet = (set: unknown, path: string) => {
    if (
      !object(
        set,
        path,
        [
          'reps',
          'weightKg',
          'rir',
          'rpe',
          'durationS',
          'distanceM',
          'speedKph',
          'phase',
          'shape',
          'drops',
          'clusters',
          'sides',
        ],
        [],
      )
    )
      return
    // rir and rpe are the same judgement on two scales. A set keeps the one it was logged with, so
    // carrying both would leave every reader guessing which one it is meant to read.
    if (own(set, 'rir') && own(set, 'rpe'))
      fail(path, 'rir and rpe are mutually exclusive')
    for (const k of ['rir', 'rpe'])
      if (own(set, k)) number(set[k], `${path}/${k}`, false, 10)
    if (own(set, 'weightKg')) number(set.weightKg, `${path}/weightKg`)
    if (own(set, 'phase'))
      enumeration(set.phase, `${path}/phase`, ['warmup', 'work'])
    if (own(set, 'shape'))
      enumeration(set.shape, `${path}/shape`, [
        'straight',
        'dropset',
        'restpause',
      ])
    // The drops/clusters belong to a named shape. Carrying them without saying which shape they
    // are leaves a reader unable to tell extra volume from a breakdown of the same total.
    if (own(set, 'drops') && set.shape !== 'dropset')
      fail(`${path}/drops`, 'only valid when shape is dropset')
    if (own(set, 'clusters') && set.shape !== 'restpause')
      fail(`${path}/clusters`, 'only valid when shape is restpause')
    if (own(set, 'speedKph') && !own(set, 'distanceM'))
      fail(`${path}/speedKph`, 'only valid alongside distanceM')
    eachIntensifier(set, path)
    // The row-level numbers are checked for EVERY set, per-side or not. They used to live after an
    // early return on `sides`, which left a per-side row's own load, reps or distance unvalidated.
    const hasSides = own(set, 'sides')
    if (hasSides) {
      // A per-side row holds its numbers on each limb, so it is exempt from the
      // reps/duration/distance REQUIREMENT — that is what makes the asymmetry expressible.
      if (!object(set.sides, `${path}/sides`, ['L', 'R'])) return
      for (const side of ['L', 'R'] as const) {
        const s = (set.sides as Record<string, unknown>)[side]
        const sp = `${path}/sides/${side}`
        if (
          !object(
            s,
            sp,
            [
              'weightKg',
              'reps',
              'rir',
              'rpe',
              'durationS',
              'weightOrigin',
              'drops',
              'clusters',
            ],
            [],
          )
        )
          continue
        if (own(s, 'rir') && own(s, 'rpe'))
          fail(sp, 'rir and rpe are mutually exclusive')
        for (const k of ['rir', 'rpe'])
          if (own(s, k)) number(s[k], `${sp}/${k}`, false, 10)
        if (own(s, 'weightKg')) number(s.weightKg, `${sp}/weightKg`)
        if (own(s, 'reps')) number(s.reps, `${sp}/reps`, true, Infinity, true)
        if (own(s, 'durationS')) number(s.durationS, `${sp}/durationS`, true)
        if (own(s, 'weightOrigin'))
          enumeration(s.weightOrigin, `${sp}/weightOrigin`, ['manual'])
        eachIntensifier(s, sp)
        // A limb with no number on it is not a log of anything. The schema requires one of these
        // on each limb, so the validator has to as well or the two disagree.
        if (!['reps', 'durationS', 'weightKg'].some((k) => own(s, k)))
          fail(sp, 'reps, durationS or weightKg required')
      }
    } else if (!['reps', 'durationS', 'distanceM'].some((k) => own(set, k))) {
      // Only a row WITHOUT sides needs the number at row level.
      fail(path, 'reps, durationS or distanceM required')
    }
    for (const k of ['reps', 'durationS', 'distanceM', 'speedKph'])
      if (own(set, k))
        number(set[k], `${path}/${k}`, true, Infinity, k === 'reps')
  }

  /** The keys a planned exercise may carry, shared by the plan schema and its fixtures. */
  const plannedExercise = (v: unknown, p: string) => {
    if (
      !object(
        v,
        p,
        [
          'ref',
          'sets',
          'reps',
          'repsMin',
          'weightKg',
          'inc',
          'bodyweight',
          'restSec',
          'side',
          'mode',
          'notes',
        ],
        ['ref'],
      )
    )
      return
    string(v.ref, `${p}/ref`, new RegExp(`^(?:wg|ex):${SLUG}$`))
    // A lower bound with no upper bound is not a range; it prescribes a floor and nothing else,
    // and every consumer downstream reads `reps` as the top of the range.
    if (own(v, 'repsMin') && !own(v, 'reps')) fail(p, 'repsMin requires reps')
    if (own(v, 'sets')) number(v.sets, `${p}/sets`, true, Infinity, true)
    if (own(v, 'reps')) number(v.reps, `${p}/reps`, true, Infinity, true)
    if (own(v, 'repsMin'))
      number(v.repsMin, `${p}/repsMin`, true, Infinity, true)
    // A range whose lower bound reaches its upper bound is not a range: it would ask the lifter
    // to hit a number they have already passed.
    if (
      own(v, 'reps') &&
      own(v, 'repsMin') &&
      (v.repsMin as number) >= (v.reps as number)
    )
      fail(p, 'repsMin must be below reps')
    if (own(v, 'weightKg')) number(v.weightKg, `${p}/weightKg`)
    if (own(v, 'inc')) number(v.inc, `${p}/inc`, true)
    if (own(v, 'restSec'))
      number(v.restSec, `${p}/restSec`, true, Infinity, true)
    if (own(v, 'bodyweight')) {
      if (typeof v.bodyweight !== 'boolean')
        fail(`${p}/bodyweight`, 'expected boolean')
    }
    if (own(v, 'side')) {
      if (typeof v.side !== 'boolean') fail(`${p}/side`, 'expected boolean')
    }
    if (own(v, 'mode'))
      enumeration(v.mode, `${p}/mode`, ['reps', 'time', 'cardio'])
    if (own(v, 'notes')) string(v.notes, `${p}/notes`)
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
    'swal.health/v1/workout-plan',
    'swal.health/v1/bodyweight-log',
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
        // notes and topWeightKg are optional; without the empty required list `object` would
        // demand every allowed key.
        if (
          !object(
            v,
            p,
            ['ref', 'sets', 'notes', 'topWeightKg'],
            ['ref', 'sets'],
          )
        )
          return
        string(v.ref, `${p}/ref`, new RegExp(`^(?:wg|ex):${SLUG}$`))
        if (own(v, 'notes')) string(v.notes, `${p}/notes`)
        if (own(v, 'topWeightKg')) number(v.topWeightKg, `${p}/topWeightKg`)
        array(v.sets, `${p}/sets`, exerciseSet, 1)
      },
      1,
    )
  } else if (
    input.schema === 'swal.health/v1/workout-plan' &&
    object(
      data,
      '/data',
      ['name', 'exercises', 'progression'],
      ['name', 'exercises'],
    )
  ) {
    // A plan without a name cannot be told apart from another plan in a list or a picker.
    string(data.name, '/data/name', undefined, true)
    if (own(data, 'progression'))
      enumeration(data.progression, '/data/progression', [
        'off',
        'linear',
        'greyskull',
        'double',
        'time',
      ])
    array(data.exercises, '/data/exercises', plannedExercise, 1)
  } else if (
    input.schema === 'swal.health/v1/bodyweight-log' &&
    object(data, '/data', ['entries'], ['entries'])
  ) {
    array(
      data.entries,
      '/data/entries',
      (v, p) => {
        if (!object(v, p, ['date', 'weightKg'], ['date', 'weightKg'])) return
        // A calendar date, not a timestamp: a weigh-in is "the morning of", and asking for a time
        // would let two apps disagree about what day the same weigh-in belongs to.
        if (
          typeof v.date !== 'string' ||
          !/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(v.date) ||
          Number(v.date.slice(8, 10)) >
            daysInMonth(Number(v.date.slice(0, 4)), Number(v.date.slice(5, 7)))
        )
          fail(`${p}/date`, 'invalid calendar date (YYYY-MM-DD)')
        number(v.weightKg, `${p}/weightKg`, true)
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
