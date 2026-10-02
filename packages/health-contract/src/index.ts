export * from './types.js'
export { validateRecord } from './validate.js'

import type {
  DataByType,
  HealthRecord,
  RecordOptions,
  RecordType,
} from './types.js'
import { validateRecord } from './validate.js'

export class ContractValidationError extends Error {
  readonly errors: string[]
  constructor(errors: string[]) {
    super(`Invalid swal.health/v1 data: ${errors.join('; ')}`)
    this.name = 'ContractValidationError'
    this.errors = errors
  }
}
export const DEEP_LINK_LIMIT_BYTES = 8192
export class DeepLinkSizeError extends Error {
  readonly limitBytes = DEEP_LINK_LIMIT_BYTES
  constructor(readonly payloadBytes: number) {
    super(
      `Deep link payload is ${payloadBytes} bytes (maximum ${DEEP_LINK_LIMIT_BYTES}); use .swalhealth.json file export.`,
    )
    this.name = 'DeepLinkSizeError'
  }
}
export class CompressionUnavailableError extends Error {
  constructor() {
    super(
      'Gzip import needs DecompressionStream; use .swalhealth.json file export.',
    )
    this.name = 'CompressionUnavailableError'
  }
}
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
/** Cryptographically random ULID, 48-bit millisecond time + 80 random bits. */
export function ulid(): string {
  let timestamp = BigInt(Date.now())
  if (timestamp < 0n || timestamp > 0xffffffffffffn)
    throw new RangeError('ULID timestamp outside 48-bit range')
  let prefix = ''
  for (let i = 0; i < 10; i++) {
    prefix = ALPHABET[Number(timestamp & 31n)] + prefix
    timestamp >>= 5n
  }
  const bytes = crypto.getRandomValues(new Uint8Array(10))
  let random = 0n
  for (const byte of bytes) random = (random << 8n) | BigInt(byte)
  let suffix = ''
  for (let i = 0; i < 16; i++) {
    suffix = ALPHABET[Number(random & 31n)] + suffix
    random >>= 5n
  }
  return prefix + suffix
}
export function makeRecord<T extends RecordType>(
  type: T,
  data: DataByType[T],
  options: RecordOptions,
): HealthRecord<T> {
  const record = {
    ...options,
    schema: `swal.health/v1/${type}`,
    id: ulid(),
    createdAt: new Date().toISOString(),
    data,
  }
  const result = validateRecord(record)
  if (!result.ok) throw new ContractValidationError(result.errors)
  return record as HealthRecord<T>
}
function records(input: unknown): HealthRecord[] {
  if (!Array.isArray(input))
    throw new ContractValidationError(['/: expected array of records'])
  const errors = Array.from(input).flatMap((record, i) =>
    validateRecord(record).errors.map((error) => `[${i}]${error}`),
  )
  if (errors.length) throw new ContractValidationError(errors)
  return input as HealthRecord[]
}
/** File wire format is a JSON array, with no language-specific wrapper. */
export function toFile(input: readonly HealthRecord[]): string {
  return `${JSON.stringify(records(input), null, 2)}\n`
}
export function fromFile(text: string): HealthRecord[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new ContractValidationError(['/: malformed JSON'])
  }
  return records(parsed)
}
function base64url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function unbase64url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1)
    throw new ContractValidationError(['/p: invalid base64url'])
  let binary: string
  try {
    binary = atob(
      value.replace(/-/g, '+').replace(/_/g, '/') +
        '='.repeat((4 - (value.length % 4)) % 4),
    )
  } catch {
    throw new ContractValidationError(['/p: invalid base64url'])
  }
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0))
  if (base64url(bytes) !== value)
    throw new ContractValidationError(['/p: noncanonical base64url'])
  return bytes
}
function sizeGuard(payload: string): void {
  const size = new TextEncoder().encode(payload).length
  if (size > DEEP_LINK_LIMIT_BYTES) throw new DeepLinkSizeError(size)
}
/** HTTPS links use the fragment to keep health data out of HTTP requests. */
export async function encodeDeepLink(
  input: readonly HealthRecord[],
  base: string,
): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(records(input)))
  let payload: string
  if (typeof CompressionStream !== 'undefined') {
    const stream = new Blob([bytes])
      .stream()
      .pipeThrough(new CompressionStream('gzip'))
    payload = base64url(
      new Uint8Array(await new Response(stream).arrayBuffer()),
    )
  } else payload = `j.${base64url(bytes)}`
  sizeGuard(payload)
  const url = new URL(base)
  if (url.protocol !== 'https:' && url.protocol !== 'orionhealth:')
    throw new ContractValidationError(['/url: expected https: or orionhealth:'])
  // Remove stale payloads from both carriers before setting exactly one.
  const fragment = new URLSearchParams(url.hash.slice(1))
  fragment.delete('p')
  url.searchParams.delete('p')
  if (url.protocol === 'https:') fragment.set('p', payload)
  else url.searchParams.set('p', payload)
  url.hash = fragment.toString()
  return url.toString()
}
export async function decodeDeepLink(link: string): Promise<HealthRecord[]> {
  let url: URL
  try {
    url = new URL(link)
  } catch {
    throw new ContractValidationError(['/url: malformed URL'])
  }
  if (url.protocol !== 'https:' && url.protocol !== 'orionhealth:')
    throw new ContractValidationError(['/url: expected https: or orionhealth:'])
  const fragment = new URLSearchParams(url.hash.slice(1))
  const carriers = [...fragment.getAll('p'), ...url.searchParams.getAll('p')]
  if (carriers.length !== 1 || !carriers[0])
    throw new ContractValidationError(['/p: exactly one payload required'])
  const payload = carriers[0]
  sizeGuard(payload)
  const raw = payload.startsWith('j.')
  const bytes = unbase64url(raw ? payload.slice(2) : payload)
  let decoded: Uint8Array
  if (raw) decoded = bytes
  else {
    if (typeof DecompressionStream === 'undefined')
      throw new CompressionUnavailableError()
    try {
      const reader = new Blob([bytes as Uint8Array<ArrayBuffer>])
        .stream()
        .pipeThrough(new DecompressionStream('gzip'))
        .getReader()
      const chunks: Uint8Array[] = []
      let length = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        length += value.length
        if (length > 1024 * 1024) {
          await reader.cancel()
          throw new ContractValidationError([
            '/p: decoded payload exceeds 1 MiB; use file export',
          ])
        }
        chunks.push(value)
      }
      decoded = new Uint8Array(length)
      let offset = 0
      for (const chunk of chunks) {
        decoded.set(chunk, offset)
        offset += chunk.length
      }
    } catch (error) {
      if (error instanceof ContractValidationError) throw error
      throw new ContractValidationError(['/p: invalid gzip payload'])
    }
  }
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(decoded)
  } catch {
    throw new ContractValidationError(['/p: invalid UTF-8'])
  }
  return fromFile(text)
}
