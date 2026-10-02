export interface Env {
  RATE_LIMIT_KV?: KVNamespace
  DB?: D1Database
  /**
   * Key de desarrollo, solo para local sin binding D1. NUNCA en produccion:
   * si se define ahi, cualquiera que mande esa cadena obtiene tier de pago.
   * Se carga con `wrangler secret put GOS_DEV_KEY` en local, o en .dev.vars.
   */
  GOS_DEV_KEY?: string
  AI?: {
    run: (
      model: string,
      opts: { prompt: string },
    ) => Promise<{ response?: string; result?: string }>
  }
  ORIGIN_URL?: string
  FREE_DAILY_LIMIT?: string
  BILLING_URL?: string
  /** Secreto de servicio hacia swal-billing. Nombre canonico (wrangler.toml/docs). */
  SERVICE_SHARED_SECRET?: string
  /**
   * @deprecated Nombre antiguo; solo lectura de compatibilidad. Usar
   * SERVICE_SHARED_SECRET. Se retirara cuando el deploy ya no lo defina.
   */
  BILLING_SERVICE_SECRET?: string
  /** Fallos de auth por IP/prefijo y hora antes de cortar sin tocar D1. */
  AUTH_FAIL_LIMIT?: string
}

import { reportSwalUsage, verifySwalKey } from './swal-billing'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

function billingSecret(env: Env): string | undefined {
  // BILLING_SERVICE_SECRET: compat deprecada, ver Env.
  return env.SERVICE_SHARED_SECRET || env.BILLING_SERVICE_SECRET || undefined
}

// Forma valida de una key antes de gastar un lookup: sin esto, cualquier
// cadena arbitraria (o gigante) llegaba a D1 / al billing.
const KEY_SHAPE = /^[A-Za-z0-9_.-]{1,128}$/

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  )
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Id de ledger derivado en servidor de la key autenticada (nunca del body). */
async function ledgerKeyId(apiKey: string): Promise<string> {
  return `key:${(await sha256Hex(apiKey)).slice(0, 32)}`
}

function hourKey(): string {
  return new Date().toISOString().slice(0, 13)
}

async function authFailCount(
  kv: KVNamespace | undefined,
  keys: string[],
): Promise<number> {
  if (!kv) return 0
  let max = 0
  for (const k of keys) {
    try {
      const v = await kv.get(k)
      max = Math.max(max, v ? parseInt(v, 10) || 0 : 0)
    } catch (err) {
      console.error('KV auth-fail get error:', err)
    }
  }
  return max
}

async function recordAuthFail(
  kv: KVNamespace | undefined,
  keys: string[],
): Promise<void> {
  if (!kv) return
  for (const k of keys) {
    try {
      const v = await kv.get(k)
      await kv.put(k, String((v ? parseInt(v, 10) || 0 : 0) + 1), {
        expirationTtl: 3600,
      })
    } catch (err) {
      console.error('KV auth-fail put error:', err)
    }
  }
}

function getTodayKey(ip: string): string {
  const today = new Date().toISOString().split('T')[0]
  return `rl:${ip}:${today}`
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    const url = new URL(request.url)
    const path = url.pathname
    const originUrl = (env.ORIGIN_URL || 'https://gos-site.pages.dev').replace(
      /\/$/,
      '',
    )
    const freeDailyLimit = parseInt(env.FREE_DAILY_LIMIT || '100', 10)

    // 1. Documented Route Map endpoint
    if (path === '/api' || path === '/api/' || path === '/api/routes') {
      return jsonResponse({
        name: 'GOS API Gateway',
        version: '2.0.0',
        description:
          'Monetizable rate-limited API gateway for Gastronomic Open Standard dataset',
        rateLimits: {
          freeTier: `${freeDailyLimit} requests/day per IP`,
          paidTier:
            'Unlimited / high capacity (tier socio via x-api-key header)',
        },
        authentication: {
          header: 'x-api-key: <KEY>',
          bearer: 'Authorization: Bearer <KEY>',
        },
        routes: {
          catalog: '/api/by-country/catalog.json',
          countryRecipes: '/api/by-country/:country.json',
          allRecipes: '/api/all.json',
          withMetadata: '/api/with-metadata.json',
          graphData: '/graph-data.json',
          llmsSummary: '/llms.txt',
          llmsFull: '/llms-full.txt',
          paywall: '/api/agent/pay',
        },
        documentation: `${originUrl}/llms-full.txt`,
      })
    }

    // 2. Authentication check for Paid Keys (D1)
    // La key solo viaja por header (x-api-key / Authorization: Bearer). El
    // `?key=` se descarta: acaba en logs/historial y se reenviaba al origen.
    let apiKey = request.headers.get('x-api-key')
    if (!apiKey) {
      const authHeader = request.headers.get('Authorization')
      apiKey = authHeader?.startsWith('Bearer ')
        ? authHeader.substring(7).trim()
        : null
    }

    const clientIp =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for') ||
      '127.0.0.1'

    // 2a. Rechazo barato ANTES de cualquier D1/billing: forma invalida y
    // throttle de fallos por IP y por prefijo de key.
    let failKeys: string[] = []
    if (apiKey) {
      if (!KEY_SHAPE.test(apiKey)) {
        return jsonResponse(
          {
            error: 'Unauthorized: Invalid or inactive API key',
            tier: 'invalid',
          },
          401,
        )
      }
      const hour = hourKey()
      failKeys = [
        `authfail:ip:${clientIp}:${hour}`,
        `authfail:pfx:${apiKey.slice(0, 8)}:${hour}`,
      ]
      const failLimit = parseInt(env.AUTH_FAIL_LIMIT || '20', 10)
      if ((await authFailCount(env.RATE_LIMIT_KV, failKeys)) >= failLimit) {
        return jsonResponse(
          { error: 'Too many failed key attempts', tier: 'throttled' },
          429,
          { 'Retry-After': '3600' },
        )
      }
    }

    let isPaidKey = false
    let keyTier = 'free'
    let swalKey: string | null = null
    let swalRemaining = 0

    // 2b. Keys swal_* → billing central (si configurado). Si no, rige legacy.
    if (
      apiKey &&
      apiKey.startsWith('swal_') &&
      env.BILLING_URL &&
      billingSecret(env)
    ) {
      const verdict = await verifySwalKey(
        env.BILLING_URL,
        billingSecret(env) as string,
        apiKey,
      )
      if (!verdict) {
        return jsonResponse(
          { error: 'Billing unavailable: retry shortly' },
          503,
        )
      }
      if (!verdict.active) {
        await recordAuthFail(env.RATE_LIMIT_KV, failKeys)
        return jsonResponse(
          {
            error: 'Unauthorized: Invalid or inactive API key',
            tier: 'invalid',
          },
          401,
        )
      }
      isPaidKey = true
      keyTier = `swal:${verdict.plan}`
      swalKey = apiKey
      swalRemaining = verdict.remaining
    } else if (apiKey) {
      if (env.DB) {
        try {
          const stmt = env.DB.prepare(
            'SELECT key, tier, status FROM api_keys ' +
              "WHERE key = ? AND status = 'active' " +
              "AND (expires_at IS NULL OR datetime(expires_at) > datetime('now'))",
          )
          const result = await stmt
            .bind(apiKey)
            .first<{ key: string; tier: string; status: string }>()
          if (result) {
            isPaidKey = true
            keyTier = result.tier || 'socio'
          } else {
            await recordAuthFail(env.RATE_LIMIT_KV, failKeys)
            return jsonResponse(
              {
                error: 'Unauthorized: Invalid or inactive API key',
                tier: 'invalid',
              },
              401,
            )
          }
        } catch (dbErr) {
          // Fail-closed. Si D1 no responde NO se puede saber si la key es
          // valida, y adivinar concede acceso a quien mande una key con la
          // palabra 'socio' o 'paid' en el cuerpo. Antes este catch hacia
          // justo eso: produccion sirve 404 a esas keys mientras D1 falla.
          console.error('D1 key check error:', dbErr)
          return jsonResponse(
            {
              error: 'Service Unavailable: key validation unavailable',
              tier: 'unavailable',
            },
            503,
          )
        }
      } else {
        // Sin binding DB no hay ninguna fuente de verdad contra la que
        // validar. En local se permite una key explicita de desarrollo
        // (env.GOS_DEV_KEY); nunca una heuristica sobre el contenido.
        const devKey = env.GOS_DEV_KEY
        if (devKey && apiKey === devKey) {
          isPaidKey = true
          keyTier = 'tiersocio'
        } else {
          await recordAuthFail(env.RATE_LIMIT_KV, failKeys)
          return jsonResponse(
            {
              error: 'Unauthorized: no key store configured',
              tier: 'no-store',
            },
            401,
          )
        }
      }
    }

    // 2c. Mutaciones de /api/entities/*: solo con key de pago valida.
    const isReadMethod = request.method === 'GET' || request.method === 'HEAD'
    if (path.startsWith('/api/entities/') && !isReadMethod && !isPaidKey) {
      return jsonResponse(
        {
          error: 'Forbidden: entity mutations require a paid API key',
          tier: 'free',
        },
        403,
      )
    }

    // 3. Rate Limiting for Free Tier (KV)
    let currentCount = 0
    const kvKey = getTodayKey(clientIp)

    if (!isPaidKey) {
      if (env.RATE_LIMIT_KV) {
        try {
          const val = await env.RATE_LIMIT_KV.get(kvKey)
          currentCount = val ? parseInt(val, 10) : 0
        } catch (kvErr) {
          console.error('KV get error:', kvErr)
        }
      }

      if (currentCount >= freeDailyLimit) {
        return jsonResponse(
          {
            error: 'Rate limit exceeded: 100 req/day for free tier.',
            tier: 'free',
            limit: freeDailyLimit,
            remaining: 0,
            message:
              'Provide a valid paid key in header x-api-key for unlimited access.',
          },
          429,
          {
            'Retry-After': '86400',
            'X-RateLimit-Limit': String(freeDailyLimit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Tier': 'free',
          },
        )
      }

      // Increment KV count
      if (env.RATE_LIMIT_KV) {
        try {
          await env.RATE_LIMIT_KV.put(kvKey, String(currentCount + 1), {
            expirationTtl: 86400,
          })
        } catch (kvErr) {
          console.error('KV put error:', kvErr)
        }
      }
      currentCount++
    }

    // 3b. POST /api/ai/infer — inferencia socio via Workers AI (solo paid keys).
    // Fuente: site/workers/ai.ts adaptado a bindings del gateway (DB/RATE_LIMIT_KV,
    // ledger en D1 tabla credit_ledger. Pricing = billing.ts calculatePrice inline).
    if (path === '/api/ai/infer') {
      if (request.method !== 'POST') {
        return jsonResponse({ error: 'method not allowed, use POST' }, 405)
      }
      if (!isPaidKey) {
        return jsonResponse(
          {
            error: 'tier sin credito: inferencia requiere x-api-key de socio',
            tier: 'free',
          },
          402,
        )
      }
      // Cuota del billing central para keys swal_* (el plan free/legacy no llega aquí).
      if (swalKey && swalRemaining <= 0) {
        return jsonResponse(
          { error: 'cuota diaria agotada', tier: keyTier, remaining: 0 },
          429,
        )
      }
      let body: { prompt?: unknown }
      try {
        body = (await request.json()) as typeof body
      } catch {
        return jsonResponse({ error: 'invalid json' }, 400)
      }
      const prompt = typeof body.prompt === 'string' ? body.prompt : ''
      if (!prompt) return jsonResponse({ error: 'prompt required' }, 400)

      // El ledger se indexa por la key AUTENTICADA (hash en servidor). El
      // `appId` del body se ignora: antes el cliente elegia su propio ledger.
      const ledgerId = await ledgerKeyId(apiKey as string)
      const period = new Date().toISOString().slice(0, 7)
      // TIERS socio/socio-managed comparten monthlyCredit 50000 (billing.ts)
      const monthlyCredit = 50000
      const estimated = Math.ceil(prompt.length / 4)
      if (estimated > monthlyCredit) {
        return jsonResponse(
          { error: 'credito agotado', limit: monthlyCredit },
          402,
        )
      }
      // Fail-closed: sin ledger no hay forma de contar credito (F-01).
      if (!env.DB) {
        return jsonResponse(
          { error: 'ledger unavailable', tier: 'unavailable' },
          503,
        )
      }
      // Reserva ATOMICA: una sola sentencia comprueba cuota e incrementa.
      let reserved: number | null
      try {
        await env.DB.prepare(
          'INSERT OR IGNORE INTO credit_ledger (key_id, period, used) VALUES (?, ?, 0)',
        )
          .bind(ledgerId, period)
          .run()
        const row = await env.DB.prepare(
          'UPDATE credit_ledger SET used = used + ? ' +
            'WHERE key_id = ? AND period = ? AND used + ? <= ? RETURNING used',
        )
          .bind(estimated, ledgerId, period, estimated, monthlyCredit)
          .first<{ used: number }>()
        reserved = row ? row.used : null
      } catch (err) {
        console.error('D1 ledger error:', err)
        return jsonResponse(
          { error: 'ledger unavailable', tier: 'unavailable' },
          503,
        )
      }
      if (reserved === null) {
        return jsonResponse(
          { error: 'credito agotado', limit: monthlyCredit },
          402,
        )
      }
      // Ajuste del ledger tras el hecho (delta puede ser negativo = devolucion).
      const adjust = async (delta: number): Promise<number | null> => {
        if (delta === 0) return reserved
        try {
          const r = await (env.DB as D1Database)
            .prepare(
              'UPDATE credit_ledger SET used = MAX(0, used + ?) ' +
                'WHERE key_id = ? AND period = ? RETURNING used',
            )
            .bind(delta, ledgerId, period)
            .first<{ used: number }>()
          return r ? r.used : null
        } catch (err) {
          console.error('D1 ledger adjust error:', err)
          return null
        }
      }
      if (!env.AI) {
        await adjust(-estimated)
        return jsonResponse({ error: 'AI binding no disponible' }, 501)
      }
      let text = ''
      try {
        const aiRes = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
          prompt,
        })
        text = aiRes?.response ?? aiRes?.result ?? ''
      } catch (err) {
        await adjust(-estimated)
        return jsonResponse(
          {
            error: 'Workers AI error',
            details: String(err instanceof Error ? err.message : err),
          },
          502,
        )
      }
      const tokensUsed = Math.ceil(text.length / 4) || estimated
      const newUsed = (await adjust(tokensUsed - estimated)) ?? reserved
      // billing.ts: AI*1.10 margen, subtotal + 20% handling
      const aiWithMargin = tokensUsed * 0.00001 * 1.1
      const subtotal = 0.02 + aiWithMargin
      const handling = subtotal * 0.2
      // Reporta consumo al billing central (best-effort, no bloquea respuesta).
      if (swalKey && env.BILLING_URL && billingSecret(env)) {
        await reportSwalUsage(
          env.BILLING_URL,
          billingSecret(env) as string,
          swalKey,
        )
      }
      return jsonResponse({
        text,
        tokensUsed,
        cost: subtotal + handling,
        breakdown: {
          infra: 0.02,
          aiBase: tokensUsed * 0.00001,
          aiWithMargin,
          handling,
          total: subtotal + handling,
        },
        credit: {
          used: newUsed,
          limit: monthlyCredit,
          remaining: monthlyCredit - newUsed,
        },
      })
    }

    // 4. Proxy Static Data
    // Nunca se reenvia `key` al origen (credencial en query string).
    const fwd = new URLSearchParams(url.search)
    fwd.delete('key')
    const fwdQs = fwd.toString()
    const targetUrl = `${originUrl}${path}${fwdQs ? `?${fwdQs}` : ''}`
    try {
      const originRes = await fetch(targetUrl, {
        method: request.method,
        body: isReadMethod ? undefined : await request.arrayBuffer(),
        headers: {
          'User-Agent': 'GOS-API-Gateway/1.0',
          Accept: 'application/json, text/plain, */*',
        },
      })

      const resHeaders = new Headers(originRes.headers)
      for (const [k, v] of Object.entries(CORS_HEADERS)) resHeaders.set(k, v)

      if (isPaidKey) {
        resHeaders.set('X-RateLimit-Tier', keyTier)
        resHeaders.set('X-RateLimit-Limit', 'unlimited')
        resHeaders.set('X-RateLimit-Remaining', 'unlimited')
      } else {
        resHeaders.set('X-RateLimit-Tier', 'free')
        resHeaders.set('X-RateLimit-Limit', String(freeDailyLimit))
        resHeaders.set(
          'X-RateLimit-Remaining',
          String(Math.max(0, freeDailyLimit - currentCount)),
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
