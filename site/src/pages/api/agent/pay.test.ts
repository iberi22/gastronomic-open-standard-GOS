import { describe, expect, it } from 'vitest'
import { isTierId } from '../../../lib/billing'
import { POST } from './pay'

const call = (tier: unknown) =>
  POST({
    request: new Request('http://x/api/agent/pay', {
      method: 'POST',
      body: JSON.stringify({ tier }),
    }),
  } as never) as Promise<Response>

describe('prototype-chain en tiers (ask.ts / pay.ts)', () => {
  it('isTierId solo acepta claves propias de TIERS', () => {
    for (const ok of ['free', 'socio', 'socio-managed'])
      expect(isTierId(ok)).toBe(true)
    for (const bad of [
      'constructor',
      '__proto__',
      'toString',
      'hasOwnProperty',
      '',
      1,
      null,
    ])
      expect(isTierId(bad)).toBe(false)
  })

  it('pay rechaza tiers heredados con 400 en vez de caer a socio', async () => {
    for (const t of ['constructor', '__proto__', 'toString']) {
      expect((await call(t)).status).toBe(400)
    }
    expect((await call('socio')).status).toBe(200)
  })
})
