// meta-description.ts — generador de <meta name="description"> por pagina.
//
// Por que existe: Layout.astro usaba un unico texto boilerplate como default,
// asi que 576 de 1102 paginas compartian la misma description. Google penaliza
// eso como contenido de poco valor. Aqui cada pagina compone la suya con los
// datos que ya tiene en la mano (frontmatter / collections), sin inventar.
//
// Reglas:
//   - 120-158 caracteres. Google recorta ~155-160 en desktop; menos de 100 es
//     texto de relleno, mas de 160 es desperdicio.
//   - Nada de stack tecnico (Astro/Svelte/Antigravity): es ruido para quien
//     busca "cuanto hierro tiene el cilantro".
//   - Cero datos inventados. Si la ficha esta en pending_review con campos
//     TODO, la description lo dice; no afirma nutricion que no existe.

export const DESC_MIN = 120
export const DESC_MAX = 158

/** Colapsa espacios, recorta en frontera de palabra y deja el rango 120-158. */
export function clampDescription(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= DESC_MAX) return clean
  const cut = clean.slice(0, DESC_MAX)
  const lastSpace = cut.lastIndexOf(' ')
  const trimmed = cut.slice(0, lastSpace > 0 ? lastSpace : DESC_MAX).trim()
  return `${trimmed.replace(/[,;:.]$/, '')}…`
}

export function isDescriptionLength(text: string): boolean {
  return text.length >= DESC_MIN && text.length <= DESC_MAX
}

/** group del frontmatter (inglés,Controlled Vocabulary) → español legible. */
const GROUP_ES: Record<string, string> = {
  Vegetable: 'vegetal',
  Fruit: 'fruta',
  Protein: 'proteína',
  Dairy: 'lácteo',
  Grain: 'cereal',
  Legume: 'legumbre',
  Condiment: 'condimento',
  Sauce: 'salsa',
  Oil: 'aceite',
  Sugar: 'azúcar',
  Spice: 'especie',
  Beverage: 'bebida',
  Nut: 'fruto seco',
  Uncategorized: 'ingrediente',
}

const CONDITION_ES: Record<string, string> = {
  'iron deficiency anemia': 'anemia por deficiencia de hierro',
  'kidney stones': 'cálculos renales',
  hypertension: 'hipertensión',
  inflammation: 'inflamación',
  fatigue: 'fatiga',
  diabetes: 'diabetes',
  'high blood pressure': 'hipertensión arterial',
}

/** Traduce una condicion del health_registry sin inventar: si no esta el mapa, se usa tal cual. */
function conditionES(condition: string): string {
  return CONDITION_ES[condition.trim().toLowerCase()] ?? condition
}

function num(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

/**
 * Rellena hasta DESC_MIN con los datos que queden, en orden de utilidad, y
 * solo al final usa una cola generica. Nunca inventa cifras: los remiendos son
 * nombre cientifico, region o la mencion del grafo.
 *
 * El bucle es necesario porque un solo pase no basta: con un solo campo
 * disponible el texto sigue corto y salia en 77 caracteres.
 */
function padTo(
  text: string,
  extras: Array<string | undefined>,
  fallbacks: string[],
): string {
  let out = text
  const queue = [...extras, ...fallbacks]
  for (const extra of queue) {
    if (out.length >= DESC_MIN) break
    if (!extra || out.includes(extra)) continue
    const next = `${out} ${extra}`
    out = next.length > DESC_MAX ? `${out} ${fallbacks[0]}` : next
  }
  return out
}

/** Colas genicas para rellenar cuando los datos reales no alcanzan el minimo. */
const FILLER = [
  'Ficha abierta en el grafo de GOS.',
  'Se puede consultar y citar desde la base abierta de GOS.',
]

export interface IngredientDescInput {
  name: string
  group?: string
  scientificName?: string
  nutrition?: Record<string, unknown>
  micronutrients?: Record<string, unknown>
  conditions?: string[]
  /** Ficha en pending_review: los camposscientificos/nutricionales son TODO/0. */
  pendingReview?: boolean
}

/**
 * Description de /ingredients/<slug>. Reutiliza lo que la pagina ya tiene:
 * nombre, grupo, nutricion por 100g, micronutrientes y condiciones del
 * registro de salud.
 */
export function ingredientDescription(input: IngredientDescInput): string {
  const name = (input.name || '').trim()
  const groupES = GROUP_ES[(input.group || '').trim()] ?? 'ingrediente'

  if (input.pendingReview) {
    // Honesto: la ficha existe y esta en revision, no se le atribuye nada.
    // "Uncategorized" ya traduce a "ingrediente"; decir
    // "ingrediente ingrediente" repetia la palabra en las 515.
    const label =
      groupES === 'ingrediente' ? 'ingrediente' : `ingrediente ${groupES}`
    return clampDescription(
      `${name}, ${label} registrado en GOS y en revision de datos: su composicion, nutricion y compuestos bioactivos aun no fueron verificados cientificamente.`,
    )
  }

  const kcal = num(input.nutrition?.calories)
  const protein = num(input.nutrition?.protein_g)
  const fiber = num(input.nutrition?.fiber_g)
  const parts: string[] = []

  if (kcal !== null) parts.push(`${fmt(kcal)} kcal`)
  if (protein !== null) parts.push(`${fmt(protein)} g de proteina`)
  if (fiber !== null) parts.push(`${fmt(fiber)} g de fibra`)

  const head = parts.length
    ? `${name} (${groupES}): ${parts.join(', ')} por 100 g`
    : `${name} (${groupES})`

  const condition = input.conditions?.[0]
    ? conditionES(String(input.conditions[0]))
    : undefined

  const tail = condition
    ? `Componentes asociados a ${condition}.`
    : 'Ficha abierta en el grafo gastronomico global de GOS.'

  // Relleno honesto con lo que exista: micronutriente real o nombre cientifico.
  const micro = Object.entries(input.micronutrients ?? {}).find(
    ([, v]) => num(v) !== null,
  )
  // La clave ya trae la unidad (vitamin_c_mg, potassium_mg): NO anexar "mg"
  // otra vez, salia "1.7 mg de manganese mg".
  const microText = micro
    ? `Aporta ${fmt(num(micro[1]) as number)} ${micro[0].replace(/_/g, ' ')} por 100 g.`
    : undefined
  const sciText = input.scientificName
    ? `Nombre cientifico: ${input.scientificName}.`
    : undefined
  return clampDescription(
    padTo(`${head}. ${tail}`, [microText, sciText], FILLER),
  )
}

export interface CountryDescInput {
  name: string
  region: string
  recipeCount: number
  /** Sabores/ingredientes caracteristicos ya presentes en el frontmatter. */
  highlights?: string[]
}

/** Description de /countries/<slug>. Cada pais tiene su propio conteo y region. */
export function countryDescription(input: CountryDescInput): string {
  const count = Math.max(1, Math.round(input.recipeCount))
  const plural = count === 1 ? 'receta' : 'recetas'
  const hi = (input.highlights ?? []).filter(Boolean).slice(0, 2).join(' y ')
  const tail = hi
    ? `Sabores: ${hi}.`
    : 'Con region, dificultad e ingredientes conectados al grafo abierto.'
  // Si la region trae el mismo nombre del pais ("122 recetas de Colombia"),
  // repetirlo es ruido: se usa la variante sin region.
  const regionPart =
    input.region.trim().toLowerCase() === input.name.trim().toLowerCase()
      ? ''
      : ` de ${input.region}`
  return clampDescription(
    `${input.name}: ${count} ${plural}${regionPart}, con ingredientes, tecnicas y perfil nutricional conectados en el grafo abierto de GOS. ${tail}`,
  )
}

/** Description de /countries (indice). */
export function countryIndexDescription(
  countryCount: number,
  recipeCount: number,
): string {
  return clampDescription(
    `Catalogo culinario de ${countryCount} paises y ${recipeCount} recetas: cada pais con su region, sus sabores y las tecnicas que lo definen, unidas en un grafo abierto.`,
  )
}

/** Description de /recipes (indice). */
export function recipeIndexDescription(recipeCount: number): string {
  return clampDescription(
    `${recipeCount} recetas de ${'todo el mundo'} con region, dificultad, ingredientes y pasos de preparacion, conectadas a su perfil nutricional y a la ciencia que las sustenta.`,
  )
}

export interface SubstanceDescInput {
  name: string
  formula?: string
  benefit?: string
  sazon?: string
  sabor?: string
  sourceIngredient?: string
  vitamins?: string[]
}

/** Description de /substances/<slug>. Cada sustancia tiene formula y beneficio. */
export function substanceDescription(input: SubstanceDescInput): string {
  const name = input.name || ''
  const identity = input.formula
    ? `${name} (${input.formula}), sustancia bioactiva`
    : `${name}, sustancia bioactiva`
  const from = input.sourceIngredient
    ? `Presente en ${input.sourceIngredient}.`
    : ''
  const effect = input.benefit ? `Efectos: ${input.benefit}.` : ''
  const aroma = input.sazon ? `Sazon: ${input.sazon}.` : ''
  const saborText = input.sabor ? `Sabor: ${input.sabor}.` : undefined
  const vitaminText = input.vitamins?.length
    ? `Aporta ${input.vitamins.slice(0, 3).join(', ')}.`
    : undefined
  // padTo (no un `if` suelto): con un solo campo disponible el texto queda
  // en 77 caracteres y la pagina se sale del rango SEO.
  const text = padTo(
    `${identity}. ${from} ${effect} ${aroma}`.trim(),
    [saborText, vitaminText],
    FILLER,
  )
  return clampDescription(text)
}
