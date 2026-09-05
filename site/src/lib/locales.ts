export interface LocaleInfo {
  code: string
  name: string
  nativeName: string
  hreflang: string
}

export const LOCALES: Record<string, LocaleInfo> = {
  es: { code: 'es', name: 'Spanish', nativeName: 'Español', hreflang: 'es' },
  en: { code: 'en', name: 'English', nativeName: 'English', hreflang: 'en' },
  zh: { code: 'zh', name: 'Chinese', nativeName: '中文', hreflang: 'zh' },
  hi: { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', hreflang: 'hi' },
  ar: { code: 'ar', name: 'Arabic', nativeName: 'العربية', hreflang: 'ar' },
  pt: {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    hreflang: 'pt',
  },
  bn: { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', hreflang: 'bn' },
  ru: { code: 'ru', name: 'Russian', nativeName: 'Русский', hreflang: 'ru' },
  ja: { code: 'ja', name: 'Japanese', nativeName: '日本語', hreflang: 'ja' },
  pa: { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', hreflang: 'pa' },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch', hreflang: 'de' },
  jv: { code: 'jv', name: 'Javanese', nativeName: 'Basa Jawa', hreflang: 'jv' },
  wu: { code: 'wu', name: 'Wu Chinese', nativeName: '吴语', hreflang: 'wuu' },
  ms: {
    code: 'ms',
    name: 'Malay',
    nativeName: 'Bahasa Melayu',
    hreflang: 'ms',
  },
  te: { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', hreflang: 'te' },
  vi: {
    code: 'vi',
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    hreflang: 'vi',
  },
  ko: { code: 'ko', name: 'Korean', nativeName: '한국어', hreflang: 'ko' },
  fr: { code: 'fr', name: 'French', nativeName: 'Français', hreflang: 'fr' },
  ta: { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', hreflang: 'ta' },
  ur: { code: 'ur', name: 'Urdu', nativeName: 'اردو', hreflang: 'ur' },
}

export const SUPPORTED_LOCALES = Object.keys(LOCALES)

export interface EntityWithAliases {
  title?: string
  name?: string
  aliases?: Record<string, string[]>
}

/**
 * Returns alias list for a given entity or aliases dictionary and locale.
 */
export function alias(
  entityOrAliases:
    | EntityWithAliases
    | Record<string, string[]>
    | undefined
    | null,
  locale: string,
): string[] {
  if (!entityOrAliases) return []

  const aliasesObj =
    'aliases' in entityOrAliases && typeof entityOrAliases.aliases === 'object'
      ? entityOrAliases.aliases
      : (entityOrAliases as Record<string, string[]>)

  if (!aliasesObj || typeof aliasesObj !== 'object') return []

  const targetLocale = locale.toLowerCase()
  const found = aliasesObj[targetLocale] || aliasesObj[locale]
  return Array.isArray(found) ? found : []
}
