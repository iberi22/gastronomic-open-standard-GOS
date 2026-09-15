// Cliente del billing central SWAL (swal-billing Worker) para el gateway GOS.
// Solo se usa con keys `swal_*` y BILLING_URL configurada; sin ella rige el
// legacy (D1 api_keys + free IP). Fallos de red del billing → null y el caller
// responde 503 (fail-closed), nunca acceso gratis silencioso.

export interface BillingVerdict {
  active: boolean
  plan: string
  quota: number
  used: number
  remaining: number
}

async function postJson(
  url: string,
  secret: string,
  body: unknown,
  timeoutMs = 4000,
): Promise<{ status: number; json: unknown }> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-secret': secret,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    const json = (await res.json().catch(() => null)) as unknown
    return { status: res.status, json }
  } finally {
    clearTimeout(t)
  }
}

function isVerdict(v: unknown): v is BillingVerdict {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  if (typeof o.active !== 'boolean') return false
  if (o.active === false) return true // el billing responde {active:false} pelado
  return (
    typeof o.plan === 'string' &&
    typeof o.quota === 'number' &&
    typeof o.used === 'number' &&
    typeof o.remaining === 'number'
  )
}

/** Verifica key swal_* contra el billing.
 * Retorna el veredicto (mirar .active) o null SOLO si el billing inalcanzable. */
export async function verifySwalKey(
  billingUrl: string,
  serviceSecret: string,
  apiKey: string,
): Promise<BillingVerdict | null> {
  try {
    const { status, json } = await postJson(
      `${billingUrl.replace(/\/$/, '')}/v1/verify`,
      serviceSecret,
      { api_key: apiKey },
    )
    if (status !== 200 || !isVerdict(json)) return null
    return json
  } catch {
    return null
  }
}

/** Reporta 1 unidad consumida. Best-effort: nunca lanza. */
export async function reportSwalUsage(
  billingUrl: string,
  serviceSecret: string,
  apiKey: string,
): Promise<void> {
  try {
    await postJson(`${billingUrl.replace(/\/$/, '')}/v1/usage`, serviceSecret, {
      api_key: apiKey,
    })
  } catch {
    /* el ledger del gateway ya registró; el billing reconcilia por verify */
  }
}
