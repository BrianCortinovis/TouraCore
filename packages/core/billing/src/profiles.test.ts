import { describe, it, expect } from 'vitest'
import { calculateCommission } from './profiles'
import type { BillingProfile } from './types'

function profile(overrides: Partial<BillingProfile> = {}): BillingProfile {
  return {
    id: 'bp-1',
    scope: 'tenant',
    scope_id: 't-1',
    module_code: 'hospitality',
    billing_model: 'commission',
    subscription_price_eur: null,
    subscription_interval: 'month',
    commission_percent: 10,
    commission_fixed_eur: 0,
    commission_applies_to: ['booking_total'],
    commission_min_eur: null,
    commission_cap_eur: null,
    platform_commission_percent: null,
    agency_commission_percent: null,
    active: true,
    valid_from: '2026-01-01',
    valid_until: null,
    created_by_user_id: null,
    created_by_scope: null,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('calculateCommission — base', () => {
  it('10% di €100 = €10 (no agency split)', () => {
    const result = calculateCommission({
      profile: profile(),
      baseAmount: 100,
      appliesTo: 'booking_total',
    })
    expect(result).toEqual({ total: 10, platform: 10, agency: 0 })
  })

  it('zero quando appliesTo non incluso nella whitelist', () => {
    const result = calculateCommission({
      profile: profile({ commission_applies_to: ['booking_total'] }),
      baseAmount: 100,
      appliesTo: 'coperto',
    })
    expect(result).toEqual({ total: 0, platform: 0, agency: 0 })
  })

  it('commission fissa + percentuale combinate', () => {
    const result = calculateCommission({
      profile: profile({ commission_percent: 5, commission_fixed_eur: 2 }),
      baseAmount: 100,
      appliesTo: 'booking_total',
    })
    expect(result.total).toBe(7) // 5 + 2
    expect(result.platform).toBe(7)
  })

  it('round 2 decimali', () => {
    const result = calculateCommission({
      profile: profile({ commission_percent: 7.5 }),
      baseAmount: 33.33,
      appliesTo: 'booking_total',
    })
    expect(result.total).toBeCloseTo(2.5, 2)
  })
})

describe('calculateCommission — min / cap', () => {
  it('applica commission_min_eur quando il calcolo è inferiore', () => {
    const result = calculateCommission({
      profile: profile({ commission_percent: 5, commission_min_eur: 10 }),
      baseAmount: 100, // calcolo = 5, min = 10 → 10
      appliesTo: 'booking_total',
    })
    expect(result.total).toBe(10)
  })

  it('applica commission_cap_eur quando il calcolo è superiore', () => {
    const result = calculateCommission({
      profile: profile({ commission_percent: 50, commission_cap_eur: 100 }),
      baseAmount: 1000, // calcolo = 500, cap = 100 → 100
      appliesTo: 'booking_total',
    })
    expect(result.total).toBe(100)
  })

  it('min e cap insieme → finestra clamp', () => {
    const lowProfile = profile({ commission_percent: 1, commission_min_eur: 5, commission_cap_eur: 50 })
    expect(calculateCommission({ profile: lowProfile, baseAmount: 100, appliesTo: 'booking_total' }).total).toBe(5)
    const highProfile = profile({ commission_percent: 80, commission_min_eur: 5, commission_cap_eur: 50 })
    expect(calculateCommission({ profile: highProfile, baseAmount: 100, appliesTo: 'booking_total' }).total).toBe(50)
  })
})

describe('calculateCommission — split platform/agency', () => {
  it('split sostituisce commission_percent quando entrambi presenti', () => {
    const result = calculateCommission({
      profile: profile({
        commission_percent: 10, // ignorato perché split presente
        platform_commission_percent: 7,
        agency_commission_percent: 3,
      }),
      baseAmount: 100,
      appliesTo: 'booking_total',
    })
    expect(result).toEqual({ total: 10, platform: 7, agency: 3 })
  })

  it('split su importo decimale arrotonda correttamente', () => {
    const result = calculateCommission({
      profile: profile({
        platform_commission_percent: 6,
        agency_commission_percent: 4,
      }),
      baseAmount: 123.45,
      appliesTo: 'booking_total',
    })
    expect(result.platform).toBeCloseTo(7.41, 2)
    expect(result.agency).toBeCloseTo(4.94, 2)
    expect(result.total).toBeCloseTo(12.35, 2)
  })

  it('senza split: agency = 0, platform = total', () => {
    const result = calculateCommission({
      profile: profile({ commission_percent: 12 }),
      baseAmount: 200,
      appliesTo: 'booking_total',
    })
    expect(result).toEqual({ total: 24, platform: 24, agency: 0 })
  })
})
