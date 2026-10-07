import { describe, expect, it } from 'vitest'
import {
  cleanVaultIngredients,
  normalizeVaultDifficulty,
  parseVaultExport,
  serializeVaultExport,
  slugifyVaultRecipe,
  VAULT_EXPORT_FORMAT,
  validateVaultRecipe,
  vaultExportFilename,
} from './recipe-vault'

const valid = {
  title: 'Arepas de choclo',
  main_ingredients: ['Maíz dulce', 'Queso fresco', 'Mantequilla'],
  instructions: ['Licuar todo', 'Cocinar en sartén'],
}

describe('slugifyVaultRecipe', () => {
  it('quita acentos, baja a minúsculas y une con guiones', () => {
    expect(slugifyVaultRecipe('P Provençal')).toBe('p-provencal')
    expect(slugifyVaultRecipe('Arepas de choclo')).toBe('arepas-de-choclo')
  })
  it('devuelve un slug usable si el título no tiene caracteres válidos', () => {
    expect(slugifyVaultRecipe('中文')).toBe('receta')
    expect(slugifyVaultRecipe('  ')).toBe('receta')
  })
})

describe('normalizeVaultDifficulty', () => {
  it('mapea 1–5 a estrellas (formato del corpus)', () => {
    expect(normalizeVaultDifficulty(3)).toBe('★★★')
    expect(normalizeVaultDifficulty('4')).toBe('★★★★')
    expect(normalizeVaultDifficulty('★★★')).toBe('★★★')
  })
  it('acota fuera de rango y descarta vacíos', () => {
    expect(normalizeVaultDifficulty(9)).toBe('★★★★★')
    expect(normalizeVaultDifficulty(0)).toBeUndefined()
    expect(normalizeVaultDifficulty('')).toBeUndefined()
    expect(normalizeVaultDifficulty(null)).toBeUndefined()
  })
})

describe('cleanVaultIngredients', () => {
  it('reusa el filtro de placeholders del estándar', () => {
    const { names, dropped } = cleanVaultIngredients([
      'Maíz dulce',
      'Ingrediente principal 1',
      '   ',
      'Queso',
    ])
    expect(names).toEqual(['Maíz dulce', 'Queso'])
    expect(dropped).toBe(2)
  })
  it('acepta texto con saltos o comas', () => {
    const { names } = cleanVaultIngredients('Maíz dulce\nQueso, Sal')
    expect(names).toEqual(['Maíz dulce', 'Queso', 'Sal'])
  })
})

describe('validateVaultRecipe', () => {
  it('acepta una receta mínima válida y deriva el slug', () => {
    const res = validateVaultRecipe(valid)
    expect(res.ok).toBe(true)
    expect(res.errors).toHaveLength(0)
    expect(res.draft.slug).toBe('arepas-de-choclo')
    expect(res.draft.instructions).toHaveLength(2)
  })

  it('exige título e ingredientes reales', () => {
    const res = validateVaultRecipe({ main_ingredients: [] })
    expect(res.ok).toBe(false)
    expect(res.errors.map((e) => e.field).sort()).toEqual([
      'main_ingredients',
      'title',
    ])
    // Un payload no-objeto no lanza, solo reporta.
    expect(validateVaultRecipe(null).ok).toBe(false)
    expect(validateVaultRecipe('basura').ok).toBe(false)
  })

  it('no acepta una receta de puro relleno como válida', () => {
    const res = validateVaultRecipe({
      title: 'PLACEHOLDER',
      main_ingredients: ['Ingrediente principal 1'],
    })
    expect(res.ok).toBe(false)
    expect(res.warnings.length).toBeGreaterThan(0)
  })

  it('normaliza tiempos con formatMinutes del estándar', () => {
    const res = validateVaultRecipe({
      ...valid,
      prep_time: 45,
      cook_time: '1 hora',
    })
    expect(res.draft.prep_time).toBe('45 min')
    // Cadena que ya trae unidad se respeta tal cual.
    expect(res.draft.cook_time).toBe('1 hora')
  })

  it('deriva el país desde el slug como el estándar', () => {
    const res = validateVaultRecipe({
      ...valid,
      slug: 'mexican/tacos_al_pastor',
    })
    expect(res.draft.country).toBe('México')
  })

  it('usa la clave nutrition (no nutrition_per_serving) y descarta ceros', () => {
    const res = validateVaultRecipe({
      ...valid,
      nutrition: {
        calories: 320,
        macros: { protein_g: 8, fat_g: 0, carbs_g: 40 },
      },
    })
    expect(res.draft.nutrition).toEqual({
      calories: 320,
      macros: { protein_g: 8, carbs_g: 40 },
    })
    expect(res.draft.nutrition).not.toHaveProperty('nutrition_per_serving')

    // Todo en ceros → bloque omitido (hasNutrition del estándar).
    const zero = validateVaultRecipe({
      ...valid,
      nutrition: {
        calories: 0,
        macros: { protein_g: 0, fat_g: 0, carbs_g: 0 },
      },
    })
    expect(zero.draft.nutrition).toBeUndefined()
    expect(zero.warnings.join(' ')).toContain('Nutrición')
  })

  it('aceptanutrition_per_serving de entrada pero la guardan normalizada', () => {
    const res = validateVaultRecipe({
      ...valid,
      nutrition_per_serving: { calories: 120, macros: { carbs_g: 25 } },
    })
    expect(res.draft.nutrition).toEqual({
      calories: 120,
      macros: { carbs_g: 25 },
    })
  })

  it('oculta servings en cero en vez de guardarlo', () => {
    const zero = validateVaultRecipe({ ...valid, servings: 0 })
    expect(zero.draft.servings).toBeUndefined()
    const eight = validateVaultRecipe({ ...valid, servings: '8 raciones' })
    expect(eight.draft.servings).toBe('8 raciones')
  })

  it('omite campos sensoriales vacíos y conserva los llenos', () => {
    const res = validateVaultRecipe({
      ...valid,
      sensory: {
        flavor: 'salado',
        texture: '',
        aroma: undefined,
        presentation: 'dorada',
      },
    })
    expect(res.draft.sensory).toEqual({
      flavor: 'salado',
      presentation: 'dorada',
    })
    const none = validateVaultRecipe({ ...valid, sensory: { flavor: '  ' } })
    expect(none.draft.sensory).toBeUndefined()
  })

  it('nunca guarda campos vacíos como texto', () => {
    const res = validateVaultRecipe({
      ...valid,
      region: '   ',
      notes: '',
    })
    expect(res.draft).not.toHaveProperty('region')
    expect(res.draft).not.toHaveProperty('notes')
  })
})

describe('serializeVaultExport', () => {
  it('produce JSON con formato y versión verificables', () => {
    const json = serializeVaultExport(
      [{ id: 'a', instance_id: 'vault-local', title: 'Arepas de choclo' }],
      '2026-01-01T00:00:00.000Z',
    )
    const parsed = JSON.parse(json)
    expect(parsed.format).toBe(VAULT_EXPORT_FORMAT)
    expect(parsed.exported_at).toBe('2026-01-01T00:00:00.000Z')
    expect(parsed.recipes).toHaveLength(1)
  })

  it('vaultExportFilename incluye una marca de tiempo legible', () => {
    const name = vaultExportFilename(new Date('2026-01-01T10:20:30.000Z'))
    expect(name).toMatch(/^gos-vault-.*\.json$/)
    expect(name).not.toContain(':')
  })
})

describe('parseVaultExport', () => {
  const payload = (recipes: unknown[]) =>
    JSON.stringify({
      format: VAULT_EXPORT_FORMAT,
      version: 1,
      exported_at: '2026-01-01T00:00:00.000Z',
      recipes,
    })

  it('revalida cada receta importada y devuelve drafts', () => {
    const res = parseVaultExport(payload([valid]))
    expect(res.ok).toBe(true)
    expect(res.drafts).toHaveLength(1)
    expect(res.drafts[0].slug).toBe('arepas-de-choclo')
  })

  it('descarta recetas inválidas sin tirar todo el import', () => {
    const res = parseVaultExport(payload([valid, { title: 'sin nada' }]))
    expect(res.ok).toBe(true)
    expect(res.drafts).toHaveLength(1)
    expect(res.rejected).toHaveLength(1)
    expect(res.rejected[0].index).toBe(1)
  })

  it('normaliza datos de un archivo ajeno (no confía en él)', () => {
    const res = parseVaultExport(
      payload([
        {
          title: 'Receta fuera del estándar',
          main_ingredients: ['Ingrediente principal 3', 'Sal'],
          prep_time: '30',
          nutrition_per_serving: { calories: 0 },
        },
      ]),
    )
    expect(res.ok).toBe(true)
    expect(res.drafts[0].main_ingredients).toEqual(['Sal'])
    expect(res.drafts[0].prep_time).toBe('30 min')
    expect(res.drafts[0].nutrition).toBeUndefined()
  })

  it('acepta el record completo con metadatos y con campo recipe anidado', () => {
    const wrapped = parseVaultExport(
      payload([
        { id: 'x', instance_id: 'vault-local', title: 'Arepas', recipe: valid },
      ]),
    )
    expect(wrapped.ok).toBe(true)
    // El campo `recipe` anidado manda sobre el title del envoltorio.
    expect(wrapped.drafts[0].title).toBe(valid.title)
  })

  it('rechaza archivos que no son export del vault', () => {
    expect(parseVaultExport(payload([valid])).ok).toBe(true)

    const wrongFormat = parseVaultExport({
      format: 'otro',
      version: 1,
      recipes: [],
    })
    expect(wrongFormat.ok).toBe(false)
    expect(wrongFormat.error).toContain('vault GOS')

    const wrongVersion = parseVaultExport({
      format: VAULT_EXPORT_FORMAT,
      version: 99,
      recipes: [valid],
    })
    expect(wrongVersion.ok).toBe(false)
    expect(wrongVersion.error).toContain('no soportada')

    const noRecipes = parseVaultExport({
      format: VAULT_EXPORT_FORMAT,
      version: 1,
      recipes: 'nope',
    })
    expect(noRecipes.ok).toBe(false)

    expect(parseVaultExport('').ok).toBe(false)
    expect(parseVaultExport('{no json').error).toContain('JSON')
    expect(parseVaultExport('[1,2]').ok).toBe(false)
  })

  it('reporta ok=false cuando ninguna receta del archivo es importable', () => {
    const res = parseVaultExport(payload([{ title: '' }]))
    expect(res.ok).toBe(false)
    expect(res.drafts).toHaveLength(0)
    expect(res.rejected).toHaveLength(1)
  })

  it('ida y vuelta: exportar y reimportar conserva las recetas', () => {
    const json = serializeVaultExport(
      [{ id: 'a', instance_id: 'vault-local', ...valid }],
      '2026-01-01T00:00:00.000Z',
    )
    const res = parseVaultExport(json)
    expect(res.ok).toBe(true)
    expect(res.drafts[0].title).toBe(valid.title)
    expect(res.drafts[0].main_ingredients).toEqual(valid.main_ingredients)
  })
})
