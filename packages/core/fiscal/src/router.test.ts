import { describe, it, expect } from 'vitest'
import { FiscalRouter, FiscalRoutingError } from './router'
import type { BundleItemContext, LegalEntity, GuestFiscalInfo, ItemType } from './types'

function buildEntity(overrides: Partial<LegalEntity> = {}): LegalEntity {
  return {
    id: 'le-1',
    tenantId: 't-1',
    type: 'private',
    displayName: 'Mario Rossi',
    fiscalCode: 'RSSMRA80A01H501Z',
    vatNumber: null,
    companyName: null,
    fiscalRegime: null,
    sdiRecipientCode: null,
    sdiPec: null,
    rtDeviceSerial: null,
    rtProvider: null,
    cinCode: null,
    cinRegionCode: null,
    stripeConnectAccountId: null,
    occasionaleAnnualLimitCents: 500_000,
    occasionaleYtdRevenueCents: 0,
    address: { country: 'IT' },
    ...overrides,
  }
}

function buildGuest(overrides: Partial<GuestFiscalInfo> = {}): GuestFiscalInfo {
  return {
    fullName: 'Anna Bianchi',
    email: 'anna@example.com',
    isBusiness: false,
    ...overrides,
  }
}

function buildCtx(
  itemType: ItemType,
  entity: LegalEntity,
  guest: GuestFiscalInfo,
): BundleItemContext {
  return {
    bundleId: 'b-1',
    itemId: 'item-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    tenantId: 't-1',
    legalEntity: entity,
    guest,
    itemType,
    entityId: 'e-1',
    serviceDate: '2026-04-27',
    quantity: 1,
    unitPriceCents: 10_000,
    subtotalCents: 10_000,
    discountCents: 0,
    vatRate: 22,
    vatCents: 0,
    totalCents: 10_000,
    description: 'test',
  }
}

describe('FiscalRouter — routing emitters', () => {
  const router = new FiscalRouter()

  it('private + hospitality + cedolare_secca_21 → LocazioneTuristica', () => {
    const e = buildEntity({ type: 'private', fiscalRegime: 'cedolare_secca_21', cinCode: 'IT012345' })
    const ctx = buildCtx('hospitality', e, buildGuest())
    expect(router.route(ctx).name).toBe('locazione_turistica')
  })

  it('private + hospitality + cedolare_secca_26 → LocazioneTuristica', () => {
    const e = buildEntity({ type: 'private', fiscalRegime: 'cedolare_secca_26' })
    expect(router.route(buildCtx('hospitality', e, buildGuest())).name).toBe('locazione_turistica')
  })

  it('private + hospitality + locazione_turistica_privata → LocazioneTuristica', () => {
    const e = buildEntity({ type: 'private', fiscalRegime: 'locazione_turistica_privata' })
    expect(router.route(buildCtx('hospitality', e, buildGuest())).name).toBe('locazione_turistica')
  })

  it('business + forfettario → SDIForfettario (priorità su SDIInvoice generico)', () => {
    const e = buildEntity({ type: 'business', fiscalRegime: 'forfettario', vatNumber: 'IT01234567890' })
    expect(router.route(buildCtx('experience', e, buildGuest({ isBusiness: true }))).name).toBe('sdi_forfettario')
  })

  it('occasionale → PrestazioneOccasionale (qualsiasi item)', () => {
    const e = buildEntity({ type: 'occasionale', fiscalRegime: 'prestazione_occasionale' })
    expect(router.route(buildCtx('experience', e, buildGuest({ isBusiness: true }))).name).toBe('prestazione_occasionale')
  })

  it('business + restaurant + B2C → RestaurantRT', () => {
    const e = buildEntity({ type: 'business', fiscalRegime: 'ordinario', vatNumber: 'IT01234567890', rtDeviceSerial: 'RT-001' })
    expect(router.route(buildCtx('restaurant', e, buildGuest({ isBusiness: false }))).name).toBe('fiscal_receipt_rt')
  })

  it('business + B2B (qualsiasi item non-restaurant) → SDIInvoice', () => {
    const e = buildEntity({ type: 'business', fiscalRegime: 'ordinario', vatNumber: 'IT01234567890' })
    const guest = buildGuest({ isBusiness: true, vatNumber: 'IT09876543210', companyName: 'Acme Srl' })
    expect(router.route(buildCtx('experience', e, guest)).name).toBe('sdi_invoice')
  })

  it('throws FiscalRoutingError quando nessun emitter matcha', () => {
    // private + non-hospitality (LocazioneTuristica passa solo su hospitality → no match)
    const e = buildEntity({ type: 'private', fiscalRegime: 'cedolare_secca_21' })
    const ctx = buildCtx('experience', e, buildGuest())
    expect(() => router.route(ctx)).toThrow(FiscalRoutingError)
  })
})

describe('PrestazioneOccasionale — calcoli ritenuta + marca bollo + YTD', () => {
  const router = new FiscalRouter()

  it('B2B applica ritenuta 20% in metadata', async () => {
    const e = buildEntity({ type: 'occasionale', fiscalRegime: 'prestazione_occasionale' })
    const ctx = { ...buildCtx('experience', e, buildGuest({ isBusiness: true })), totalCents: 10_000 }
    const result = await router.emit(ctx)
    expect(result.metadata.withholding).toMatchObject({ applies: true, rate: 0.20, amount_cents: 2_000 })
  })

  it('B2C non applica ritenuta', async () => {
    const e = buildEntity({ type: 'occasionale', fiscalRegime: 'prestazione_occasionale' })
    const ctx = { ...buildCtx('experience', e, buildGuest({ isBusiness: false })), totalCents: 10_000 }
    const result = await router.emit(ctx)
    expect(result.metadata.withholding).toMatchObject({ applies: false, amount_cents: 0 })
  })

  it('marca bollo €2 obbligatoria sopra €77.47', async () => {
    const e = buildEntity({ type: 'occasionale', fiscalRegime: 'prestazione_occasionale' })
    const sopra = await router.emit({ ...buildCtx('experience', e, buildGuest()), totalCents: 7_747 })
    const sotto = await router.emit({ ...buildCtx('experience', e, buildGuest()), totalCents: 7_746 })
    expect(sopra.stampDutyCents).toBe(200)
    expect(sotto.stampDutyCents).toBe(0)
  })

  it('flag overAnnualLimit quando YTD + ctx supera 5000€/anno', async () => {
    const e = buildEntity({
      type: 'occasionale',
      fiscalRegime: 'prestazione_occasionale',
      occasionaleYtdRevenueCents: 490_000,
      occasionaleAnnualLimitCents: 500_000,
    })
    const ctx = { ...buildCtx('experience', e, buildGuest()), totalCents: 20_000 }
    const result = await router.emit(ctx)
    const ytd = result.metadata.ytd_tracking as { over_limit: boolean; warning: string | null }
    expect(ytd.over_limit).toBe(true)
    expect(ytd.warning).toContain('Gestione Separata')
  })
})

describe('LocazioneTuristica — flags compliance', () => {
  it('marca requiresRegionalPush=true (CIN + alloggiati web)', async () => {
    const e = buildEntity({ type: 'private', fiscalRegime: 'cedolare_secca_21', cinCode: 'IT012345' })
    const result = await new FiscalRouter().emit(buildCtx('hospitality', e, buildGuest()))
    expect(result.requiresRegionalPush).toBe(true)
    expect(result.requiresSdiPush).toBe(false)
    expect(result.requiresRtPush).toBe(false)
    expect(result.regionalRef).toBe('IT012345')
  })

  it('vatCents sempre 0 (no IVA su locazione turistica privata)', async () => {
    const e = buildEntity({ type: 'private', fiscalRegime: 'cedolare_secca_21' })
    const result = await new FiscalRouter().emit(buildCtx('hospitality', e, buildGuest()))
    expect(result.vatCents).toBe(0)
  })
})
