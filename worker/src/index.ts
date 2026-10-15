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
 * Workers Rate Limiting binding, plus a per-IP daily quota in D1).
 */

export interface Env {
  /** Workers Rate Limiting binding: rafaga anonima por IP (30/60s). */
  RL_FREE_BURST?: RateLimit
  /** D1: cuota diaria anonima por IP (tabla free_quota, no keys). */
  DB?: D1Database
  ORIGIN_URL?: string
  /**
   * Nombre historico de la variable; hoy es el cupo diario ANONIMO por IP.
   * El nombre se conserva porque ya esta desplegado en el Worker.
   */
  FREE_DAILY_LIMIT?: string
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

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  )
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Consulta un Rate Limiting binding. Fail-open si falta o falla: el limiter
 * es defensa en profundidad, no puede tumbar el servicio.
 */
async function allowed(
  rl: RateLimit | undefined,
  key: string,
): Promise<boolean> {
  if (!rl) return true
  try {
    return (await rl.limit({ key })).success
  } catch (err) {
    console.error('rate limit binding error:', err)
    return true
  }
}

/**
 * Datos estaticos cacheables: JSON de /api (excepto rutas dinamicas) y los
 * archivos del sitio. Se sirven desde Cache API y no tocan D1.
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
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    const url = new URL(request.url)
    const path = url.pathname
    const originUrl = (env.ORIGIN_URL || 'https://gos-site.pages.dev').replace(
      /\/$/,
      '',
    )
    const dailyLimit = parseInt(env.FREE_DAILY_LIMIT || '100', 10)

    // 1. Mapa de rutas documentado: lista SOLO lo que existe.
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
          daily: `${dailyLimit} requests/day per IP`,
        },
        routes: OPEN_ROUTES,
        documentation: `${originUrl}/llms-full.txt`,
        source: 'https://github.com/iberi22/gastronomic-open-standard-GOS',
      })
    }

    // 2. /api/ai/infer se retiro el 2026-10-15 (solo existia para keys de
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

    // 3. Sin autenticacion: el gateway es de solo lectura. Cualquier metodo de
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

    // 4. Limite anonimo antiabuso: rafaga por binding (30/60s por IP) y cuota
    // diaria en D1 con UN UPSERT atomico, solo en rutas no estaticas. Las
    // estaticas se sirven de Cache API y no tocan D1.
    const clientIp =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for') ||
      '127.0.0.1'
    const staticRoute = isStaticCacheable(path, request.method)
    let counted = false
    let currentCount = 0

    if (!(await allowed(env.RL_FREE_BURST, `ip:${clientIp}`))) {
      return jsonResponse(
        {
          error: 'Rate limit exceeded: too many requests, slow down.',
          message: 'Burst limit: 30 requests/minute per IP.',
        },
        429,
        { 'Retry-After': '60' },
      )
    }

    if (!staticRoute && env.DB) {
      const day = new Date().toISOString().slice(0, 10)
      try {
        const ipKey = `ip:${(await sha256Hex(clientIp)).slice(0, 32)}`
        // Sin fila RETURNING = cuota agotada (el WHERE del DO UPDATE falla).
        const row = await env.DB.prepare(
          'INSERT INTO free_quota (ip_key, day, n) VALUES (?, ?, 1) ' +
            'ON CONFLICT(ip_key, day) DO UPDATE SET n = n + 1 WHERE n < ? ' +
            'RETURNING n',
        )
          .bind(ipKey, day, dailyLimit)
          .first<{ n: number }>()
        if (!row) {
          return jsonResponse(
            {
              error: `Rate limit exceeded: ${dailyLimit} req/day per IP.`,
              limit: dailyLimit,
              remaining: 0,
            },
            429,
            {
              'Retry-After': '86400',
              'X-RateLimit-Limit': String(dailyLimit),
              'X-RateLimit-Remaining': '0',
            },
          )
        }
        counted = true
        currentCount = row.n
      } catch (dbErr) {
        // Fail-open: la rafaga del binding sigue protegiendo.
        console.error('D1 free quota error:', dbErr)
      }
    }

    // 5. Proxy Static Data
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
      resHeaders.set('X-RateLimit-Limit', String(dailyLimit))
      if (counted) {
        resHeaders.set(
          'X-RateLimit-Remaining',
          String(Math.max(0, dailyLimit - currentCount)),
        )
      }

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
