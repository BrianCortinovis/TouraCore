import type { CountryCode, LegalType, PropertyType, FiscalRegime } from './types'
import { COUNTRY_DEFINITIONS } from './countries'

export interface FiscalConfig {
  currency: string
  fiscalRegime: FiscalRegime | 'unknown'
  documentTypes: string[]
  vatDefault: number | null
  complianceRequirements: {
    cin: boolean
    scia: boolean
    insurance: boolean
    alloggiati: boolean
    istat: boolean
  }
  maxUnits: number | null
  canUse: string[]
  cannotUse: string[]
  userMessage: string | null
  implementationStatus: 'full' | 'partial' | 'planned' | 'not_supported_yet'
  atecoCode: string | null
}

// Configurazione fiscale completa per l'Italia
function getItalyFiscalConfig(
  legalType: LegalType,
  propertyType: PropertyType,
  isImprenditoriale: boolean
): FiscalConfig {
  const base: FiscalConfig = {
    currency: 'EUR',
    fiscalRegime: 'ordinario',
    documentTypes: [],
    vatDefault: null,
    complianceRequirements: {
      cin: true,
      scia: false,
      insurance: false,
      alloggiati: true,
      istat: true,
    },
    maxUnits: null,
    canUse: ['basic_cms', 'invoicing', 'tax_calculation', 'compliance_reports'],
    cannotUse: [],
    userMessage: null,
    implementationStatus: 'full',
    atecoCode: null,
  }

  if (legalType === 'private') {
    if (propertyType !== 'apartment' && propertyType !== 'b_and_b') {
      return {
        ...base,
        fiscalRegime: 'unknown',
        userMessage: `Il tipo "${propertyType}" non è compatibile con un account privato. Solo appartamenti e B&B sono gestibili come privato.`,
        canUse: ['basic_cms'],
        cannotUse: ['invoicing', 'tax_calculation', 'compliance_reports'],
      }
    }

    return {
      ...base,
      fiscalRegime: 'cedolare_secca',
      documentTypes: ['ricevuta_non_fiscale'],
      vatDefault: null,
      complianceRequirements: {
        cin: true,
        scia: false,
        insurance: false,
        alloggiati: true,
        istat: true,
      },
      maxUnits: 4,
      atecoCode: null,
    }
  }

  // legalType === 'business'
  switch (propertyType) {
    case 'hotel':
      return {
        ...base,
        fiscalRegime: 'ordinario',
        documentTypes: ['fattura_elettronica', 'nota_di_credito'],
        vatDefault: 10,
        complianceRequirements: { cin: true, scia: true, insurance: true, alloggiati: true, istat: true },
        atecoCode: '55.10',
      }

    case 'b_and_b':
      if (!isImprenditoriale) {
        return {
          ...base,
          fiscalRegime: 'cedolare_secca',
          documentTypes: ['ricevuta_non_fiscale'],
          vatDefault: null,
          complianceRequirements: { cin: true, scia: false, insurance: false, alloggiati: true, istat: true },
          maxUnits: 4,
          atecoCode: null,
        }
      }
      return {
        ...base,
        fiscalRegime: 'forfettario',
        documentTypes: ['fattura_elettronica', 'nota_di_credito'],
        vatDefault: 10,
        complianceRequirements: { cin: true, scia: true, insurance: true, alloggiati: true, istat: true },
        atecoCode: '55.20',
      }

    case 'apartment':
      if (!isImprenditoriale) {
        return {
          ...base,
          fiscalRegime: 'cedolare_secca',
          documentTypes: ['ricevuta_non_fiscale'],
          vatDefault: null,
          complianceRequirements: { cin: true, scia: false, insurance: false, alloggiati: true, istat: true },
          maxUnits: 4,
          atecoCode: null,
        }
      }
      return {
        ...base,
        fiscalRegime: 'forfettario',
        documentTypes: ['fattura_elettronica', 'nota_di_credito'],
        vatDefault: 10,
        complianceRequirements: { cin: true, scia: true, insurance: false, alloggiati: true, istat: true },
        atecoCode: '55.20',
      }

    case 'agriturismo':
      return {
        ...base,
        fiscalRegime: 'agriturismo_special',
        documentTypes: ['fattura_elettronica', 'nota_di_credito'],
        vatDefault: 10,
        complianceRequirements: { cin: true, scia: true, insurance: true, alloggiati: true, istat: true },
        atecoCode: '55.20',
        userMessage: 'Regime agriturismo: è necessaria la connessione con un\'azienda agricola registrata.',
      }

    case 'residence':
      return {
        ...base,
        fiscalRegime: 'ordinario',
        documentTypes: ['fattura_elettronica', 'nota_di_credito'],
        vatDefault: 10,
        complianceRequirements: { cin: true, scia: true, insurance: true, alloggiati: true, istat: true },
        atecoCode: '55.20',
      }

    case 'affittacamere':
      return {
        ...base,
        fiscalRegime: 'ordinario',
        documentTypes: ['fattura_elettronica', 'nota_di_credito'],
        vatDefault: 10,
        complianceRequirements: { cin: true, scia: true, insurance: true, alloggiati: true, istat: true },
        atecoCode: '55.20',
      }

    case 'mixed':
      return {
        ...base,
        fiscalRegime: 'ordinario',
        documentTypes: ['fattura_elettronica', 'nota_di_credito'],
        vatDefault: 10,
        complianceRequirements: { cin: true, scia: true, insurance: true, alloggiati: true, istat: true },
        atecoCode: '55.10',
      }
  }
}

// Configurazione placeholder per paesi non ancora supportati
function getPlaceholderFiscalConfig(country: CountryCode): FiscalConfig {
  const def = COUNTRY_DEFINITIONS[country]
  const documentTypes: Record<string, string[]> = {
    CH: ['facture', 'quittance'],
    FR: ['facture', 'note'],
    AT: ['rechnung'],
    DE: ['rechnung'],
  }

  return {
    currency: def.currency,
    fiscalRegime: 'unknown',
    documentTypes: documentTypes[country] ?? [],
    vatDefault: null,
    complianceRequirements: {
      cin: false,
      scia: false,
      insurance: false,
      alloggiati: false,
      istat: false,
    },
    maxUnits: null,
    canUse: ['basic_cms'],
    cannotUse: ['invoicing', 'tax_calculation', 'compliance_reports'],
    userMessage: `La gestione fiscale per ${def.name} sarà disponibile a breve. Per ora puoi gestire prenotazioni, ospiti e comunicazioni.`,
    implementationStatus: 'not_supported_yet',
    atecoCode: null,
  }
}

export function getFiscalConfig(
  country: CountryCode,
  legalType: LegalType,
  propertyType: PropertyType,
  isImprenditoriale: boolean
): FiscalConfig {
  if (country === 'IT') {
    return getItalyFiscalConfig(legalType, propertyType, isImprenditoriale)
  }
  return getPlaceholderFiscalConfig(country)
}
