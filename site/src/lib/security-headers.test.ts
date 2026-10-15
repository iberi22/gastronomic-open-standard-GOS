// @vitest-environment node
//
// Guarda de site/public/_headers: Cloudflare Pages no valida ese archivo, un
// typo o un comodin se despliega en silencio. Este test lo lee como texto (igual
// que hace Pages), exige las cuatro cabeceras y, sobre todo, que la CSP no se
// abra de mas: cada origen https que aparezca debe estar en la lista de origenes
// inventariados del sitio.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
)
const headersPath = path.join(repoRoot, 'site/public/_headers')
const raw = fs.readFileSync(headersPath, 'utf8')

/** Directivas de la CSP del bloque global `/*`. */
function globalHeaders(): Record<string, string> {
  const block = raw.split(/^\/\*$/m)[1]
  expect(block, 'falta el bloque global /*').toBeTruthy()
  const map: Record<string, string> = {}
  for (const line of block.split('\n')) {
    const m = /^\s{2}([A-Za-z-]+):\s*(.+?)\s*$/.exec(line)
    if (m) map[m[1].toLowerCase()] = m[2]
  }
  return map
}

const headers = globalHeaders()
const csp = headers['content-security-policy'] ?? ''
const directives: Record<string, string[]> = {}
for (const part of csp.split(';')) {
  const [name, ...values] = part.trim().split(/\s+/)
  if (name) directives[name] = values
}

/** Origenes externos que el sitio construido carga de verdad (inventario). */
const ALLOWED_EXTERNAL_ORIGINS = [
  'https://images.unsplash.com',
  'https://www.misrecetas.com',
]

describe('site/public/_headers', () => {
  it('declara las cuatro cabeceras requeridas con su valor exacto', () => {
    expect(headers['strict-transport-security']).toBe(
      'max-age=31536000; includeSubDomains; preload',
    )
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(csp.length).toBeGreaterThan(0)
  })

  it('la CSP cierra las superficies que el sitio no usa', () => {
    expect(directives['default-src']).toContain("'self'")
    expect(directives['object-src']).toContain("'none'")
    expect(directives['base-uri']).toContain("'self'")
    expect(directives['form-action']).toContain("'self'")
    expect(directives['frame-src']).toContain("'none'")
    expect(directives['connect-src']).toEqual(["'self'"])
  })

  it("mantiene 'unsafe-inline' solo donde la hidratacion de Astro lo exige", () => {
    // 1106/1106 paginas del build real llevan scripts inline de hidratacion y
    // <style>/style= inline: sin esto el sitio se rompe.
    expect(directives['script-src']).toEqual(["'self'", "'unsafe-inline'"])
    expect(directives['style-src']).toEqual(["'self'", "'unsafe-inline'"])
    // 'unsafe-eval' no hace falta y no debe aparecer nunca.
    expect(csp).not.toMatch(/unsafe-eval/)
  })

  it('no admite comodines de host en la CSP', () => {
    for (const [name, values] of Object.entries(directives)) {
      for (const v of values) {
        expect(
          v === '*' || /^https?:\*/i.test(v) || v.includes('://*'),
          `${name} usa comodin: ${v}`,
        ).toBe(false)
      }
    }
    // Tampoco un `*` suelto en default-src (el comodin por defecto).
    expect(directives['default-src']).not.toContain('*')
  })

  it('todo origen externo de la CSP esta en el inventario medido', () => {
    const origins = csp.match(/https:\/\/[a-z0-9.-]+/gi) ?? []
    for (const origin of origins) {
      expect(
        ALLOWED_EXTERNAL_ORIGINS,
        `origen no inventariado en la CSP: ${origin}`,
      ).toContain(origin)
    }
    // Y el inventario se usa de verdad (si sobra, se retira de la CSP).
    for (const allowed of ALLOWED_EXTERNAL_ORIGINS) {
      expect(csp).toContain(allowed)
    }
  })

  it('restringe donde se cargan imagenes y workers, no en blanco', () => {
    expect(directives['img-src']).toContain("'self'")
    expect(directives['img-src']).toContain('data:')
    expect(directives['worker-src']).toEqual(["'self'"])
    expect(directives['frame-ancestors']).toEqual(["'self'"])
    expect(directives['upgrade-insecure-requests']).toBeDefined()
  })
})
