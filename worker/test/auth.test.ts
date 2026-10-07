// Suite de seguridad del gateway GOS: autenticacion de x-api-key.
//
// Estos tests son la red que impide reintroducir el bypass por substring
// ('socio' / 'paid') que vivia en los dos catch/fallback de index.ts. Cada
// caso esta escrito para que FALLE si alguien restaura ese codigo; el
// criterio de paso no es "no hay error" sino un status y unos headers
// concretos.
//
// Ejecutar: npm test   (raiz de worker/)

import { describe, expect, it, vi } from 'vitest'
import worker from '../src/index'
import { createFakeD1, type FakeD1 } from './d1-fake'

const GATEWAY = 'https://gos-api-gateway.test'

type Env = Record<string, unknown>

/** Env sin DB: el camino "dev local" que antes autenticaba por substring. */
function envNoDb(overrides: Env = {}): Env {
  return {
    ORIGIN_URL: 'https://origin.test',
    FREE_DAILY_LIMIT: '100',
    ...overrides,
  }
}

/** Env con D1 real (esquema aplicado salvo que se pida lo contrario). */
function envWithDb(fake: FakeD1, overrides: Env = {}): Env {
  return {
    ORIGIN_URL: 'https://origin.test',
    FREE_DAILY_LIMIT: '100',
    DB: fake.db,
    ...overrides,
  }
}

function req(path: string, apiKey?: string, method = 'GET'): Request {
  return new Request(`${GATEWAY}${path}`, {
    method,
    headers: apiKey ? { 'x-api-key': apiKey } : undefined,
  })
}

async function fetchWorker(
  path: string,
  apiKey?: string,
  env: Env = envNoDb(),
  method = 'GET',
) {
  // El proxy final hace fetch al origen; lo interceptamos para no salir a red.
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    ),
  )
  const res = await worker.fetch(req(path, apiKey, method), env as never)
  vi.unstubAllGlobals()
  return res
}

const tierOf = (res: Response) => res.headers.get('x-ratelimit-tier')
const body = async (res: Response) =>
  (await res.json()) as Record<string, unknown>

// ---------------------------------------------------------------------------
describe('bypass por substring: la clave de la CVE', () => {
  // Cada una de estas keys contiene 'socio' o 'paid' pero NO esta en la DB.
  // Antes de la fix devolvian 200 con tier de pago ilimitado.
  const SUBSTRING_KEYS = [
    'xyzpaidabc',
    'paid',
    'PAID',
    'socio',
    'misosocio_test',
    'a-p-a-i-d-b',
    'xsociox',
    'not-a-real-key-but-paid-ish',
    'gs_socio_test_2026',
    'paid-but-unknown-tenant',
  ]

  it.each(SUBSTRING_KEYS)(
    'no concede acceso a la key con substring %j cuando D1 esta caida (503, no 200)',
    async (key) => {
      // D1 que lanza: el estado exacto de produccion (tabla api_keys ausente).
      // Fail-closed = 503 "no se pudo validar". 401 seria mentir: diria que la
      // credencial es invalida cuando en realidad no se pudo consultar nada.
      const fake = createFakeD1({ mode: 'throws' })
      const res = await fetchWorker('/api/all.json', key, envWithDb(fake))

      expect(res.status).toBe(503)
      expect(res.status).not.toBe(200)
      expect(tierOf(res)).not.toBe('tiersocio')
      expect(res.headers.get('x-ratelimit-limit')).not.toBe('unlimited')
    },
  )

  it.each(SUBSTRING_KEYS)(
    'rechaza con 401 la key con substring %j cuando D1 responde bien pero no la conoce',
    async (key) => {
      const fake = createFakeD1({ applySchema: true })
      fake.seed({ key: 'otra-key-legitima', tier: 'tiersocio' })
      const res = await fetchWorker('/api/all.json', key, envWithDb(fake))

      expect(res.status).toBe(401)
      expect(tierOf(res)).not.toBe('tiersocio')
    },
  )

  it('no concede tier de pago a una key de substring cuando NO hay binding DB', async () => {
    const res = await fetchWorker('/api/all.json', 'xyzpaidabc', envNoDb())

    // Sin key store no se puede autenticar a nadie: fail-closed (503).
    expect([401, 503]).toContain(res.status)
    expect(res.status).not.toBe(200)
    expect(tierOf(res)).not.toBe('tiersocio')
  })
})

// ---------------------------------------------------------------------------
describe('una key real y activa SI pasa (el fix no rompio el camino feliz)', () => {
  it('devuelve 200 con tier de pago para una key activa presente en la DB', async () => {
    const fake = createFakeD1({ applySchema: true })
    fake.seed({
      key: 'gs_live_real_socio_key',
      tier: 'tiersocio',
      status: 'active',
    })

    const res = await fetchWorker(
      '/api/all.json',
      'gs_live_real_socio_key',
      envWithDb(fake),
    )

    expect(res.status).toBe(200)
    expect(tierOf(res)).toBe('tiersocio')
    expect(res.headers.get('x-ratelimit-limit')).toBe('unlimited')
  })

  it('acepta una key sin expiracion (expires_at NULL)', async () => {
    const fake = createFakeD1({ applySchema: true })
    fake.seed({
      key: 'gs_no_expiry',
      tier: 'tiersocio',
      status: 'active',
      expires_at: null,
    })

    const res = await fetchWorker(
      '/api/all.json',
      'gs_no_expiry',
      envWithDb(fake),
    )
    expect(res.status).toBe(200)
  })

  it('acepta una key con expires_at futuro', async () => {
    const fake = createFakeD1({ applySchema: true })
    fake.seed({
      key: 'gs_future',
      tier: 'tiersocio',
      status: 'active',
      expires_at: '2099-01-01 00:00:00',
    })

    const res = await fetchWorker('/api/all.json', 'gs_future', envWithDb(fake))
    expect(res.status).toBe(200)
  })

  it('lee el tier real de la fila y no lo hardcodea', async () => {
    const fake = createFakeD1({ applySchema: true })
    fake.seed({ key: 'gs_enterprise', tier: 'enterprise', status: 'active' })

    const res = await fetchWorker(
      '/api/all.json',
      'gs_enterprise',
      envWithDb(fake),
    )
    expect(tierOf(res)).toBe('enterprise')
  })

  it('acepta la key via Authorization: Bearer y via ?key=', async () => {
    const fake = createFakeD1({ applySchema: true })
    fake.seed({
      key: 'gs_multi_transporte',
      tier: 'tiersocio',
      status: 'active',
    })
    const env = envWithDb(fake)

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200 })),
    )

    const bearer = await worker.fetch(
      new Request(`${GATEWAY}/api/all.json`, {
        headers: { Authorization: 'Bearer gs_multi_transporte' },
      }),
      env as never,
    )
    const query = await worker.fetch(
      new Request(`${GATEWAY}/api/all.json?key=gs_multi_transporte`),
      env as never,
    )
    vi.unstubAllGlobals()

    expect(bearer.status).toBe(200)
    expect(tierOf(bearer)).toBe('tiersocio')
    expect(query.status).toBe(200)
    expect(tierOf(query)).toBe('tiersocio')
  })
})

// ---------------------------------------------------------------------------
describe('key expirada o con status distinto de active -> 401', () => {
  it('rechaza una key expirada aunque su status sea active', async () => {
    const fake = createFakeD1({ applySchema: true })
    fake.seed({
      key: 'gs_expirada',
      tier: 'tiersocio',
      status: 'active',
      expires_at: '2020-01-01 00:00:00', // pasado
    })

    const res = await fetchWorker(
      '/api/all.json',
      'gs_expirada',
      envWithDb(fake),
    )

    expect(res.status).toBe(401)
    expect(tierOf(res)).not.toBe('tiersocio')
  })

  it.each(['suspended', 'revoked', 'expired', 'pending', 'ACTIVE', ''])(
    'rechaza con 401 una key con status %j',
    async (status) => {
      const fake = createFakeD1({ applySchema: true })
      fake.seed({ key: 'gs_status_case', tier: 'tiersocio', status })

      const res = await fetchWorker(
        '/api/all.json',
        'gs_status_case',
        envWithDb(fake),
      )
      expect(res.status).toBe(401)
      expect(tierOf(res)).not.toBe('tiersocio')
    },
  )

  it('rechaza una key expirada que ademas contiene "socio" (no la deja pasar por nombre)', async () => {
    const fake = createFakeD1({ applySchema: true })
    fake.seed({
      key: 'socio_expirado_2024',
      tier: 'tiersocio',
      status: 'active',
      expires_at: '2021-06-01 00:00:00',
    })

    const res = await fetchWorker(
      '/api/all.json',
      'socio_expirado_2024',
      envWithDb(fake),
    )
    expect(res.status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
describe('D1 que lanza excepcion -> 503, sin bypass', () => {
  it('responde 503 cuando la consulta a D1 falla en tiempo de ejecucion', async () => {
    const fake = createFakeD1({ applySchema: true, mode: 'throws' })

    const res = await fetchWorker(
      '/api/all.json',
      'cualquier_key_001',
      envWithDb(fake),
    )

    expect(res.status).toBe(503)
    // Nunca 200, nunca 401 (401 implicaria "credential invalida", que es falso:
    // no se pudo consultar la fuente de verdad).
    expect(res.status).not.toBe(200)
    expect(res.status).not.toBe(401)
    expect(tierOf(res)).not.toBe('tiersocio')
    const payload = await body(res)
    expect(String(payload.error)).toMatch(/unavailable/i)
  })

  it('responde 503 cuando la tabla api_keys NO existe (estado real de produccion)', async () => {
    // Sin applySchema: la DB esta vacia. `prepare` falla igual que D1 real.
    const fake = createFakeD1({ applySchema: false })

    const res = await fetchWorker(
      '/api/all.json',
      'gs_qualquier_cosa',
      envWithDb(fake),
    )

    expect(res.status).toBe(503)
    expect(tierOf(res)).not.toBe('tiersocio')
  })

  it('responde 503 y no bypass para una key de substring cuando la tabla no existe', async () => {
    const fake = createFakeD1({ applySchema: false })
    const res = await fetchWorker(
      '/api/all.json',
      'xyzpaidabc',
      envWithDb(fake),
    )

    // Este es EXACTAMENTE el escenario de la CVE en produccion.
    expect(res.status).toBe(503)
    expect(res.status).not.toBe(200)
    expect(tierOf(res)).not.toBe('tiersocio')
    expect(res.headers.get('x-ratelimit-limit')).not.toBe('unlimited')
  })

  it('no filtra detalles internos del backend de validacion', async () => {
    const fake = createFakeD1({ applySchema: true, mode: 'throws' })
    const res = await fetchWorker('/api/all.json', 'k', envWithDb(fake))
    const payload = JSON.stringify(await body(res))
    expect(payload).not.toMatch(/no such table/i)
    expect(payload).not.toMatch(/D1_ERROR/i)
  })
})

// ---------------------------------------------------------------------------
describe('la consulta de autenticacion es parametrizada y exige status activo', () => {
  it('usa un placeholder para la key y para el status (nunca interpolacion)', async () => {
    const fake = createFakeD1({ applySchema: true })
    fake.seed({ key: 'gs_param_test', tier: 'tiersocio' })
    await fetchWorker('/api/all.json', 'gs_param_test', envWithDb(fake))

    const sql = fake.lastSql ?? ''
    expect(sql).toContain('?')
    expect(sql).not.toContain('gs_param_test')
    expect(sql.toLowerCase()).toContain('status')
    expect(sql.toLowerCase()).toContain('expires_at')
  })

  it('consulta la tabla api_keys', async () => {
    const fake = createFakeD1({ applySchema: true })
    await fetchWorker('/api/all.json', 'k', envWithDb(fake))
    expect(fake.lastSql).toMatch(/api_keys/)
  })
})

// ---------------------------------------------------------------------------
describe('inyeccion SQL en la key no escala privilegios', () => {
  it.each([
    "' OR '1'='1",
    "x' OR 1=1 --",
    "gs_admin'; DROP TABLE api_keys; --",
    "' UNION SELECT key, tier, status, NULL FROM api_keys --",
  ])('rechaza con 401 la key inyectada %j', async (key) => {
    const fake = createFakeD1({ applySchema: true })
    fake.seed({ key: 'gs_admin', tier: 'enterprise', status: 'active' })

    const res = await fetchWorker('/api/all.json', key, envWithDb(fake))
    expect(res.status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
describe('sin key, el comportamiento de free tier no cambia', () => {
  it('sirve como free tier cuando no hay x-api-key', async () => {
    const fake = createFakeD1({ applySchema: true })
    const res = await fetchWorker('/api/all.json', undefined, envWithDb(fake))

    expect(res.status).toBe(200)
    expect(tierOf(res)).toBe('free')
  })

  it('sigue aceptando las keys swal_* por el billing central (no se rompio)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              active: true,
              plan: 'socio',
              quota: 100,
              used: 0,
              remaining: 100,
            }),
            { status: 200 },
          ),
      ),
    )
    const res = await worker.fetch(
      new Request(`${GATEWAY}/api/all.json`, {
        headers: { 'x-api-key': 'swal_abc123' },
      }),
      {
        ORIGIN_URL: 'https://origin.test',
        BILLING_URL: 'https://billing.test',
        BILLING_SERVICE_SECRET: 'test-secret-placeholder',
      } as never,
    )
    vi.unstubAllGlobals()

    expect(res.status).toBe(200)
    expect(tierOf(res)).toBe('swal:socio')
  })
})
