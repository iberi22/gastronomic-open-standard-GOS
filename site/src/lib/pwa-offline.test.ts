// site/src/lib/pwa-offline.test.ts
// Guardas de la cobertura offline de la PWA. Este archivo FALLA si alguien:
//   - quita una ruta crítica de STATIC_ASSETS
//   - reintroduce un nombre de cache viejo (no versionado o v1)
//   - deja el cache derivado a mano en vez de derivarlo de PRECACHE_VERSION
//   - reintroduce el patrón de clone() diferido que envenenó el cache de HTML
//
// Medición de referencia en docs/audit/PWA-OFFLINE-AUDIT.md.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

const SITE_ROOT = join(import.meta.dirname, '..', '..')
const SW_PATH = join(SITE_ROOT, 'public', 'sw.js')
const SW_SOURCE = readFileSync(SW_PATH, 'utf8')

/** BASE_URL vive en el scope del SW, no en el del test: se lee del archivo. */
function readBaseUrl(): string {
  const match = SW_SOURCE.match(/const BASE_URL\s*=\s*'([^']*)'/)
  if (!match) throw new Error('BASE_URL no encontrado en sw.js')
  return match[1]
}

/** Extrae la lista literal de STATIC_ASSETS evaluándola en un sandbox. */
function readPrecacheList(): string[] {
  const match = SW_SOURCE.match(
    /const STATIC_ASSETS\s*=\s*(\[[\s\S]*?\n\])/,
  )
  if (!match) throw new Error('STATIC_ASSETS no encontrado en sw.js')
  // biome-ignore lint/security/noGlobalEval: lista literal del propio archivo
  return new Function('BASE_URL', `return ${match[1]}`)(readBaseUrl()) as string[]
}

function readNumberConst(name: string): number {
  const match = SW_SOURCE.match(
    new RegExp(`const ${name}\\s*=\\s*(\\d+)`),
  )
  if (!match) throw new Error(`${name} no encontrado en sw.js`)
  return Number(match[1])
}

const PRECACHE = readPrecacheList()
const VERSION = readNumberConst('PRECACHE_VERSION')

describe('pwa/sw: precache de rutas críticas', () => {
  // Estas rutas son las que, medidas con la red cortada en Chromium, devolvían
  // 503 "Offline" antes del arreglo. Cada una es obligatoria.
  const REQUIRED_ROUTES = [
    '/',
    '/index.html',
    '/recipes/',
    '/graph/',
    '/ingredients/',
    '/substances/',
    '/countries/',
    '/scientific/',
    '/404.html',
    '/graph-data.json',
    '/api/index.json',
    '/api/all.json',
    '/api/substances.json',
    '/api/evidence.json',
    '/manifest.json',
    '/llms.txt',
  ]

  for (const route of REQUIRED_ROUTES) {
    it(`precachea ${route}`, () => {
      expect(PRECACHE, `${route} salió de STATIC_ASSETS`).toContain(route)
    })
  }

  it('no deja entradas duplicadas en STATIC_ASSETS', () => {
    const dupes = PRECACHE.filter((v, i) => PRECACHE.indexOf(v) !== i)
    expect(dupes).toEqual([])
  })

  it('todas las entradas del precache son rutas internas absolutas', () => {
    for (const entry of PRECACHE) {
      expect(entry, `${entry} debe empezar por /`).toMatch(/^\//)
    }
  })

  it('no precachea los vectores de embeddings (11.6 MB, solo búsqueda web)', () => {
    const vectors = PRECACHE.filter((e) => e.includes('/api/vectors/'))
    expect(vectors).toEqual([])
  })
})

describe('pwa/sw: versionado del cache', () => {
  it('deriva CACHE_NAME de PRECACHE_VERSION', () => {
    expect(SW_SOURCE).toMatch(
      /const CACHE_NAME\s*=\s*`\$\{CACHE_PREFIX\}v\$\{PRECACHE_VERSION\}`|const CACHE_NAME\s*=\s*`gos-pwa-v\$\{PRECACHE_VERSION\}`/,
    )
  })

  it('no fija un nombre de cache versionado a mano', () => {
    expect(SW_SOURCE).not.toMatch(/const CACHE_NAME\s*=\s*'gos-pwa-v\d+'/)
    expect(SW_SOURCE).not.toMatch(/const CACHE_NAME\s*=\s*"gos-pwa-v\d+"/)
  })

  it('no reintroduce el nombre viejo gos-pwa-v1', () => {
    expect(SW_SOURCE).not.toContain("'gos-pwa-v1'")
    expect(SW_SOURCE).not.toContain('"gos-pwa-v1"')
    // Y tampoco como cache de runtime
    expect(SW_SOURCE).not.toMatch(/cacheName:\s*['"]gos-pwa-v1['"]/)
  })

  it('VERSION está por encima de la v1 medida en produccion', () => {
    expect(VERSION).toBeGreaterThanOrEqual(2)
  })

  it('activate purga los caches de GOS anteriores a esta version', () => {
    const activate = SW_SOURCE.match(
      /addEventListener\('activate'[\s\S]*?\n\}\)/,
    )
    expect(activate, 'no hay listener activate').not.toBeNull()
    const body = activate?.[0] ?? ''
    expect(body).toContain('caches.delete')
    expect(body).toContain('caches')
    expect(body).toContain('CACHE_NAME')
  })

  it('no borra caches ajenos a la PWA (filtra por prefijo)', () => {
    const activate = SW_SOURCE.match(
      /addEventListener\('activate'[\s\S]*?\n\}\)/,
    )?.[0]
    expect(activate).toContain('CACHE_PREFIX')
  })
})

describe('pwa/sw: el bug de clone() diferido no vuelve', () => {
  it('ninguna estrategia clona dentro de un then diferido sin clonar antes', () => {
    // El patrón venenozo era:
    //   caches.open(X).then((cache) => cache.put(req, response.clone()))
    // donde response ya se había devuelto. Debe existir un `response.clone()`
    // (o `copy`) asignado a una variable ANTES de cualquier cache.put.
    const deferredClone = /\.then\(\s*\(cache\)\s*=>\s*\{?\s*cache\.put\([^)]*\.clone\(\)/g
    expect(SW_SOURCE.match(deferredClone) ?? []).toEqual([])
  })

  it('todas las estrategias cachean el body con un clone previo', () => {
    const strategies = ['cacheFirst', 'networkFirst', 'staleWhileRevalidate', 'navigationHandler']
    for (const fn of strategies) {
      const body = SW_SOURCE.match(new RegExp(`async function ${fn}\\([\\s\\S]*?\\n\\}`))?.[0]
      expect(body, `${fn} no encontrada`).toBeTruthy()
      expect(body, `${fn} no clona la response`).toMatch(/\.clone\(\)/)
    }
  })
})

describe('pwa/sw: manifest y contrato de instalacion', () => {
  it('sanitize quita Vary para que el HTML cacheado sea reutilizable', () => {
    expect(SW_SOURCE).toMatch(/headers\.delete\(['"]vary['"]\)/)
  })

  it('el precache tolera un fallo de red en vez de romper la instalacion', () => {
    const install = SW_SOURCE.match(
      /addEventListener\('install'[\s\S]*?\n\}\)/,
    )?.[0]
    expect(install).toContain('catch')
  })
})
