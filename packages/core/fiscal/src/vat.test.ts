import { describe, it, expect } from 'vitest'
import { defaultVatRate, extractVat, addVat, type VatRate } from './vat'

describe('defaultVatRate', () => {
  it('hospitality = 10% (art. 123 Tab.A Parte III)', () => {
    expect(defaultVatRate('hospitality')).toBe(10)
  })

  it('restaurant: cibo / analcolici = 10%, alcolici = 22%', () => {
    expect(defaultVatRate('restaurant')).toBe(10)
    expect(defaultVatRate('restaurant', 'alcoholic')).toBe(22)
    expect(defaultVatRate('restaurant', 'wine')).toBe(22)
    expect(defaultVatRate('restaurant', 'spirits')).toBe(22)
  })

  it('experience / wellness / bike_rental / moto_rental / ski_school / addon = 22%', () => {
    expect(defaultVatRate('experience')).toBe(22)
    expect(defaultVatRate('wellness')).toBe(22)
    expect(defaultVatRate('bike_rental')).toBe(22)
    expect(defaultVatRate('moto_rental')).toBe(22)
    expect(defaultVatRate('ski_school')).toBe(22)
    expect(defaultVatRate('addon')).toBe(22)
  })
})

describe('extractVat (IVA scorporata da prezzo IVA inclusa)', () => {
  it('22% su €122 → €100 imponibile + €22 IVA', () => {
    const r = extractVat(12_200, 22)
    expect(r.taxableCents).toBe(10_000)
    expect(r.vatCents).toBe(2_200)
  })

  it('10% su €110 → €100 imponibile + €10 IVA', () => {
    const r = extractVat(11_000, 10)
    expect(r.taxableCents).toBe(10_000)
    expect(r.vatCents).toBe(1_000)
  })

  it('aliquota 0 → tutto imponibile, IVA 0', () => {
    const r = extractVat(12_345, 0)
    expect(r.taxableCents).toBe(12_345)
    expect(r.vatCents).toBe(0)
  })

  it('IVA 4% — agricoltura/beni essenziali', () => {
    const r = extractVat(10_400, 4)
    expect(r.taxableCents).toBe(10_000)
    expect(r.vatCents).toBe(400)
  })

  it('arrotondamento al cent — 22% su €123.45', () => {
    const r = extractVat(12_345, 22)
    // 12345 / 1.22 = 10118.85 → Math.round 10_119; vat = 12345 - 10119 = 2226
    expect(r.taxableCents).toBe(10_119)
    expect(r.vatCents).toBe(2_226)
    expect(r.taxableCents + r.vatCents).toBe(12_345)
  })

  it('zero input → zero output', () => {
    expect(extractVat(0, 22)).toEqual({ taxableCents: 0, vatCents: 0 })
  })
})

describe('addVat (IVA su imponibile)', () => {
  it('22% su €100 imponibile → €22 IVA, €122 totale', () => {
    const r = addVat(10_000, 22)
    expect(r.vatCents).toBe(2_200)
    expect(r.totalCents).toBe(12_200)
  })

  it('10% su €100 → €10 IVA, €110 totale', () => {
    const r = addVat(10_000, 10)
    expect(r.vatCents).toBe(1_000)
    expect(r.totalCents).toBe(11_000)
  })

  it('aliquota 0 → no IVA, total = imponibile', () => {
    const r = addVat(12_345, 0)
    expect(r.vatCents).toBe(0)
    expect(r.totalCents).toBe(12_345)
  })

  it('round-trip extract → add ≈ identità (tollerando arrotondamento cent)', () => {
    const rates: VatRate[] = [4, 5, 10, 22]
    for (const rate of rates) {
      const total = 12_345
      const { taxableCents, vatCents } = extractVat(total, rate)
      const back = addVat(taxableCents, rate)
      // entro 1 cent (rounding)
      expect(Math.abs(back.totalCents - total)).toBeLessThanOrEqual(1)
      expect(Math.abs(back.vatCents - vatCents)).toBeLessThanOrEqual(1)
    }
  })
})
