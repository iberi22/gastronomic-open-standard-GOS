import { describe, expect, it } from 'vitest'
import {
  AI_MARGIN_MIN_PCT,
  calculatePrice,
  canAffordInference,
  creditStatus,
  formatPriceBreakdown,
  SWAL_HANDLING_PCT,
  TIERS,
} from './billing'

describe('billing calculatePrice (20% handling + 10% AI min)', () => {
  it('ejemplo docs: infra 0.50 + aiBase 0.30 -> total 0.996', () => {
    const p = calculatePrice(0.5, 0.3)
    expect(p.aiWithMargin).toBeCloseTo(0.33, 5)
    expect(p.subtotal).toBeCloseTo(0.83, 5)
    expect(p.handling).toBeCloseTo(0.166, 5)
    expect(p.total).toBeCloseTo(0.996, 5)
  })

  it('infra 0 + aiBase 1 -> total con 10% y 20%', () => {
    const p = calculatePrice(0, 1)
    expect(p.aiWithMargin).toBeCloseTo(1.1, 5)
    expect(p.subtotal).toBeCloseTo(1.1, 5)
    expect(p.handling).toBeCloseTo(0.22, 5)
    expect(p.total).toBeCloseTo(1.32, 5)
  })

  it('handling es 20% de subtotal', () => {
    const p = calculatePrice(2, 3)
    expect(p.handling).toBeCloseTo(p.subtotal * SWAL_HANDLING_PCT, 5)
  })

  it('ai margin es 10% sobre base', () => {
    const p = calculatePrice(0, 10)
    expect(p.aiWithMargin).toBeCloseTo(10 * (1 + AI_MARGIN_MIN_PCT), 5)
  })
})

describe('billing credito socio', () => {
  it('creditStatus socio 50k', () => {
    expect(creditStatus(0, 'socio').remaining).toBe(50000)
    expect(creditStatus(10000, 'socio').remaining).toBe(40000)
    expect(creditStatus(50000, 'socio').remaining).toBe(0)
    expect(creditStatus(60000, 'socio').remaining).toBe(0)
  })

  it('free no tiene credito', () => {
    expect(TIERS.free.monthlyCredit).toBe(0)
    expect(creditStatus(0, 'free').remaining).toBe(0)
    expect(canAffordInference(1, 0, 'free')).toBe(false)
  })

  it('canAffordInference', () => {
    expect(canAffordInference(1000, 0, 'socio')).toBe(true)
    expect(canAffordInference(60000, 0, 'socio')).toBe(false)
    expect(canAffordInference(40000, 10000, 'socio')).toBe(true)
    expect(canAffordInference(40001, 10000, 'socio')).toBe(false)
  })

  it('formatPriceBreakdown contiene infra/AI/handling', () => {
    const s = formatPriceBreakdown(0.5, 0.3)
    expect(s).toContain('Infra $0.50')
    expect(s).toContain('AI $0.33')
    expect(s).toContain('handling SWAL 20%')
    expect(s).toContain('total $1.00')
  })
})
