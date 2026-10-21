/**
 * GOS Open Data API gateway.
 *
 * Owner decision (2026-10-15): GOS stops selling access. This Worker is now a
 * keyless, read-only proxy in front of the static open dataset published on
 * Cloudflare Pages: catalog, by-country recipes, all recipes, metadata, graph
 * data and llms.txt.
 *
 * What is deliberately absent, so it cannot come back by accident:
 *
 *   - No API keys, tiers or plans. There is no credential to validate, so no
 *     request can be privileged. The `x-api-key` / `Authorization` headers are
 *     still accepted by CORS preflight (existing clients keep working) and are
 *     ignored: they grant nothing.
 *   - No `/api/ai/infer`, no Workers AI binding, no credit ledger, no pricing.
 *     The endpoint existed only for paid keys; it answers 404 with a reason.
 *   - No entity mutations. The gateway is read-only: every non-GET/HEAD request
 *     is refused with 405 before it reaches the origin.
 *
 * What remains: CORS, Cache API, the proxy to the static origin, and one
 * ANONYMOUS abuse limit that applies equally to everyone (per-IP burst via a
 * Workers Rate Limiting binding). The gateway has NO database (owner decision
 * 2026-10-21): no D1 binding, no daily quota, no SQL.
 *
 * Hardening (review round 2, 2026-10-15) — the abuse limit is FAIL-CLOSED:
 *
 *   - The burst limiter (`RL_FREE_BURST`) runs on EVERY route, antes de servir
 *     de cache, incluidas las OPEN_ROUTES. Sin esa rafaga, los datos abiertos
 *     solo tenian el limite de 30/min del binding y ningun tope diario.
 *   - Si el limiter falta o lanza, la respuesta es 503 (no fail-open): el
 *     gateway no puede prometer el limite, asi que no sirve.
 *   - La identidad es SOLO `CF-Connecting-IP` (cabecera del edge, no
 *     falsificable). `X-Forwarded-For` ya no se lee: rotarla renovaba el cubo.
 *     Si falta `CF-Connecting-IP`, todas esas peticiones comparten un unico
 *     cubo conservador (`anon:no-ip`).
 */

export interface Env {
  /**
   * Workers Rate Limiting binding: rafaga anonima por IP (30/60s).
   * Obligatorio: si falta, el gateway responde 503 (fail-closed).
   */
  RL_FREE_BURST?: RateLimit
  ORIGIN_URL?: string
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  // Estas dos cabeceras siguen permitidas para no romper el preflight de
  // clientes antiguos; el gateway ya NO las lee ni las valida.
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
}

function jsonResponse(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...headers,
    },
  })
}

/**
 * Identidad del cliente para el limite anonimo.
 *
 * Solo se confia en `CF-Connecting-IP`: la inyecta Cloudflare en el edge y el
 * cliente no puede falsificarla. `X-Forwarded-For` NO se usa (es una cabecera
 * arbitraria: rotarla renovaba el cubo y anulaba el limite).
 *
 * Si aun asi falta `CF-Connecting-IP` (no deberia pasar detras de Cloudflare),
 * todas esas peticiones comparten UN cubo conservador en lugar de recibir una
 * identidad nueva y gratuita en cada intento.
 */
function identityKey(request: Request): string {
  const ip = request.headers.get('cf-connecting-ip')
  return ip ? `ip:${ip}` : 'anon:no-ip'
}

/** Veredicto del limiter de rafaga. `unavailable` => fail-closed (503). */
type LimitVerdict = 'ok' | 'exceeded' | 'unavailable'

/**
 * Consulta el Rate Limiting binding. FAIL-CLOSED: si el binding no existe o
 * lanza, devuelve `unavailable` para que el gateway responda 503. Un limiter
 * que no puede garantizar el cupo no puede dejar pasar la peticion.
 */
async function checkBurst(
  rl: RateLimit | undefined,
  key: string,
): Promise<LimitVerdict> {
  if (!rl) {
    console.error('RL_FREE_BURST binding missing: failing closed (503)')
    return 'unavailable'
  }
  try {
    return (await rl.limit({ key })).success ? 'ok' : 'exceeded'
  } catch (err) {
    console.error('rate limit binding error:', err)
    return 'unavailable'
  }
}

/** 503 cuando no se puede garantizar el limite (mismo cuerpo en ambos casos). */
function limiterUnavailable(retryAfter: string): Response {
  return jsonResponse({ error: 'rate limiter unavailable' }, 503, {
    'Retry-After': retryAfter,
  })
}

/**
 * Datos estaticos cacheables: JSON de /api (excepto rutas dinamicas) y los
 * archivos del sitio. Se sirven desde Cache API.
 */
function isStaticCacheable(path: string, method: string): boolean {
  if (method !== 'GET' && method !== 'HEAD') return false
  if (/^\/api\/(ai|entities|agent)(\/|$)/.test(path)) return false
  if (path.startsWith('/api/v1/')) return true
  if (path.startsWith('/api/') && path.endsWith('.json')) return true
  return path === '/graph-data.json' || /^\/llms(-full)?\.txt$/.test(path)
}

const STATIC_TTL = 3600

/** Rutas de datos abiertos que el gateway sirve. Unica fuente de verdad. */
const OPEN_ROUTES = {
  catalog: '/api/by-country/catalog.json',
  countryRecipes: '/api/by-country/:country.json',
  allRecipes: '/api/all.json',
  withMetadata: '/api/with-metadata.json',
  graphData: '/graph-data.json',
  llmsSummary: '/llms.txt',
  llmsFull: '/llms-full.txt',
} as const

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx?: { waitUntil(p: Promise<unknown>): void },
  ): Promise<Response> {
    // 1. Preflight: no cuenta para el limite ni toca origen/cache.
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    const url = new URL(request.url)
    const path = url.pathname
    const originUrl = (env.ORIGIN_URL || 'https://gos-site.pages.dev').replace(
      /\/$/,
      '',
    )

    // 2. Rafaga anonima, FAIL-CLOSED, en TODAS las rutas y ANTES de la cache.
    //
    //    Se aplica aqui arriba a proposito: cubre el mapa de rutas, el 404 de
    //    /api/ai/infer, las OPEN_ROUTES (aunque vengan de Cache API) y el
    //    proxy. Es el unico limite anonimo: el gateway no tiene base de datos.
    const identity = identityKey(request)
    const verdict = await checkBurst(env.RL_FREE_BURST, identity)
    if (verdict === 'unavailable') {
      // El limiter no responde: no podemos garantizar el cupo => no se sirve.
      return limiterUnavailable('60')
    }
    if (verdict === 'exceeded') {
      return jsonResponse(
        {
          error: 'Rate limit exceeded: too many requests, slow down.',
          message: 'Burst limit: 30 requests/minute per IP.',
        },
        429,
        { 'Retry-After': '60' },
      )
    }

    // 3. Mapa de rutas documentado: lista SOLO lo que existe.
    if (path === '/api' || path === '/api/' || path === '/api/routes') {
      return jsonResponse({
        name: 'GOS Open Data API',
        version: '3.0.0',
        description:
          'Keyless, read-only access to the Gastronomic Open Standard open dataset.',
        authentication:
          'none: this API is open and no credential is required or read',
        rateLimits: {
          burst: '30 requests/minute per IP',
        },
        routes: OPEN_ROUTES,
        documentation: `${originUrl}/llms-full.txt`,
        source: 'https://github.com/iberi22/gastronomic-open-standard-GOS',
      })
    }

    // 4. /api/ai/infer se retiro el 2026-10-15 (solo existia para keys de
    // pago). 404 explicito: no se reenvia al origen, asi que ningun despliegue
    // del sitio puede reactivarlo por accidente.
    if (path === '/api/ai/infer') {
      return jsonResponse(
        {
          error:
            'Not Found: AI inference was removed on 2026-10-15. GOS serves open data only.',
        },
        404,
      )
    }

    // 5. Sin autenticacion: el gateway es de solo lectura. Cualquier metodo de
    // escritura se rechaza ANTES de tocar el origen o la cuota.
    const isReadMethod = request.method === 'GET' || request.method === 'HEAD'
    if (!isReadMethod) {
      return jsonResponse(
        {
          error:
            'Method Not Allowed: the GOS gateway is read-only (no mutations).',
        },
        405,
        { Allow: 'GET, HEAD, OPTIONS' },
      )
    }

    // 6. Proxy Static Data
    // Solo las rutas estaticas cacheables pasan por Cache API.
    const staticRoute = isStaticCacheable(path, request.method)
    // `key` es una forma heredada de credencial que ya no autentica nada; no se
    // reenvia al origen para que no acabe en sus logs.
    const fwd = new URLSearchParams(url.search)
    fwd.delete('key')
    const fwdQs = fwd.toString()
    const targetUrl = `${originUrl}${path}${fwdQs ? `?${fwdQs}` : ''}`
    try {
      const cacheStore: Cache | undefined = staticRoute
        ? (globalThis as unknown as { caches?: { default: Cache } }).caches
            ?.default
        : undefined
      const cacheReq = new Request(targetUrl, { method: 'GET' })
      let originRes: Response | undefined
      if (cacheStore) {
        try {
          originRes = await cacheStore.match(cacheReq)
        } catch (err) {
          console.error('cache match error:', err)
        }
      }
      if (!originRes) {
        originRes = await fetch(targetUrl, {
          method: request.method,
          headers: {
            'User-Agent': 'GOS-API-Gateway/1.0',
            Accept: 'application/json, text/plain, */*',
          },
        })
        if (
          cacheStore &&
          originRes.status === 200 &&
          request.method === 'GET'
        ) {
          const toCache = new Response(originRes.clone().body, originRes)
          toCache.headers.set('Cache-Control', `public, max-age=${STATIC_TTL}`)
          const put = cacheStore
            .put(cacheReq, toCache)
            .catch((err: unknown) => {
              console.error('cache put error:', err)
            })
          if (ctx) ctx.waitUntil(put)
          else await put
        }
      }

      const resHeaders = new Headers(originRes.headers)
      for (const [k, v] of Object.entries(CORS_HEADERS)) resHeaders.set(k, v)

      return new Response(originRes.body, {
        status: originRes.status,
        statusText: originRes.statusText,
        headers: resHeaders,
      })
    } catch (err) {
      return jsonResponse(
        {
          error: 'Bad Gateway: Unable to proxy request to static origin',
          details: String(err instanceof Error ? err.message : err),
        },
        502,
      )
    }
  },
}
