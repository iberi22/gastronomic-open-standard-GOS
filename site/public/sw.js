// GOS PWA Service Worker — manual, sin dependencias.
//
// Versionado: PRECACHE_VERSION se sube cuando cambia la lista de rutas
//Críticas. El nombre del cache lo deriva (CACHE_NAME = `gos-pwa-v${...}`) para
// que `activate` pueda purgar SOLO las versiones de GOS y borrar la anterior al
// activar la nueva (nunca dos versiones vivas).
//
// BUG CORREGIDO (medido 2026-10-01, ver docs/audit/PWA-OFFLINE-AUDIT.md):
// la versión anterior hacía `caches.open(...).then(c => c.put(req, response.clone()))`
// DENTRO de un .then() diferido, es decir DESPUÉS de devolver la response al
// navegador. Para entonces el body ya estaba consumido y `clone()` lanzaba
//   TypeError: Failed to execute 'clone' on 'Response': Response body is already used
// swallowed como unhandledrejection → NINGÚN HTML entraba nunca en el cache.
// Consecuencia medida: /recipes, /graph, /ingredients, /countries, /scientific
// y las rutas de detalle devolvían 503 "Offline" con la red cortada. Ahora el
// `clone()` se hace de forma SINCRÓNICA, antes de devolver la response.

const PRECACHE_VERSION = 2
const CACHE_NAME = `gos-pwa-v${PRECACHE_VERSION}`
const CACHE_PREFIX = 'gos-pwa-v'
const BASE_URL = ''

/**
 * Rutas y assets que deben funcionar con la red cortada desde el primer uso,
 * sin haber visitado la página antes. Todo lo que está aquí se precachea en
 * `install` y su ausencia hace fallar el test site/src/lib/pwa-offline.test.ts.
 */
const STATIC_ASSETS = [
  // Documentos: home, catálogo, grafo y las páginas índice
  `${BASE_URL}/`,
  `${BASE_URL}/index.html`,
  `${BASE_URL}/recipes/`,
  `${BASE_URL}/graph/`,
  `${BASE_URL}/ingredients/`,
  `${BASE_URL}/substances/`,
  `${BASE_URL}/countries/`,
  `${BASE_URL}/scientific/`,
  // Ruta de error: sin ella, una ruta desconocida con la red cortada muestra
  // la pantalla de error del navegador en vez de la 404 de GOS.
  `${BASE_URL}/404.html`,
  // Datos del grafo y catálogos que consume la UI
  `${BASE_URL}/graph-data.json`,
  `${BASE_URL}/api/index.json`,
  `${BASE_URL}/api/all.json`,
  `${BASE_URL}/api/substances.json`,
  `${BASE_URL}/api/evidence.json`,
  // Metadatos PWA y para agentes
  `${BASE_URL}/manifest.json`,
  `${BASE_URL}/favicon.svg`,
  `${BASE_URL}/llms.txt`,
]

// Install - precache de las rutas críticas.
// Un fallo de red al instalarse NO debe dejar el SW sin instalar: se registra
// el error y se continúa, de modo que el runtime cache sigue populate.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          STATIC_ASSETS.map(async (url) => {
            try {
              // cache:'reload' evita que el propio HTTP cache nos cuele una
              // versión vieja del documento en la instalación.
              const request = new Request(url, { cache: 'reload' })
              const response = await fetch(request)
              if (!response.ok) throw new Error(`HTTP ${response.status}`)
              await cache.put(url, await sanitize(response))
            } catch (err) {
              console.warn('[gos-sw] precache miss', url, String(err))
            }
          }),
        ),
      ),
  )
  self.skipWaiting()
})

// Activate - purga las versiones anteriores de GOS. Sólo las que comparten
// prefijo: no se toca ningún cache ajeno a la PWA.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (name) =>
                name !== CACHE_NAME &&
                name.startsWith(CACHE_PREFIX) &&
                !isCurrentOrNewer(name),
            )
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

/**
 * Una versión no se borra si su número es POSTERIOR al actual: si un cliente
 * tiene un SW más nuevo que esta página (updaterollback manual, tab antigua),
 * conservar su cache evita borrar en caliente datos que aún se están usando.
 */
function isCurrentOrNewer(name) {
  const n = Number(name.slice(CACHE_PREFIX.length))
  return Number.isFinite(n) && n >= PRECACHE_VERSION
}

// Fetch - estrategias por tipo de recurso
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET
  if (request.method !== 'GET') return

  // Skip non-http
  if (!url.protocol.startsWith('http')) return

  // Cross-origin: sólo GitHub, que aporta datos del grafo. El resto
  // (HuggingFace/WebLLM, .bin, .wasm) lo gestiona el Cache API nativo.
  const isExternal = url.origin !== self.location.origin
  if (isExternal && !isGitHub(url)) return

  // API/GitHub - Network First (los datos frescos no deben quedar rancios)
  if (url.pathname.startsWith('/api/') || isGitHub(url)) {
    event.respondWith(networkFirst(request))
    return
  }

  // Navegaciones: el HTML nunca estaba cacheado por el bug del clone(), así
  // que ahora cada visita online lo deja disponible para la siguiente sesión
  // offline. Un acierto en cache se sirve al instante y se revalida detrás.
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(navigationHandler(request))
    return
  }

  // Static assets (JS/CSS/Images/Fonts) - Cache First
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Resto (JSON, txt) - Stale While Revalidate
  event.respondWith(staleWhileRevalidate(request))
})

function isGitHub(url) {
  return (
    url.hostname.includes('github.com') ||
    url.hostname.includes('raw.githubusercontent.com')
  )
}

/**
 * Quita `Vary` de la respuesta antes de cachearla.
 *
 * El server de preview sirve el HTML con `Vary: Origin`. Cache API respeta
 * `Vary` al hacer match, así que una entrada guardada con `Vary: Origin` deja
 * de encontrar darle cuando la petición que llega no lleva esa cabecera — el
 * HTML se quedaba en el cache pero inservible. GOS sirve el mismo HTML a
 * todos los orígenes, así que `Vary` se puede descartar de forma segura.
 */
async function sanitize(response) {
  const headers = new Headers(response.headers)
  headers.delete('vary')
  // `no-cache` en la respuesta original describiría al HTTP cache, no al
  // Cache Storage, que no lo consulta. Se guarda tal cual para no alterar la
  // semántica de lo que se entrega al cliente.
  return new Response(await response.arrayBuffer(), {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

function offlineFallbackHtml() {
  return new Response('Offline', { status: 503 })
}

/**
 * Navegaciones: cache-first con revalidación y 404 cacheada como red de
 * seguridad. Antes de este handler una ruta no cacheada con la red cortada
 * devolvía 503 "Offline" (7 bytes) en lugar de una página.
 */
async function navigationHandler(request) {
  const cache = await caches.open(CACHE_NAME)
  const url = new URL(request.url)
  // `/recipes` y `/recipes/` son la MISMA página y ambos deben resolver offline.
  // El precache guarda la variante con barra, así que se consultan las dos
  // formas antes de rendirse. Sin esto, abrir `/recipes` sin barra offline
  // devolvía la 404 de GOS (medido 2026-10-01) en lugar del catálogo.
  const candidates = [url.pathname]
  if (!url.pathname.endsWith('/')) {
    candidates.push(`${url.pathname}/`)
    candidates.push(`${url.pathname}/index.html`)
  } else {
    candidates.push(url.pathname.slice(0, -1))
  }
  let cached = null
  let cachedKey = null
  for (const key of candidates) {
    cached = await cache.match(key)
    if (cached) {
      cachedKey = key
      break
    }
  }

  // Revalidación en segundo plano; el clone() va síncrono, ANTES de que la
  // response se use o se devuelva.
  const network = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        const copy = response.clone() // síncrono: aún con el body libre
        try {
          await cache.put(request, await sanitize(copy))
        } catch (err) {
          console.warn('[gos-sw] put falló', request.url, String(err))
        }
      }
      return response
    })
    .catch(() => null)

  if (cached) {
    // Guardar además un alias bajo la URL pedida: la próxima vez el match es
    // exacto y no hay que probar candidatas.
    if (cachedKey && cachedKey !== url.pathname) {
      event_safeRevalidate(
        cache.put(request, await sanitize(await cached.clone())),
      )
    }
    event_safeRevalidate(network)
    return cached
  }

  const fresh = await network
  if (fresh) return fresh

  // Sin red y sin entrada propia: servir la 404 cacheada. Es preferible a la
  // pantalla de error del navegador y a un 503 "Offline" de 7 bytes.
  const notFound = await cache.match('/404.html')
  if (notFound) return notFound
  return offlineFallbackHtml()
}

// La revalidación no debe tumbar la respuesta cacheada si falla.
function event_safeRevalidate(promise) {
  if (promise && typeof promise.catch === 'function') {
    promise.catch(() => {})
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const copy = response.clone() // síncrono
      try {
        await cache.put(request, await sanitize(copy))
      } catch (err) {
        console.warn('[gos-sw] put falló', request.url, String(err))
      }
    }
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME)
  try {
    const response = await fetch(request)
    if (response.ok) {
      const copy = response.clone() // síncrono
      try {
        await cache.put(request, await sanitize(copy))
      } catch (err) {
        console.warn('[gos-sw] put falló', request.url, String(err))
      }
    }
    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    return new Response('Offline', { status: 503 })
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)

  const fetchPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        const copy = response.clone() // síncrono
        try {
          await cache.put(request, await sanitize(copy))
        } catch (err) {
          console.warn('[gos-sw] put falló', request.url, String(err))
        }
      }
      return response
    })
    .catch(() => cached || new Response('Offline', { status: 503 }))

  return cached || fetchPromise
}

// Message handler
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting()
  }
  if (event.data === 'CACHE_NAME') {
    event.source?.postMessage({ cacheName: CACHE_NAME, version: PRECACHE_VERSION })
  }
  if (event.data === 'CACHE_STATS' && event.source) {
    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then((c) => c.keys())
        .then((keys) =>
          event.source.postMessage({
            cacheName: CACHE_NAME,
            version: PRECACHE_VERSION,
            entries: keys.map((r) => new URL(r.url).pathname),
          }),
        ),
    )
  }
})
