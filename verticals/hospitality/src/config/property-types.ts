import {
  Hotel,
  Home,
  Building2,
  Wheat,
  BedDouble,
  DoorOpen,
  Building,
  type LucideIcon,
} from 'lucide-react'
import type { PropertyType, InvoiceType, FiscalRegime } from '../types/database'

// ---------------------------------------------------------------------------
// Feature flags per property type
// ---------------------------------------------------------------------------

export interface PropertyFeatures {
  restaurant: boolean
  housekeepingDaily: boolean       // true = daily cleaning; false = turnover-only
  folioCharges: boolean            // full folio (minibar, bar, room service)
  mealPlans: boolean               // half board, full board, all inclusive
  selfCheckin: boolean             // access codes, smart locks, instructions
  securityDeposits: boolean        // cauzione
  guestGuidebook: boolean          // house rules, area guide
  farmConnection: boolean          // agriturismo: farm activity link
  weeklyMonthlyPricing: boolean    // weekly/monthly rate options
}

// ---------------------------------------------------------------------------
// Navigation visibility
// ---------------------------------------------------------------------------

export interface PropertyNavigation {
  showRestaurant: boolean
  showHousekeeping: boolean
  showSelfCheckin: boolean
}

// ---------------------------------------------------------------------------
// Fiscal rules per property type
// ---------------------------------------------------------------------------

export interface PropertyFiscalRules {
  defaultFiscalRegime: FiscalRegime
  allowedFiscalRegimes: FiscalRegime[]
  defaultVatRate: number           // 10 for hotels, 0 for private B&B
  hasVat: boolean                  // normally has VAT?
  allowCedolareSecca: boolean
  defaultCedolareRate: number      // 21 or 26
  allowForfettario: boolean
  forfettarioCoefficient: number   // % of income taxable (40% B&B, 25% agri)
  requiresCorrispettivi: boolean   // corrispettivi telematici
  requiresFatturaElettronica: boolean
  allowRicevutaNonFiscale: boolean
  ritenutaOTA: number              // 21% ritenuta from OTAs (0 if not applicable)
  atecoSuggestion: string          // suggested ATECO code
  specialAgriRegime: boolean       // agriturismo 50% IVA deduction
}

// ---------------------------------------------------------------------------
// Compliance requirements per property type
// ---------------------------------------------------------------------------

export interface PropertyCompliance {
  requiresCIN: boolean
  requiresAlloggiati: boolean
  requiresISTAT: boolean
  requiresSCIA: boolean

  maxUnits: number | null          // null = no limit
  minUnits: number | null          // null = no minimum (hotel min 7)
  requiresInsurance: boolean       // assicurazione catastrofale
  requiresAML: boolean             // antiriciclaggio
}

// ---------------------------------------------------------------------------
// Invoicing options per property type
// ---------------------------------------------------------------------------

export interface PropertyInvoicing {
  availableDocumentTypes: InvoiceType[]
  defaultDocumentType: InvoiceType
}

// ---------------------------------------------------------------------------
// Full property type configuration
// ---------------------------------------------------------------------------

export interface PropertyTypeConfig {
  key: PropertyType
  label: string
  labelPlural: string
  description: string
  icon: LucideIcon
  unitLabel: string                // "camera" / "unità" / "appartamento"
  unitLabelPlural: string
  features: PropertyFeatures
  navigation: PropertyNavigation
  fiscal: PropertyFiscalRules
  compliance: PropertyCompliance
  invoicing: PropertyInvoicing
}

// ---------------------------------------------------------------------------
// Configuration definitions
// ---------------------------------------------------------------------------

export const PROPERTY_TYPE_CONFIGS: Record<PropertyType, PropertyTypeConfig> = {
  hotel: {
    key: 'hotel',
    label: 'Hotel',
    labelPlural: 'Hotel',
    description: 'Struttura alberghiera con servizi completi',
    icon: Hotel,
    unitLabel: 'camera',
    unitLabelPlural: 'camere',
    features: {
      restaurant: true,
      housekeepingDaily: true,
      folioCharges: true,
      mealPlans: true,
      selfCheckin: false,
      securityDeposits: false,
      guestGuidebook: false,
      farmConnection: false,
      weeklyMonthlyPricing: false,
    },
    navigation: {
      showRestaurant: true,
      showHousekeeping: true,
      showSelfCheckin: false,
    },
    fiscal: {
      defaultFiscalRegime: 'ordinario',
      allowedFiscalRegimes: ['ordinario', 'forfettario'],
      defaultVatRate: 10,
      hasVat: true,
      allowCedolareSecca: false,
      defaultCedolareRate: 0,
      allowForfettario: true,
      forfettarioCoefficient: 40,
      requiresCorrispettivi: true,
      requiresFatturaElettronica: true,
      allowRicevutaNonFiscale: false,
      ritenutaOTA: 0,
      atecoSuggestion: '55.10.00',
      specialAgriRegime: false,
    },
    compliance: {
      requiresCIN: true,
      requiresAlloggiati: true,
      requiresISTAT: true,
      requiresSCIA: true,

      maxUnits: null,
      minUnits: 7,
      requiresInsurance: true,
      requiresAML: true,
    },
    invoicing: {
      availableDocumentTypes: ['invoice', 'corrispettivo', 'proforma', 'credit_note', 'receipt'],
      defaultDocumentType: 'corrispettivo',
    },
  },

  residence: {
    key: 'residence',
    label: 'Residence',
    labelPlural: 'Residence',
    description: 'Residenza turistico-alberghiera con unità abitative',
    icon: Building,
    unitLabel: 'unità',
    unitLabelPlural: 'unità',
    features: {
      restaurant: true,
      housekeepingDaily: true,
      folioCharges: true,
      mealPlans: true,
      selfCheckin: true,
      securityDeposits: true,
      guestGuidebook: true,
      farmConnection: false,
      weeklyMonthlyPricing: true,
    },
    navigation: {
      showRestaurant: true,
      showHousekeeping: true,
      showSelfCheckin: true,
    },
    fiscal: {
      defaultFiscalRegime: 'ordinario',
      allowedFiscalRegimes: ['ordinario', 'forfettario'],
      defaultVatRate: 10,
      hasVat: true,
      allowCedolareSecca: false,
      defaultCedolareRate: 0,
      allowForfettario: true,
      forfettarioCoefficient: 40,
      requiresCorrispettivi: true,
      requiresFatturaElettronica: true,
      allowRicevutaNonFiscale: false,
      ritenutaOTA: 0,
      atecoSuggestion: '55.10.00',
      specialAgriRegime: false,
    },
    compliance: {
      requiresCIN: true,
      requiresAlloggiati: true,
      requiresISTAT: true,
      requiresSCIA: true,

      maxUnits: null,
      minUnits: null,
      requiresInsurance: true,
      requiresAML: true,
    },
    invoicing: {
      availableDocumentTypes: ['invoice', 'corrispettivo', 'proforma', 'credit_note', 'receipt'],
      defaultDocumentType: 'corrispettivo',
    },
  },

  mixed: {
    key: 'mixed',
    label: 'Hotel + Residence',
    labelPlural: 'Hotel + Residence',
    description: 'Struttura mista alberghiera e residenziale',
    icon: Building2,
    unitLabel: 'unità',
    unitLabelPlural: 'unità',
    features: {
      restaurant: true,
      housekeepingDaily: true,
      folioCharges: true,
      mealPlans: true,
      selfCheckin: true,
      securityDeposits: true,
      guestGuidebook: true,
      farmConnection: false,
      weeklyMonthlyPricing: true,
    },
    navigation: {
      showRestaurant: true,
      showHousekeeping: true,
      showSelfCheckin: true,
    },
    fiscal: {
      defaultFiscalRegime: 'ordinario',
      allowedFiscalRegimes: ['ordinario', 'forfettario'],
      defaultVatRate: 10,
      hasVat: true,
      allowCedolareSecca: false,
      defaultCedolareRate: 0,
      allowForfettario: true,
      forfettarioCoefficient: 40,
      requiresCorrispettivi: true,
      requiresFatturaElettronica: true,
      allowRicevutaNonFiscale: false,
      ritenutaOTA: 0,
      atecoSuggestion: '55.10.00',
      specialAgriRegime: false,
    },
    compliance: {
      requiresCIN: true,
      requiresAlloggiati: true,
      requiresISTAT: true,
      requiresSCIA: true,

      maxUnits: null,
      minUnits: null,
      requiresInsurance: true,
      requiresAML: true,
    },
    invoicing: {
      availableDocumentTypes: ['invoice', 'corrispettivo', 'proforma', 'credit_note', 'receipt'],
      defaultDocumentType: 'corrispettivo',
    },
  },

  b_and_b: {
    key: 'b_and_b',
    label: 'Bed & Breakfast',
    labelPlural: 'Bed & Breakfast',
    description: 'B&B imprenditoriale o non imprenditoriale',
    icon: Home,
    unitLabel: 'camera',
    unitLabelPlural: 'camere',
    features: {
      restaurant: false,
      housekeepingDaily: false,
      folioCharges: false,
      mealPlans: false, // only breakfast, handled by type
      selfCheckin: true,
      securityDeposits: false,
      guestGuidebook: true,
      farmConnection: false,
      weeklyMonthlyPricing: false,
    },
    navigation: {
      showRestaurant: false,
      showHousekeeping: true,
      showSelfCheckin: true,
    },
    // Fiscal rules depend on is_imprenditoriale flag
    // These are defaults for NON-imprenditoriale (private B&B)
    // When is_imprenditoriale=true, the UI overrides to show IVA/fattura options
    fiscal: {
      defaultFiscalRegime: 'cedolare_secca',
      allowedFiscalRegimes: ['cedolare_secca', 'ordinario', 'forfettario'],
      defaultVatRate: 0,
      hasVat: false,
      allowCedolareSecca: true,
      defaultCedolareRate: 21,
      allowForfettario: true,
      forfettarioCoefficient: 40,
      requiresCorrispettivi: false,
      requiresFatturaElettronica: false,
      allowRicevutaNonFiscale: true,
      ritenutaOTA: 21,
      atecoSuggestion: '55.20.41',
      specialAgriRegime: false,
    },
    compliance: {
      requiresCIN: true,
      requiresAlloggiati: true,
      requiresISTAT: true,
      requiresSCIA: false, // depends on region, set as soft

      maxUnits: 6,
      minUnits: null,
      requiresInsurance: false,
      requiresAML: false,
    },
    invoicing: {
      availableDocumentTypes: ['receipt', 'proforma'],
      defaultDocumentType: 'receipt',
    },
  },

  casa_vacanze: {
    key: 'casa_vacanze',
    label: 'Casa Vacanze',
    labelPlural: 'Case Vacanze',
    description: 'Appartamento turistico / Locazione turistica',
    icon: DoorOpen,
    unitLabel: 'appartamento',
    unitLabelPlural: 'appartamenti',
    features: {
      restaurant: false,
      housekeepingDaily: false,
      folioCharges: false,
      mealPlans: false,
      selfCheckin: true,
      securityDeposits: true,
      guestGuidebook: true,
      farmConnection: false,
      weeklyMonthlyPricing: true,
    },
    navigation: {
      showRestaurant: false,
      showHousekeeping: true,
      showSelfCheckin: true,
    },
    fiscal: {
      defaultFiscalRegime: 'cedolare_secca',
      allowedFiscalRegimes: ['cedolare_secca', 'ordinario', 'forfettario'],
      defaultVatRate: 0,
      hasVat: false,
      allowCedolareSecca: true,
      defaultCedolareRate: 21,
      allowForfettario: true,
      forfettarioCoefficient: 40,
      requiresCorrispettivi: false,
      requiresFatturaElettronica: false,
      allowRicevutaNonFiscale: true,
      ritenutaOTA: 21,
      atecoSuggestion: '55.20.42',
      specialAgriRegime: false,
    },
    compliance: {
      requiresCIN: true,
      requiresAlloggiati: true,
      requiresISTAT: true,
      requiresSCIA: false,

      maxUnits: 2,  // dal 2026: max 2 senza P.IVA
      minUnits: null,
      requiresInsurance: false,
      requiresAML: false,
    },
    invoicing: {
      availableDocumentTypes: ['receipt', 'proforma'],
      defaultDocumentType: 'receipt',
    },
  },

  affittacamere: {
    key: 'affittacamere',
    label: 'Affittacamere',
    labelPlural: 'Affittacamere',
    description: 'Affittacamere (sempre imprenditoriale)',
    icon: BedDouble,
    unitLabel: 'camera',
    unitLabelPlural: 'camere',
    features: {
      restaurant: false,
      housekeepingDaily: false,
      folioCharges: false,
      mealPlans: false,
      selfCheckin: true,
      securityDeposits: false,
      guestGuidebook: true,
      farmConnection: false,
      weeklyMonthlyPricing: false,
    },
    navigation: {
      showRestaurant: false,
      showHousekeeping: true,
      showSelfCheckin: true,
    },
    fiscal: {
      defaultFiscalRegime: 'forfettario',
      allowedFiscalRegimes: ['forfettario', 'ordinario'],
      defaultVatRate: 10,
      hasVat: true,
      allowCedolareSecca: false,
      defaultCedolareRate: 0,
      allowForfettario: true,
      forfettarioCoefficient: 40,
      requiresCorrispettivi: true,
      requiresFatturaElettronica: true,
      allowRicevutaNonFiscale: false,
      ritenutaOTA: 0,
      atecoSuggestion: '55.20.42',
      specialAgriRegime: false,
    },
    compliance: {
      requiresCIN: true,
      requiresAlloggiati: true,
      requiresISTAT: true,
      requiresSCIA: true,

      maxUnits: 6,
      minUnits: null,
      requiresInsurance: true,
      requiresAML: true,
    },
    invoicing: {
      availableDocumentTypes: ['invoice', 'proforma', 'credit_note'],
      defaultDocumentType: 'invoice',
    },
  },

  agriturismo: {
    key: 'agriturismo',
    label: 'Agriturismo',
    labelPlural: 'Agriturismi',
    description: 'Agriturismo con attività agricola connessa',
    icon: Wheat,
    unitLabel: 'camera',
    unitLabelPlural: 'camere',
    features: {
      restaurant: true,
      housekeepingDaily: false,
      folioCharges: true,
      mealPlans: true,
      selfCheckin: false,
      securityDeposits: false,
      guestGuidebook: true,
      farmConnection: true,
      weeklyMonthlyPricing: false,
    },
    navigation: {
      showRestaurant: true,
      showHousekeeping: true,
      showSelfCheckin: false,
    },
    fiscal: {
      defaultFiscalRegime: 'agriturismo_special',
      allowedFiscalRegimes: ['agriturismo_special', 'ordinario'],
      defaultVatRate: 10,
      hasVat: true,
      allowCedolareSecca: false,
      defaultCedolareRate: 0,
      allowForfettario: false,
      forfettarioCoefficient: 25,
      requiresCorrispettivi: true,
      requiresFatturaElettronica: true,
      allowRicevutaNonFiscale: false,
      ritenutaOTA: 0,
      atecoSuggestion: '55.20.52',
      specialAgriRegime: true,
    },
    compliance: {
      requiresCIN: true,
      requiresAlloggiati: true,
      requiresISTAT: true,
      requiresSCIA: true,

      maxUnits: null,  // max 30-45 posti letto (regionale)
      minUnits: null,
      requiresInsurance: true,
      requiresAML: true,
    },
    invoicing: {
      availableDocumentTypes: ['invoice', 'receipt', 'proforma', 'credit_note'],
      defaultDocumentType: 'invoice',
    },
  },
}

// ---------------------------------------------------------------------------
// Helper: get effective fiscal config considering is_imprenditoriale override
// ---------------------------------------------------------------------------

export function getEffectiveFiscalConfig(
  propertyType: PropertyType,
  isImprenditoriale: boolean
): PropertyFiscalRules {
  const base = PROPERTY_TYPE_CONFIGS[propertyType].fiscal

  // B&B imprenditoriale overrides: gets IVA, fattura elettronica, no cedolare secca
  if (propertyType === 'b_and_b' && isImprenditoriale) {
    return {
      ...base,
      defaultFiscalRegime: 'forfettario',
      allowedFiscalRegimes: ['forfettario', 'ordinario'],
      defaultVatRate: 10,
      hasVat: true,
      allowCedolareSecca: false,
      defaultCedolareRate: 0,
      requiresCorrispettivi: true,
      requiresFatturaElettronica: true,
      allowRicevutaNonFiscale: false,
      ritenutaOTA: 0,
      atecoSuggestion: '55.20.41',
    }
  }

  // Apartment imprenditoriale (casa vacanze imprenditoriale)
  if (propertyType === 'casa_vacanze' && isImprenditoriale) {
    return {
      ...base,
      defaultFiscalRegime: 'forfettario',
      allowedFiscalRegimes: ['forfettario', 'ordinario'],
      defaultVatRate: 10,
      hasVat: true,
      allowCedolareSecca: false,
      defaultCedolareRate: 0,
      requiresCorrispettivi: true,
      requiresFatturaElettronica: true,
      allowRicevutaNonFiscale: false,
      ritenutaOTA: 0,
      atecoSuggestion: '55.20.42',
    }
  }

  return base
}

// ---------------------------------------------------------------------------
// Helper: get effective compliance considering is_imprenditoriale override
// ---------------------------------------------------------------------------

export function getEffectiveCompliance(
  propertyType: PropertyType,
  isImprenditoriale: boolean
): PropertyCompliance {
  const base = PROPERTY_TYPE_CONFIGS[propertyType].compliance

  if (isImprenditoriale && (propertyType === 'b_and_b' || propertyType === 'casa_vacanze')) {
    return {
      ...base,
      requiresSCIA: true,
      requiresInsurance: true,
      requiresAML: true,
      maxUnits: propertyType === 'b_and_b' ? 6 : null,
    }
  }

  return base
}

// ---------------------------------------------------------------------------
// Helper: get effective invoicing considering is_imprenditoriale override
// ---------------------------------------------------------------------------

export function getEffectiveInvoicing(
  propertyType: PropertyType,
  isImprenditoriale: boolean
): PropertyInvoicing {
  const base = PROPERTY_TYPE_CONFIGS[propertyType].invoicing

  if (isImprenditoriale && (propertyType === 'b_and_b' || propertyType === 'casa_vacanze')) {
    return {
      availableDocumentTypes: ['invoice', 'proforma', 'credit_note'],
      defaultDocumentType: 'invoice',
    }
  }

  return base
}
