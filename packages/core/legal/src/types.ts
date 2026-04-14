// Tipi comuni per il package @touracore/legal

export const COUNTRY_CODES = ['IT', 'CH', 'FR', 'AT', 'DE'] as const
export type CountryCode = typeof COUNTRY_CODES[number]

export const LEGAL_TYPES = ['private', 'business'] as const
export type LegalType = typeof LEGAL_TYPES[number]

export const PROPERTY_TYPES = [
  'hotel', 'residence', 'mixed', 'b_and_b',
  'agriturismo', 'apartment', 'affittacamere',
] as const
export type PropertyType = typeof PROPERTY_TYPES[number]

export const FISCAL_REGIMES = [
  'ordinario', 'forfettario', 'cedolare_secca', 'agriturismo_special',
] as const
export type FiscalRegime = typeof FISCAL_REGIMES[number]

export interface LegalEntityBase {
  country: CountryCode
  legalType: LegalType
  legalName: string | null
  legalDetails: Record<string, unknown>
}

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] }

export interface ValidationError {
  field: string
  message: string
}
