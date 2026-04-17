/**
 * @touracore/fiscal — Types condivisi per emissione documenti fiscali Italia.
 */

export type LegalEntityType = 'private' | 'business' | 'occasionale'

export type FiscalRegime =
  | 'locazione_turistica_privata'
  | 'cedolare_secca_21'
  | 'cedolare_secca_26'
  | 'ordinario'
  | 'forfettario'
  | 'agricolo'
  | 'regime_agevolato'
  | 'prestazione_occasionale'

export type ItemType =
  | 'hospitality'
  | 'restaurant'
  | 'experience'
  | 'bike_rental'
  | 'wellness'
  | 'moto_rental'
  | 'ski_school'
  | 'addon'

export type FiscalDocumentType =
  | 'hospitality_invoice'
  | 'b2b_invoice'
  | 'fiscal_receipt'
  | 'ade_corrispettivi'
  | 'credit_note'
  | 'quote'
  | 'receipt'

export type FiscalEmitterType =
  | 'locazione_turistica'
  | 'cedolare_secca'
  | 'fiscal_receipt_rt'
  | 'sdi_invoice'
  | 'sdi_forfettario'
  | 'prestazione_occasionale'
  | 'cortesia'

export interface LegalEntity {
  id: string
  tenantId: string
  type: LegalEntityType
  displayName: string
  fiscalCode: string
  vatNumber: string | null
  companyName: string | null
  fiscalRegime: FiscalRegime | null
  sdiRecipientCode: string | null
  sdiPec: string | null
  rtDeviceSerial: string | null
  rtProvider: string | null
  cinCode: string | null
  cinRegionCode: string | null
  stripeConnectAccountId: string | null
  occasionaleAnnualLimitCents: number
  occasionaleYtdRevenueCents: number
  address: {
    street?: string
    city?: string
    zip?: string
    province?: string
    country?: string
  }
}

export interface GuestFiscalInfo {
  fullName: string
  email: string
  fiscalCode?: string | null
  vatNumber?: string | null
  sdiCode?: string | null
  isBusiness: boolean
  companyName?: string | null
  billingAddress?: {
    street?: string
    city?: string
    zip?: string
    province?: string
    country?: string
  }
}

export interface BundleItemContext {
  bundleId: string
  itemId: string
  tenantId: string
  legalEntity: LegalEntity
  guest: GuestFiscalInfo
  itemType: ItemType
  entityId: string
  serviceDate: string  // YYYY-MM-DD
  endDate?: string
  quantity: number
  unitPriceCents: number
  subtotalCents: number
  discountCents: number
  vatRate: number  // 22, 10, 5, 0
  vatCents: number
  totalCents: number
  description: string
  lineItems?: Array<{
    description: string
    quantity: number
    unitPriceCents: number
    vatRate: number
  }>
  metadata?: Record<string, unknown>
}

export interface FiscalDocumentResult {
  documentType: FiscalDocumentType
  emitterType: FiscalEmitterType
  number: string  // numerazione interna/SDI
  series: string | null
  issuedAt: string  // ISO timestamp
  totalCents: number
  vatCents: number
  xmlPayload?: string  // SDI XML
  pdfUrl?: string
  externalRef?: string  // SDI progressivo, RT id, ecc
  regionalRef?: string  // CIN code per locazione turistica
  metadata: Record<string, unknown>
  // Flags compliance
  requiresRtPush: boolean
  requiresSdiPush: boolean
  requiresRegionalPush: boolean  // CIN/ADE alloggiati
  stampDutyCents: number  // marca da bollo €2 su forfettario >€77.47
}

export interface FiscalEmitter {
  readonly name: string
  canHandle(ctx: BundleItemContext): boolean
  emit(ctx: BundleItemContext): Promise<FiscalDocumentResult>
}
