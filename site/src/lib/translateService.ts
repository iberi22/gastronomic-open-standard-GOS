import { getCollection } from 'astro:content'
import { SUPPORTED_LOCALES, alias } from './locales'

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

export async function translateEntity(options: TranslateOptions) {
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

  const [dishes, ingredients, substances] = await Promise.all([
    fetchDishes ? getCollection('dishes') : [],
    fetchIngs ? getCollection('ingredients') : [],
    fetchSubs ? getCollection('substances') : [],
  ])

  const term = entity ? entity.toLowerCase().trim() : ''

  const allItems: {
    id: string
    type: 'dish' | 'ingredient' | 'substance'
    name: string
    aliases: Record<string, string[]>
  }[] = []

  for (const d of dishes) {
    const data = d.data as Record<string, unknown>
    const name = String(data.title || data.name || d.id.split('/').pop() || d.id)
    const aliases = (data.aliases as Record<string, string[]>) || {}
    allItems.push({ id: d.id, type: 'dish', name, aliases })
  }

  for (const i of ingredients) {
    const data = i.data as Record<string, unknown>
    const name = String(data.name || data.title || i.id.split('/').pop() || i.id)
    const aliases = (data.aliases as Record<string, string[]>) || {}
    allItems.push({ id: i.id, type: 'ingredient', name, aliases })
  }

  for (const s of substances) {
    const data = s.data as Record<string, unknown>
    const name = String(data.name || data.title || s.id)
    const aliases = (data.aliases as Record<string, string[]>) || {}
    allItems.push({ id: s.id, type: 'substance', name, aliases })
  }

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
