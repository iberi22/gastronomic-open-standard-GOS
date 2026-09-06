export interface Env {
  RATE_LIMIT_KV?: KVNamespace
  DB?: D1Database
  AI?: {
    run: (
      model: string,
      opts: { prompt: string },
    ) => Promise<{ response?: string; result?: string }>
  }
  ORIGIN_URL?: string
  FREE_DAILY_LIMIT?: string
}

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
          queryParam: 'key=<KEY>',
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
    let apiKey = request.headers.get('x-api-key')
    if (!apiKey) {
      const authHeader = request.headers.get('Authorization')
      apiKey = authHeader?.startsWith('Bearer ')
        ? authHeader.substring(7).trim()
        : null
    }
    if (!apiKey) {
      apiKey = url.searchParams.get('key')
    }

    let isPaidKey = false
    let keyTier = 'free'

    if (apiKey) {
      if (env.DB) {
        try {
          const stmt = env.DB.prepare(
            'SELECT key, tier, status FROM api_keys WHERE key = ? AND status = "active"',
          )
          const result = await stmt
            .bind(apiKey)
            .first<{ key: string; tier: string; status: string }>()
          if (result) {
            isPaidKey = true
            keyTier = result.tier || 'socio'
          } else {
            return jsonResponse(
              {
                error: 'Unauthorized: Invalid or inactive API key',
                tier: 'invalid',
              },
              401,
            )
          }
        } catch (dbErr) {
          console.error('D1 key check error:', dbErr)
          // If fallback match during testing/dev
          if (apiKey.includes('socio') || apiKey.includes('paid')) {
            isPaidKey = true
            keyTier = 'tiersocio'
          } else {
            return jsonResponse(
              { error: 'Unauthorized: Key validation failed' },
              401,
            )
          }
        }
      } else {
        // Local dev fallback if DB binding not available
        if (apiKey.includes('socio') || apiKey.includes('paid')) {
          isPaidKey = true
          keyTier = 'tiersocio'
        } else {
          return jsonResponse({ error: 'Unauthorized: Invalid API key' }, 401)
        }
      }
    }

    // 3. Rate Limiting for Free Tier (KV)
    const clientIp =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for') ||
      '127.0.0.1'
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
    // sin tablas nuevas: ledger en KV. Pricing = billing.ts calculatePrice inline).
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
      let body: { prompt?: unknown; appId?: unknown }
      try {
        body = (await request.json()) as typeof body
      } catch {
        return jsonResponse({ error: 'invalid json' }, 400)
      }
      const prompt = typeof body.prompt === 'string' ? body.prompt : ''
      const appId =
        typeof body.appId === 'string' && body.appId ? body.appId : 'gos'
      if (!prompt) return jsonResponse({ error: 'prompt required' }, 400)

      // TIERS socio/socio-managed comparten monthlyCredit 50000 (billing.ts)
      const monthlyCredit = 50000
      const kvKey = `credits:${appId}`
      let used = 0
      try {
        const cached = env.RATE_LIMIT_KV
          ? await env.RATE_LIMIT_KV.get(kvKey)
          : null
        used = cached ? parseInt(cached, 10) : 0
      } catch {
        used = 0
      }
      const estimated = Math.ceil(prompt.length / 4)
      if (used + estimated > monthlyCredit) {
        return jsonResponse(
          { error: 'credito agotado', used, limit: monthlyCredit },
          402,
        )
      }
      if (!env.AI) {
        return jsonResponse({ error: 'AI binding no disponible' }, 501)
      }
      let text = ''
      try {
        const aiRes = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
          prompt,
        })
        text = aiRes?.response ?? aiRes?.result ?? ''
      } catch (err) {
        return jsonResponse(
          {
            error: 'Workers AI error',
            details: String(err instanceof Error ? err.message : err),
          },
          502,
        )
      }
      const tokensUsed = Math.ceil(text.length / 4) || estimated
      const newUsed = used + tokensUsed
      try {
        await env.RATE_LIMIT_KV?.put(kvKey, String(newUsed), {
          expirationTtl: 2592000,
        })
      } catch {}
      // billing.ts: AI*1.10 margen, subtotal + 20% handling
      const aiWithMargin = tokensUsed * 0.00001 * 1.1
      const subtotal = 0.02 + aiWithMargin
      const handling = subtotal * 0.2
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
    const targetUrl = `${originUrl}${path}${url.search}`
    try {
      const originRes = await fetch(targetUrl, {
        method: request.method,
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
