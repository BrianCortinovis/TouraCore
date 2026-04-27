import { describe, it, expect } from 'vitest'
import { computePrice, type PricingContext, type PricingRule } from './index'

function rule(overrides: Partial<PricingRule>): PricingRule {
  return {
    id: 'r1',
    ruleType: 'occupancy_based',
    name: 'test rule',
    appliesTo: ['any'],
    config: {},
    adjustmentType: 'percent',
    adjustmentValue: 10,
    priority: 1,
    active: true,
    ...overrides,
  }
}

const baseCtx: PricingContext = {
  serviceDate: '2026-06-15',
  basePrice: 100,
  appliesTo: 'room',
}

describe('computePrice — base behavior', () => {
  it('no rules + Mon (weekday): no adjustment, price = base', () => {
    const result = computePrice({ ...baseCtx, serviceDate: '2026-04-27' }, [])
    expect(result.basePrice).toBe(100)
    // Default baseline applica solo se isWeekend → lunedì 27/04/2026 non weekend
    expect(result.finalPrice).toBe(100)
    expect(result.appliedRules).toEqual([])
  })

  it('inactive rule is ignored', () => {
    const r = rule({ active: false, ruleType: 'day_of_week', config: { days: [1, 2, 3, 4, 5] }, adjustmentValue: 50 })
    const result = computePrice({ ...baseCtx, serviceDate: '2026-04-27', dayOfWeek: 1 }, [r])
    expect(result.finalPrice).toBe(100)
    expect(result.appliedRules).toEqual([])
  })
})

describe('computePrice — rule types', () => {
  it('occupancy_based above threshold → percent uplift', () => {
    const r = rule({ ruleType: 'occupancy_based', config: { thresholdPct: 70, direction: 'above' }, adjustmentValue: 20 })
    const result = computePrice({ ...baseCtx, occupancyPct: 85 }, [r])
    expect(result.finalPrice).toBe(120)
    expect(result.appliedRules).toHaveLength(1)
    expect(result.appliedRules[0]?.delta).toBe(20)
  })

  it('occupancy_based below threshold → does not apply', () => {
    const r = rule({ ruleType: 'occupancy_based', config: { thresholdPct: 70, direction: 'above' }, adjustmentValue: 20 })
    const result = computePrice({ ...baseCtx, occupancyPct: 50 }, [r])
    expect(result.finalPrice).toBe(100)
  })

  it('lead_time within range applies', () => {
    const r = rule({ ruleType: 'lead_time', config: { minDays: 0, maxDays: 7 }, adjustmentValue: -10 })
    const result = computePrice({ ...baseCtx, leadTimeDays: 3 }, [r])
    expect(result.finalPrice).toBe(90)
  })

  it('last_minute (≤3 days) applies', () => {
    const r = rule({ ruleType: 'last_minute', adjustmentValue: 25 })
    const result = computePrice({ ...baseCtx, leadTimeDays: 2 }, [r])
    expect(result.finalPrice).toBe(125)
  })

  it('early_bird (≥60 days) applies', () => {
    const r = rule({ ruleType: 'early_bird', adjustmentValue: -15 })
    const result = computePrice({ ...baseCtx, leadTimeDays: 90 }, [r])
    expect(result.finalPrice).toBe(85)
  })

  it('day_of_week matches', () => {
    const r = rule({ ruleType: 'day_of_week', config: { days: [5, 6] }, adjustmentValue: 20 })
    const sat = computePrice({ ...baseCtx, dayOfWeek: 6 }, [r])
    expect(sat.finalPrice).toBe(120)
    const mon = computePrice({ ...baseCtx, dayOfWeek: 1 }, [r])
    expect(mon.finalPrice).toBe(100)
  })

  it('group_size in range', () => {
    const r = rule({ ruleType: 'group_size', config: { minSize: 5, maxSize: 10 }, adjustmentValue: -5 })
    expect(computePrice({ ...baseCtx, groupSize: 7 }, [r]).finalPrice).toBe(95)
    expect(computePrice({ ...baseCtx, groupSize: 4 }, [r]).finalPrice).toBe(100)
    expect(computePrice({ ...baseCtx, groupSize: 11 }, [r]).finalPrice).toBe(100)
  })

  it('season range applies', () => {
    const r = rule({ ruleType: 'season', config: { startDate: '2026-06-01', endDate: '2026-08-31' }, adjustmentValue: 30 })
    expect(computePrice({ ...baseCtx, serviceDate: '2026-07-15' }, [r]).finalPrice).toBe(130)
    expect(computePrice({ ...baseCtx, serviceDate: '2026-09-15' }, [r]).finalPrice).toBe(100)
  })

  it('event date matches', () => {
    const r = rule({ ruleType: 'event', config: { dates: ['2026-12-31'] }, adjustmentValue: 100 })
    expect(computePrice({ ...baseCtx, serviceDate: '2026-12-31' }, [r]).finalPrice).toBe(200)
    expect(computePrice({ ...baseCtx, serviceDate: '2026-12-30' }, [r]).finalPrice).toBe(100)
  })

  it('duration_tier applies in range', () => {
    const r = rule({ ruleType: 'duration_tier', config: { minHours: 8, maxHours: 24 }, adjustmentValue: -20 })
    expect(computePrice({ ...baseCtx, appliesTo: 'bike', durationHours: 12 }, [r]).finalPrice).toBe(80)
  })

  it('surge applies above demand threshold', () => {
    const r = rule({ ruleType: 'surge', config: { thresholdPct: 80 }, adjustmentValue: 30 })
    expect(computePrice({ ...baseCtx, demandLevel: 90 }, [r]).finalPrice).toBe(130)
    expect(computePrice({ ...baseCtx, demandLevel: 70 }, [r]).finalPrice).toBe(100)
  })

  it('one_way_fee adds flat + perKm', () => {
    const r = rule({
      ruleType: 'one_way_fee',
      config: { baseFee: 10, perKm: 0.5 },
      adjustmentType: 'fixed',
      adjustmentValue: 0,
    })
    const result = computePrice({ ...baseCtx, appliesTo: 'bike', isOneWay: true, distanceKm: 20 }, [r])
    expect(result.finalPrice).toBe(120) // 100 + 10 + 0.5*20
  })

  it('delivery_fee respects maxKm cap', () => {
    const r = rule({
      ruleType: 'delivery_fee',
      config: { baseFee: 5, perKm: 1, maxKm: 10 },
      adjustmentType: 'fixed',
      adjustmentValue: 0,
    })
    const result = computePrice({ ...baseCtx, appliesTo: 'bike', isDelivery: true, distanceKm: 50 }, [r])
    expect(result.finalPrice).toBe(115) // 100 + 5 + 1*10 (capped)
  })
})

describe('computePrice — fixed vs percent', () => {
  it('fixed adjustment adds absolute amount', () => {
    const r = rule({ ruleType: 'event', config: { dates: ['2026-06-15'] }, adjustmentType: 'fixed', adjustmentValue: 25 })
    const result = computePrice({ ...baseCtx, serviceDate: '2026-06-15' }, [r])
    expect(result.finalPrice).toBe(125)
  })

  it('percent adjustment compounds via cumulative price', () => {
    // Due regole percent priority decrescente: (100 + 10%) + 10% = 121
    const r1 = rule({ id: 'r1', ruleType: 'event', config: { dates: ['2026-06-15'] }, adjustmentValue: 10, priority: 2 })
    const r2 = rule({ id: 'r2', ruleType: 'event', config: { dates: ['2026-06-15'] }, adjustmentValue: 10, priority: 1 })
    const result = computePrice({ ...baseCtx, serviceDate: '2026-06-15' }, [r1, r2])
    expect(result.finalPrice).toBe(121)
  })
})

describe('computePrice — filters', () => {
  it('appliesTo filter excludes non-matching types', () => {
    const r = rule({ ruleType: 'event', config: { dates: ['2026-06-15'] }, appliesTo: ['table'], adjustmentValue: 50 })
    expect(computePrice({ ...baseCtx, appliesTo: 'room', serviceDate: '2026-06-15' }, [r]).finalPrice).toBe(100)
    expect(computePrice({ ...baseCtx, appliesTo: 'table', serviceDate: '2026-06-15' }, [r]).finalPrice).toBe(150)
  })

  it('resourceFilter restricts to specific resource_id', () => {
    const r = rule({
      ruleType: 'event',
      config: { dates: ['2026-06-15'] },
      resourceFilter: ['rt-vip'],
      adjustmentValue: 50,
    })
    expect(computePrice({ ...baseCtx, resourceId: 'rt-standard', serviceDate: '2026-06-15' }, [r]).finalPrice).toBe(100)
    expect(computePrice({ ...baseCtx, resourceId: 'rt-vip', serviceDate: '2026-06-15' }, [r]).finalPrice).toBe(150)
  })

  it('validFrom/validTo bounds the rule period', () => {
    const r = rule({
      ruleType: 'event',
      config: { dates: ['2026-06-15'] },
      validFrom: '2026-06-01',
      validTo: '2026-06-30',
      adjustmentValue: 25,
    })
    expect(computePrice({ ...baseCtx, serviceDate: '2026-05-15' }, [r]).finalPrice).toBe(100)
    expect(computePrice({ ...baseCtx, serviceDate: '2026-06-15' }, [r]).finalPrice).toBe(125)
    expect(computePrice({ ...baseCtx, serviceDate: '2026-07-15' }, [r]).finalPrice).toBe(100)
  })
})
