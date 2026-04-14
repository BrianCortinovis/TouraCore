export type {
  CountryCode,
  LegalType,
  PropertyType,
  FiscalRegime,
  LegalEntityBase,
  ValidationResult,
  ValidationError,
} from './types'
export { COUNTRY_CODES, LEGAL_TYPES, PROPERTY_TYPES, FISCAL_REGIMES } from './types'

export type { CountryDefinition } from './countries'
export { COUNTRY_DEFINITIONS, getCountryName, isCountryFullySupported } from './countries'

export { ItalyPrivateSchema, ItalyBusinessSchema, ItalyPropertyLegalSchema } from './schemas/italy'
export type { ItalyPrivateData, ItalyBusinessData, ItalyPropertyLegalData } from './schemas/italy'
export { SwitzerlandPlaceholderSchema } from './schemas/switzerland'
export { FrancePlaceholderSchema } from './schemas/france'
export { AustriaPlaceholderSchema } from './schemas/austria'
export { GermanyPlaceholderSchema } from './schemas/germany'

export { validateTenantLegalDetails, validatePropertyLegalDetails } from './validators'

export type { FiscalConfig } from './fiscal'
export { getFiscalConfig } from './fiscal'
