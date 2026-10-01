// site/src/lib/recipe-vault.ts — lógica de dominio del vault privado de recetas.
//
// Reglas del vault (100% local):
// - Validación contra el estándar existente (recipe-standard.ts) — se REUSAN sus
//   primitivas: isJunkIngredient (placeholders), formatMinutes (normalizar
//   tiempos), hasNutrition (filtrar nutrición en ceros), countryFromSlug
//   (derivar país desde el slug).
// - Convención de clave: la nutrición se guarda en `nutrition`
//   {calories, macros} — NO `nutrition_per_serving` (ver cabecera de
//   recipe-standard.ts).
// - Regla UI heredada del estándar: lo faltante o en cero se oculta, no se
//   escribe "No indicado".
// - Export/import = JSON puro. Sin red: ni fetch, ni XHR, ni WebSocket.

import type { DomainRecord, StorageAdapter } from './domain'
import {
  countryFromSlug,
  formatMinutes,
  hasNutrition,
  isJunkIngredient,
} from './recipe-standard'

/** Marca el payload como estándar GOS para que una importación de otro formato no cuele. */
export const VAULT_EXPORT_FORMAT = 'gos-recipe-vault'
export const VAULT_EXPORT_VERSION = 1

/**(instance_id): todo lo del vault vive bajo esta instancia = "solo mi teléfono". */
export const VAULT_INSTANCE = 'vault-local'

export interface VaultIssue {
  field: string
  message: string
}

export interface VaultMacroDraft {
  protein_g?: number
  fat_g?: number
  carbs_g?: number
}

export interface VaultNutritionDraft {
  calories?: number
  macros?: VaultMacroDraft
}

/** Receta normalizada y lista para persistir como DomainRecord. */
export interface VaultRecipeDraft {
  title: string
  slug: string
  region?: string
  country?: string
  prep_time?: string
  cook_time?: string
  servings?: string
  difficulty?: string
  main_ingredients: string[]
  instructions: string[]
  sensory?: Record<string, string>
  nutrition?: VaultNutritionDraft
  notes?: string
}

export interface VaultValidation {
  ok: boolean
  errors: VaultIssue[]
  /** Avisos no bloqueantes (p.ej. placeholders eliminados, campos en ceros). */
  warnings: string[]
  /** Siempre presente: mejor versión posible, para previsualizar en el form. */
  draft: VaultRecipeDraft
}

const asText = (v: unknown): string => {
  if (typeof v === 'string') return v
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return ''
}

const trimmed = (v: unknown): string | undefined => {
  const s = asText(v).trim()
  return s === '' ? undefined : s
}

/** Entero positivo o undefined. Cero y negativos = "no indicado" (se ocultan). */
const positiveNum = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : Number(asText(v).replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : undefined
}

/** "Mi receta de Invierno" → "mi-receta-de-invierno". Sin acentos ni símbolos. */
export function slugifyVaultRecipe(title: string): string {
  const ascii = asText(title).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const slug = ascii.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return slug === '' ? 'receta' : slug
}

/** Dificultad 1–5 → estrellas (formato real del corpus: difficulty = "★★★"). */
export function normalizeVaultDifficulty(v: unknown): string | undefined {
  if (v === null || v === undefined || v === '') return undefined
  // El corpus ya guarda estrellas ("★★★"): se cuentan tal cual, no se parsean.
  if (typeof v === 'string' && /[★☆]/.test(v)) {
    const filled = (v.match(/★/g) || []).length
    const total = filled + (v.match(/☆/g) || []).length
    const n = filled > 0 ? filled : total
    return n > 0 ? '★'.repeat(Math.min(5, Math.max(1, n))) : undefined
  }
  const n =
    typeof v === 'number' ? v : Number(asText(v).replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(n) || n <= 0) return undefined
  const clamped = Math.min(5, Math.max(1, Math.round(n)))
  return '★'.repeat(clamped)
}

/**
 * Limpia una lista de ingredientes con el filtro de placeholders del estándar.
 * Reporta cuántos se descartaron (quedan fuera del draft, no ensucian la receta).
 */
export function cleanVaultIngredients(raw: unknown): {
  names: string[]
  dropped: number
} {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(/\n|,/)
      : []
  const names: string[] = []
  let dropped = 0
  for (const item of list) {
    const name = asText(item).trim()
    if (isJunkIngredient(name)) {
      dropped++
      continue
    }
    names.push(name)
  }
  return { names, dropped }
}

function cleanVaultInstructions(raw: unknown): string[] {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(/\n/)
      : []
  return list.map((s) => asText(s).trim()).filter((s) => s !== '')
}

function cleanVaultSensory(raw: unknown): {
  sensory: Record<string, string> | undefined
  dropped: number
} {
  if (!raw || typeof raw !== 'object') {
    return { sensory: undefined, dropped: 0 }
  }
  const src = raw as Record<string, unknown>
  const sensory: Record<string, string> = {}
  let dropped = 0
  for (const key of ['flavor', 'texture', 'aroma', 'presentation']) {
    const value = asText(src[key]).trim()
    if (value === '') {
      dropped++
      continue
    }
    sensory[key] = value
  }
  return {
    sensory: Object.keys(sensory).length > 0 ? sensory : undefined,
    dropped,
  }
}

function cleanVaultNutrition(raw: unknown): {
  nutrition: VaultNutritionDraft | undefined
  empty: boolean
} {
  if (!raw || typeof raw !== 'object') {
    return { nutrition: undefined, empty: false }
  }
  const src = raw as Record<string, unknown>
  const macrosSrc =
    src.macros && typeof src.macros === 'object'
      ? (src.macros as Record<string, unknown>)
      : {}
  const nutrition: VaultNutritionDraft = {}
  const calories = positiveNum(src.calories)
  if (calories !== undefined) nutrition.calories = calories
  const macros: VaultMacroDraft = {}
  const protein = positiveNum(macrosSrc.protein_g)
  const fat = positiveNum(macrosSrc.fat_g)
  const carbs = positiveNum(macrosSrc.carbs_g)
  if (protein !== undefined) macros.protein_g = protein
  if (fat !== undefined) macros.fat_g = fat
  if (carbs !== undefined) macros.carbs_g = carbs
  if (Object.keys(macros).length > 0) nutrition.macros = macros
  // Reusa hasNutrition del estándar: bloque presente pero todo en ceros → se oculta.
  const empty = !hasNutrition(nutrition)
  return { nutrition: empty ? undefined : nutrition, empty }
}

/**
 * Valida y normaliza una receta de vault contra el estándar GOS.
 * Nunca lanza: devuelve errores por campo para que el form los muestre.
 */
export function validateVaultRecipe(input: unknown): VaultValidation {
  const errors: VaultIssue[] = []
  const warnings: string[] = []
  const src =
    input && typeof input === 'object' ? (input as Record<string, unknown>) : {}

  const title = trimmed(src.title) ?? ''
  if (title === '') {
    errors.push({ field: 'title', message: 'La receta necesita un título.' })
  }

  const { names, dropped } = cleanVaultIngredients(src.main_ingredients)
  if (dropped > 0) {
    warnings.push(
      `${dropped} ingrediente(s) de relleno eliminado(s) por el estándar.`,
    )
  }
  if (names.length === 0) {
    errors.push({
      field: 'main_ingredients',
      message: 'Añade al menos un ingrediente real.',
    })
  }

  // Tiempos: formatMinutes normaliza "45" → "45 min" y respeta "1 hora".
  const prep = formatMinutes(src.prep_time) ?? undefined
  const cook = formatMinutes(src.cook_time) ?? undefined
  if (prep === undefined && asText(src.prep_time).trim() !== '') {
    warnings.push('Tiempo de preparación descartado (valor no válido).')
  }
  if (cook === undefined && asText(src.cook_time).trim() !== '') {
    warnings.push('Tiempo de cocción descartado (valor no válido).')
  }

  // servings: entero positivo si es numérico ("4"), texto libre si no
  // ("8 raciones"). Un 0 se oculta en vez de guardarse (regla UI del estándar).
  const servingsRaw = trimmed(src.servings)
  const servingsNum =
    servingsRaw === undefined ? NaN : Number(servingsRaw.replace(',', '.'))
  const servings =
    servingsRaw === undefined
      ? undefined
      : Number.isFinite(servingsNum) &&
          /^[0-9]+([.,][0-9]+)?$/.test(servingsRaw)
        ? servingsNum > 0
          ? String(Math.trunc(servingsNum))
          : undefined
        : servingsRaw

  const slug = trimmed(src.slug) ?? slugifyVaultRecipe(title)
  const region = trimmed(src.region)
  // País: explícito o derivado del slug (mismo criterio que el estándar).
  const country = trimmed(src.country) ?? countryFromSlug(slug) ?? undefined

  const { sensory, dropped: sensoryDropped } = cleanVaultSensory(src.sensory)
  if (sensoryDropped > 0) {
    warnings.push('Campos sensoriales vacíos omitidos.')
  }

  const { nutrition, empty: nutritionEmpty } = cleanVaultNutrition(
    src.nutrition ?? src.nutrition_per_serving,
  )
  if (nutritionEmpty) {
    warnings.push('Nutrición en ceros omitida.')
  }

  const difficulty = normalizeVaultDifficulty(src.difficulty)
  if (difficulty === undefined && asText(src.difficulty).trim() !== '') {
    warnings.push('Dificultad fuera de rango 1–5, omitida.')
  }

  const draft: VaultRecipeDraft = {
    title,
    slug,
    main_ingredients: names,
    instructions: cleanVaultInstructions(src.instructions),
  }
  if (region !== undefined) draft.region = region
  if (country !== undefined) draft.country = country
  if (prep !== undefined) draft.prep_time = prep
  if (cook !== undefined) draft.cook_time = cook
  if (servings !== undefined) draft.servings = servings
  if (difficulty !== undefined) draft.difficulty = difficulty
  if (sensory !== undefined) draft.sensory = sensory
  if (nutrition !== undefined) draft.nutrition = nutrition
  const notes = trimmed(src.notes)
  if (notes !== undefined) draft.notes = notes

  return { ok: errors.length === 0, errors, warnings, draft }
}

// --- Import / export de JSON (puro, sin red) ---

export interface VaultExportPayload {
  format: typeof VAULT_EXPORT_FORMAT
  version: number
  exported_at: string
  recipes: unknown[]
}

export interface VaultImportResult {
  ok: boolean
  /** Recetas ya validadas y normalizadas, listas para guardar. */
  drafts: VaultRecipeDraft[]
  rejected: { index: number; reasons: string[] }[]
  error?: string
}

/** Serializa el vault entero a JSON descargable. */
export function serializeVaultExport(
  records: Array<Partial<DomainRecord>>,
  exportedAt: string = new Date().toISOString(),
): string {
  const payload: VaultExportPayload = {
    format: VAULT_EXPORT_FORMAT,
    version: VAULT_EXPORT_VERSION,
    exported_at: exportedAt,
    recipes: records,
  }
  return JSON.stringify(payload, null, 2)
}

/** Nombre de archivo con marca de tiempo (sin filesystem, solo sugerencia). */
export function vaultExportFilename(now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '-')
  return `gos-vault-${stamp}.json`
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

/**
 * Parsea e importa un JSON de vault. Cada receta se RE-VALIDA (no se confía en
 * el archivo ajeno) y se normaliza. Devuelve drafts, no ids: quien importa
 * decide los ids para no pisar recetas locales.
 */
export function parseVaultExport(raw: unknown): VaultImportResult {
  if (typeof raw === 'string') {
    if (raw.trim() === '') {
      return {
        ok: false,
        drafts: [],
        rejected: [],
        error: 'El archivo está vacío.',
      }
    }
    try {
      raw = JSON.parse(raw)
    } catch {
      return {
        ok: false,
        drafts: [],
        rejected: [],
        error: 'El archivo no es JSON válido.',
      }
    }
  }
  if (!isRecord(raw)) {
    return {
      ok: false,
      drafts: [],
      rejected: [],
      error: 'El archivo no contiene un objeto de vault.',
    }
  }
  if (raw.format !== VAULT_EXPORT_FORMAT) {
    return {
      ok: false,
      drafts: [],
      rejected: [],
      error: 'El archivo no es un export del vault GOS.',
    }
  }
  if (raw.version !== VAULT_EXPORT_VERSION) {
    return {
      ok: false,
      drafts: [],
      rejected: [],
      error: `Versión de vault no soportada: ${String(raw.version)}.`,
    }
  }
  const recipes = raw.recipes
  if (!Array.isArray(recipes)) {
    return {
      ok: false,
      drafts: [],
      rejected: [],
      error: 'El export no contiene la lista de recetas.',
    }
  }

  const drafts: VaultRecipeDraft[] = []
  const rejected: { index: number; reasons: string[] }[] = []
  recipes.forEach((item, index) => {
    // Acepta tanto el record completo (con metadatos) como el draft pelado.
    const candidate =
      isRecord(item) && isRecord(item.recipe) ? item.recipe : item
    const result = validateVaultRecipe(candidate)
    if (result.ok) {
      drafts.push(result.draft)
    } else {
      rejected.push({
        index,
        reasons: result.errors.map((e) => e.message),
      })
    }
  })

  return { ok: drafts.length > 0, drafts, rejected }
}

// --- Capa de persistencia (headless, sin Svelte ni DOM) ---
//
// Toda la orquestación del vault (crear/leer/borrar/importar/exportar) vive
// aquí, contra la interfaz StorageAdapter existente. RecipeVault.svelte es solo
// el skin: delega en estas funciones. Motivo: así el requisito "sin red" es
// verificable en vitest (sin plugin de Svelte) y no depende del DOM.
//
// CERO red por construcción: este módulo no importa nada de fetch/XHR/WebSocket
// y solo habla con el adapter inyectado.

export interface VaultStoreResult {
  ok: boolean
  error?: string
  warnings?: string[]
  /** Recetas afectadas por la operación. */
  records?: DomainRecord[]
  /** Recetas importadas (solo en import). */
  imported?: number
  /** Recetas descartadas por no cumplir el estándar (solo en import). */
  rejected?: number
}

/** Id local único: nunca pisa una receta ya guardada en el dispositivo. */
export function nextVaultRecipeId(takenIds: Iterable<string>): string {
  const taken = new Set(takenIds)
  const base = `vault-${Date.now().toString(36)}`
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

function toRecord(
  draft: VaultRecipeDraft,
  id: string,
  instanceId: string,
  now: string,
): DomainRecord {
  return {
    ...draft,
    id,
    instance_id: instanceId,
    created_at: now,
    updated_at: now,
  }
}

/** Lista las recetas del vault, más reciente primero. */
export async function vaultList(
  adapter: StorageAdapter,
  instanceId: string,
): Promise<DomainRecord[]> {
  const rows = await adapter.list('recipes', instanceId)
  return [...rows].sort((a, b) =>
    String(b.updated_at).localeCompare(String(a.updated_at)),
  )
}

/** Crea una receta. Valida contra el estándar ANTES de tocar el storage. */
export async function vaultCreate(
  adapter: StorageAdapter,
  instanceId: string,
  input: unknown,
  existing: DomainRecord[] = [],
): Promise<VaultStoreResult> {
  const validation = validateVaultRecipe(input)
  if (!validation.ok) {
    return {
      ok: false,
      error: validation.errors.map((e) => e.message).join(' '),
      warnings: validation.warnings,
    }
  }
  const now = new Date().toISOString()
  const record = toRecord(
    validation.draft,
    nextVaultRecipeId(existing.map((r) => r.id)),
    instanceId,
    now,
  )
  await adapter.create('recipes', record)
  return { ok: true, warnings: validation.warnings, records: [record] }
}

/** Actualiza una receta existente. Mismo contrato: valida antes de guardar. */
export async function vaultUpdate(
  adapter: StorageAdapter,
  instanceId: string,
  id: string,
  input: unknown,
): Promise<VaultStoreResult> {
  const validation = validateVaultRecipe(input)
  if (!validation.ok) {
    return {
      ok: false,
      error: validation.errors.map((e) => e.message).join(' '),
      warnings: validation.warnings,
    }
  }
  // `{ ...draft }`: un literal fresco sí es asignable a Record<string, unknown>;
  // pasar el interface directamente no compila (no lleva index signature).
  const updated = await adapter.update(
    'recipes',
    id,
    { ...validation.draft },
    instanceId,
  )
  if (!updated) {
    return {
      ok: false,
      error: 'No se encontró esa receta en este dispositivo.',
    }
  }
  return { ok: true, warnings: validation.warnings, records: [updated] }
}

/** Borra una receta. */
export async function vaultDelete(
  adapter: StorageAdapter,
  instanceId: string,
  id: string,
): Promise<VaultStoreResult> {
  const ok = await adapter.del('recipes', id, instanceId)
  return ok
    ? { ok: true }
    : { ok: false, error: 'No se encontró esa receta en este dispositivo.' }
}

/**
 * Exporta el vault a texto JSON. Puro: sin DOM, sin Blob, sin red — el
 * componente decide luego cómo descargarlo.
 */
export function vaultExport(
  records: DomainRecord[],
  exportedAt?: string,
): { json: string; filename: string } {
  return {
    json: serializeVaultExport(records, exportedAt),
    filename: vaultExportFilename(),
  }
}

/**
 * Importa un JSON de vault. Cada receta se revalida (no se confía en el
 * archivo ajeno) y entra con id nuevo, así que una importación NUNCA pisa una
 * receta local.
 */
export async function vaultImport(
  adapter: StorageAdapter,
  instanceId: string,
  raw: unknown,
  existing: DomainRecord[] = [],
): Promise<VaultStoreResult> {
  const parsed = parseVaultExport(raw)
  const error = parsed.error
  const now = new Date().toISOString()
  // Ids frescos y únicos también entre las del propio lote importado.
  const taken = existing.map((r) => r.id)
  const saved: DomainRecord[] = []
  for (const draft of parsed.drafts) {
    const id = nextVaultRecipeId(taken)
    taken.push(id)
    const record = toRecord(draft, id, instanceId, now)
    await adapter.create('recipes', record)
    saved.push(record)
  }
  return {
    ok: saved.length > 0 || error === undefined,
    error,
    imported: saved.length,
    rejected: parsed.rejected.length,
    records: saved,
  }
}
