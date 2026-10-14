import { alias, SUPPORTED_LOCALES } from './locales'

export interface TranslateResult {
  id: string
  type: 'dish' | 'ingredient' | 'substance'
  name: string
  locale?: string
  aliases: string[]
  all_aliases: Record<string, string[]>
}

export interface TranslateOptions {
  entity?: string
  locale?: string
  type?: string
}

export interface CatalogItem {
  id: string
  type: 'dish' | 'ingredient' | 'substance'
  name: string
  aliases: Record<string, string[]>
}

interface RawEntry {
  id: string
  data: Record<string, unknown>
}

// Convierte colecciones Astro en catálogo plano. Recibe entradas crudas para
// no importar 'astro:content' (no resoluble en vitest); el endpoint hace
// getCollection y pasa el resultado.
export function buildCatalog(entries: {
  dishes: RawEntry[]
  ingredients: RawEntry[]
  substances: RawEntry[]
}): CatalogItem[] {
  const items: CatalogItem[] = []
  for (const d of entries.dishes) {
    const name = String(
      d.data.title || d.data.name || d.id.split('/').pop() || d.id,
    )
    const aliases = (d.data.aliases as Record<string, string[]>) || {}
    items.push({ id: d.id, type: 'dish', name, aliases })
  }
  for (const i of entries.ingredients) {
    const name = String(
      i.data.name || i.data.title || i.id.split('/').pop() || i.id,
    )
    const aliases = (i.data.aliases as Record<string, string[]>) || {}
    items.push({ id: i.id, type: 'ingredient', name, aliases })
  }
  for (const s of entries.substances) {
    const name = String(s.data.name || s.data.title || s.id)
    const aliases = (s.data.aliases as Record<string, string[]>) || {}
    items.push({ id: s.id, type: 'substance', name, aliases })
  }
  return items
}

export function translateEntity(
  options: TranslateOptions,
  catalog: CatalogItem[],
) {
  const { entity, locale, type } = options
  const targetLocale = locale ? locale.toLowerCase() : undefined

  if (targetLocale && !SUPPORTED_LOCALES.includes(targetLocale)) {
    return {
      error: `Unsupported locale '${locale}'. Supported locales: ${SUPPORTED_LOCALES.join(', ')}`,
      supported_locales: SUPPORTED_LOCALES,
    }
  }

  const fetchDishes = !type || type === 'dish' || type === 'dishes'
  const fetchIngs = !type || type === 'ingredient' || type === 'ingredients'
  const fetchSubs = !type || type === 'substance' || type === 'substances'

  const allItems = catalog.filter(
    (item) =>
      (item.type === 'dish' && fetchDishes) ||
      (item.type === 'ingredient' && fetchIngs) ||
      (item.type === 'substance' && fetchSubs),
  )

  const term = entity ? entity.toLowerCase().trim() : ''
  const results: TranslateResult[] = []

  for (const item of allItems) {
    const matchesEntity =
      !term ||
      item.id.toLowerCase().includes(term) ||
      item.name.toLowerCase().includes(term) ||
      Object.values(item.aliases).some((list) =>
        list.some((a) => a.toLowerCase().includes(term)),
      )

    if (matchesEntity) {
      const aliasList = targetLocale
        ? alias(item.aliases, targetLocale)
        : Object.values(item.aliases).flat()

      results.push({
        id: item.id,
        type: item.type,
        name: item.name,
        locale: targetLocale,
        aliases: aliasList,
        all_aliases: item.aliases,
      })
    }
  }

  return {
    query: { entity: entity || null, locale: targetLocale || null },
    count: results.length,
    results,
    supported_locales: SUPPORTED_LOCALES,
  }
}
