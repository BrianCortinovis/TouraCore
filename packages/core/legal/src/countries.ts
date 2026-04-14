import type { CountryCode } from './types'

export interface CountryDefinition {
  code: CountryCode
  name: string
  currency: string
  locale: string
  implementationStatus: 'full' | 'partial' | 'planned'
}

export const COUNTRY_DEFINITIONS: Record<CountryCode, CountryDefinition> = {
  IT: { code: 'IT', name: 'Italia', currency: 'EUR', locale: 'it-IT', implementationStatus: 'full' },
  CH: { code: 'CH', name: 'Svizzera', currency: 'CHF', locale: 'it-CH', implementationStatus: 'planned' },
  FR: { code: 'FR', name: 'Francia', currency: 'EUR', locale: 'fr-FR', implementationStatus: 'planned' },
  AT: { code: 'AT', name: 'Austria', currency: 'EUR', locale: 'de-AT', implementationStatus: 'planned' },
  DE: { code: 'DE', name: 'Germania', currency: 'EUR', locale: 'de-DE', implementationStatus: 'planned' },
} as const

export function getCountryName(code: CountryCode): string {
  return COUNTRY_DEFINITIONS[code].name
}

export function isCountryFullySupported(code: CountryCode): boolean {
  return COUNTRY_DEFINITIONS[code].implementationStatus === 'full'
}
