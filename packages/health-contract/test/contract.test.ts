import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { gunzipSync, gzipSync } from 'node:zlib'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ALLERGENS,
  CompressionUnavailableError,
  ContractValidationError,
  DeepLinkSizeError,
  type DietaryProfile,
  decodeDeepLink,
  encodeDeepLink,
  fromFile,
  type HealthRecord,
  makeRecord,
  toFile,
  ulid,
  validateRecord,
} from '../src/index.js'

const root = fileURLToPath(
  new URL('../../../schemas/ecosystem/v1/', import.meta.url),
)
const types = ['envelope', 'meal-log', 'workout-session', 'dietary-profile']
const ajv = new Ajv2020({ allErrors: true, strict: true })
addFormats(ajv, { mode: 'full' })
for (const type of types)
  ajv.addSchema(JSON.parse(readFileSync(`${root}${type}.schema.json`, 'utf8')))
const fixtures = (valid: boolean) =>
  readdirSync(`${root}fixtures/${valid ? 'valid' : 'invalid'}`).map((name) => ({
    name,
    record: JSON.parse(
      readFileSync(
        `${root}fixtures/${valid ? 'valid' : 'invalid'}/${name}`,
        'utf8',
      ),
    ),
  }))
const profile = fixtures(true).find((f) => f.name === 'dietary-profile-01.json')
  ?.record as HealthRecord<'dietary-profile'>
const workout = fixtures(true).find((f) => f.name === 'workout-session-01.json')
  ?.record as HealthRecord<'workout-session'>
const meal = fixtures(true).find((f) => f.name === 'meal-log-01.json')
  ?.record as HealthRecord<'meal-log'>
const schemaFor = (type: string) => {
  const check = ajv.getSchema(
    `https://gos.swal.network/schemas/ecosystem/v1/${type}.schema.json`,
  )
  if (!check) throw new Error(`Missing schema ${type}`)
  return check
}
afterEach(() => vi.unstubAllGlobals())

describe('shared fixtures: Ajv 2020-12 / handwritten validator parity', () => {
  for (const valid of [true, false])
    for (const { name, record } of fixtures(valid)) {
      it(`${valid ? 'valid' : 'invalid'}/${name}`, () => {
        const type = types.find((t) => name.startsWith(`${t}-`))
        if (!type) throw new Error(`Unknown fixture ${name}`)
        const check = schemaFor(type)
        expect(check(record), JSON.stringify(check.errors)).toBe(valid)
        const result = validateRecord(record)
        expect(result.ok, result.errors.join('\n')).toBe(valid)
        expect(result.errors.length === 0).toBe(valid)
        expect(schemaFor('envelope')(record)).toBe(valid)
      })
    }
  it('has at least 3 valid / 6 invalid cases per schema and identical closed allergen enums', () => {
    for (const type of types) {
      expect(
        fixtures(true).filter((f) => f.name.startsWith(`${type}-`)).length,
      ).toBeGreaterThanOrEqual(3)
      expect(
        fixtures(false).filter((f) => f.name.startsWith(`${type}-`)).length,
      ).toBeGreaterThanOrEqual(6)
    }
    const schema = JSON.parse(
      readFileSync(`${root}envelope.schema.json`, 'utf8'),
    )
    expect(schema.$defs.allergen.enum).toEqual(
      ALLERGENS.map((a) => `gos:allergen/${a}`),
    )
  })
  it('agrees for missing and extra properties recursively in every record type', () => {
    for (const original of [meal, workout, profile]) {
      const check = schemaFor(original.schema.split('/')[2] ?? '')
      function walk(value: unknown, path: string[] = []) {
        if (value === null || typeof value !== 'object') return
        const mutations = Array.isArray(value)
          ? Object.keys(value)
          : [...Object.keys(value), '__unknown']
        for (const key of mutations) {
          const clone = structuredClone(original)
          let parent = clone as unknown as Record<string, unknown>
          for (const segment of path)
            parent = parent[segment] as Record<string, unknown>
          if (key === '__unknown') parent[key] = 'extra'
          else delete parent[key]
          expect(
            validateRecord(clone).ok,
            `${original.schema}/${path.join('/')}/${key}`,
          ).toBe(Boolean(check(clone)))
        }
        for (const [key, child] of Object.entries(value))
          walk(child, [...path, key])
      }
      walk(original)
    }
  })
  it.each([
    '2026-02-29T12:00:00Z',
    '2024-02-30T12:00:00Z',
    '2026-04-31T12:00:00Z',
    '2026-10-02T24:00:00Z',
    '2026-10-02T12:00:60Z',
    '2026-10-02T12:00:00+24:00',
    '2026-10-02T12:00:00',
    '2026-10-02',
    '2026-10-02T12:00:00Z\n',
  ])('rejects calendar/time edge %s', (createdAt) => {
    const record = { ...profile, createdAt }
    expect(schemaFor('envelope')(record)).toBe(false)
    expect(validateRecord(record).ok).toBe(false)
  })
  it('rejects non-JSON numbers at runtime', () => {
    expect(
      validateRecord({
        ...profile,
        data: { ...profile.data, targets: { kcalPerDay: Infinity } },
      }).ok,
    ).toBe(false)
  })
})

describe('construction and file transport', () => {
  it('generates 1000 unique canonical ULIDs', () => {
    const ids = Array.from({ length: 1000 }, () => ulid())
    expect(new Set(ids).size).toBe(1000)
    for (const id of ids) expect(id).toMatch(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/)
  })
  it('encodes a deterministic timestamp and 80 random bits', () => {
    vi.spyOn(Date, 'now').mockReturnValue(0)
    vi.spyOn(crypto, 'getRandomValues').mockImplementation((bytes) => {
      ;(bytes as Uint8Array).fill(255)
      return bytes
    })
    try {
      expect(ulid()).toBe('0000000000ZZZZZZZZZZZZZZZZ')
    } finally {
      vi.restoreAllMocks()
    }
  })
  it('constructs and validates a record', () => {
    const record = makeRecord('dietary-profile', profile.data, {
      subject: profile.subject,
      source: profile.source,
      gosDataset: profile.gosDataset,
    })
    expect(validateRecord(record)).toEqual({ ok: true, errors: [] })
    expect(record.schema).toBe(profile.schema)
    expect(record.id).not.toBe(profile.id)
    expect(() =>
      makeRecord(
        'dietary-profile',
        {
          ...profile.data,
          allergens: ['gos:allergen/nope'],
        } as unknown as DietaryProfile,
        profile,
      ),
    ).toThrow(ContractValidationError)
  })
  it('round-trips all valid fixtures and empty files without a wrapper', () => {
    const records = fixtures(true).map((f) => f.record)
    expect(fromFile(toFile(records))).toEqual(records)
    expect(fromFile(toFile([]))).toEqual([])
    expect(Array.isArray(JSON.parse(toFile(records)))).toBe(true)
  })
  it.each(['bad json', '{}', '[null]', '[{"schema":"v2"}]'])(
    'rejects file %s',
    (text) => {
      expect(() => fromFile(text)).toThrow(ContractValidationError)
    },
  )
  it('validates export boundaries', () => {
    expect(() => toFile([{}] as HealthRecord[])).toThrow(
      ContractValidationError,
    )
    expect(validateRecord(null).ok).toBe(false)
  })
})

describe('deep links', () => {
  it('interoperates with standard gzip/base64url outside the package', async () => {
    const link = await encodeDeepLink([profile], 'https://example.org/import')
    const payload =
      new URLSearchParams(new URL(link).hash.slice(1)).get('p') ?? ''
    const json = gunzipSync(Buffer.from(payload, 'base64url')).toString('utf8')
    expect(JSON.parse(json)).toEqual([profile])
    const external = gzipSync(
      Buffer.from(JSON.stringify([profile]), 'utf8'),
    ).toString('base64url')
    expect(await decodeDeepLink(`orionhealth://import?p=${external}`)).toEqual([
      profile,
    ])
  })
  it('accepts exactly 8192 encoded bytes and rejects the next byte', async () => {
    vi.stubGlobal('CompressionStream', undefined)
    const record = { ...workout, data: { ...workout.data, notes: '' } }
    const overhead = new TextEncoder().encode(JSON.stringify([record])).length
    record.data.notes = 'a'.repeat(6142 - overhead)
    const link = await encodeDeepLink([record], 'https://example.org/import')
    const payload =
      new URLSearchParams(new URL(link).hash.slice(1)).get('p') ?? ''
    expect(payload.length).toBe(8192)
    expect(await decodeDeepLink(link)).toEqual([record])
    record.data.notes += 'a'
    await expect(
      encodeDeepLink([record], 'https://example.org/import'),
    ).rejects.toMatchObject({ payloadBytes: 8193 })
  })

  it.each([
    'https://example.org/import?lang=es#view=preview',
    'orionhealth://import?lang=es#view=preview',
  ])('gzip round-trip %s', async (base) => {
    const link = await encodeDeepLink([meal, workout, profile], base)
    expect(await decodeDeepLink(link)).toEqual([meal, workout, profile])
    const url = new URL(link)
    expect(url.searchParams.get('lang')).toBe('es')
    expect(new URLSearchParams(url.hash.slice(1)).get('view')).toBe('preview')
    const payload =
      url.protocol === 'https:'
        ? new URLSearchParams(url.hash.slice(1)).get('p')
        : url.searchParams.get('p')
    expect(payload).not.toContain('j.')
    if (url.protocol === 'https:') expect(url.searchParams.has('p')).toBe(false)
  })
  it('fallback is UTF-8 base64url with j. marker, interoperable with gzip-capable import', async () => {
    vi.stubGlobal('CompressionStream', undefined)
    vi.stubGlobal('DecompressionStream', undefined)
    const record = {
      ...workout,
      data: { ...workout.data, notes: 'Sesión 🥑 日本語' },
    }
    const link = await encodeDeepLink([record], 'https://example.org/import')
    expect(new URLSearchParams(new URL(link).hash.slice(1)).get('p')).toMatch(
      /^j\.[A-Za-z0-9_-]+$/,
    )
    expect(await decodeDeepLink(link)).toEqual([record])
  })
  it('reports missing decompression as typed file-export recommendation', async () => {
    const link = await encodeDeepLink([profile], 'https://example.org/import')
    vi.stubGlobal('DecompressionStream', undefined)
    await expect(decodeDeepLink(link)).rejects.toThrow(
      CompressionUnavailableError,
    )
  })
  it('replaces stale p values in both carriers', async () => {
    const link = await encodeDeepLink(
      [],
      'https://example.org/import?p=stale#p=stale',
    )
    expect(await decodeDeepLink(link)).toEqual([])
    expect(new URL(link).searchParams.has('p')).toBe(false)
  })
  it('guards compressed output above 8 KiB and recommends file export', async () => {
    const notes = Array.from(
      crypto.getRandomValues(new Uint8Array(20000)),
      (byte) => String.fromCharCode(33 + (byte % 90)),
    ).join('')
    const records = [{ ...workout, data: { ...workout.data, notes } }]
    await expect(
      encodeDeepLink(records, 'https://example.org/import'),
    ).rejects.toThrow(DeepLinkSizeError)
    await expect(
      encodeDeepLink(records, 'https://example.org/import'),
    ).rejects.toThrow(/file export/)
    expect(fromFile(toFile(records))).toEqual(records)
  })
  it('guards uncompressed output and inbound payload', async () => {
    vi.stubGlobal('CompressionStream', undefined)
    await expect(
      encodeDeepLink(
        [{ ...workout, data: { ...workout.data, notes: 'a'.repeat(9000) } }],
        'https://example.org/import',
      ),
    ).rejects.toThrow(DeepLinkSizeError)
    await expect(
      decodeDeepLink(`https://example.org/import#p=${'a'.repeat(8193)}`),
    ).rejects.toMatchObject({ limitBytes: 8192, payloadBytes: 8193 })
  })
  it('bounds decompressed gzip to 1 MiB', async () => {
    const link = await encodeDeepLink(
      [{ ...workout, data: { ...workout.data, notes: 'a'.repeat(1100000) } }],
      'https://example.org/import',
    )
    await expect(decodeDeepLink(link)).rejects.toThrow(/1 MiB/)
  })
  it.each([
    'no-url',
    'http://example.org/import#p=abc',
    'https://example.org/import',
    'https://example.org/import#p=abc&p=def',
    'https://example.org/import?p=abc#p=def',
    'https://example.org/import#p=j.A',
    'https://example.org/import#p=j.W10=',
    'https://example.org/import#p=abc',
    'https://example.org/import#p=j._w',
  ])('rejects malformed link %s', async (link) => {
    await expect(decodeDeepLink(link)).rejects.toThrow(ContractValidationError)
  })
})
