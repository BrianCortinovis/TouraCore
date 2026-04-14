// ---------------------------------------------------------------------------
// Tipi base
// ---------------------------------------------------------------------------

export type PropertyType =
  | 'hotel'
  | 'b_and_b'
  | 'apartment'
  | 'agriturismo'
  | 'residence'
  | 'affittacamere'
  | 'mixed'

export type FiscalRegime = 'ordinario' | 'forfettario' | 'cedolare_secca' | 'agriturismo_special'
export type SciaStatus = 'pending' | 'approved' | 'expired'
export type InvoiceType = 'invoice' | 'corrispettivo' | 'proforma' | 'credit_note' | 'receipt'

// ---------------------------------------------------------------------------
// Feature flags per property type
// ---------------------------------------------------------------------------

export interface PropertyFeatures {
  restaurant: boolean
  housekeepingDaily: boolean
  folioCharges: boolean
  mealPlans: boolean
  selfCheckin: boolean
  rentalContracts: boolean
  utilityCosts: boolean
  securityDeposits: boolean
  guestGuidebook: boolean
  farmConnection: boolean
  weeklyMonthlyPricing: boolean
}

// ---------------------------------------------------------------------------
// Visibilità navigazione
// ---------------------------------------------------------------------------

export interface PropertyNavigation {
  showRestaurant: boolean
  showHousekeeping: boolean
  showSelfCheckin: boolean
  showContracts: boolean
  showUtilities: boolean
}

// ---------------------------------------------------------------------------
// Regole fiscali per property type
// ---------------------------------------------------------------------------

export interface PropertyFiscalRules {
  defaultFiscalRegime: FiscalRegime
  allowedFiscalRegimes: FiscalRegime[]
  defaultVatRate: number
  hasVat: boolean
  allowCedolareSecca: boolean
  defaultCedolareRate: number
  allowForfettario: boolean
  forfettarioCoefficient: number
  requiresCorrispettivi: boolean
  requiresFatturaElettronica: boolean
  allowRicevutaNonFiscale: boolean
  ritenutaOTA: number
  atecoSuggestion: string
  specialAgriRegime: boolean
}

// ---------------------------------------------------------------------------
// Requisiti compliance per property type
// ---------------------------------------------------------------------------

export interface PropertyCompliance {
  requiresCIN: boolean
  requiresAlloggiati: boolean
  requiresISTAT: boolean
  requiresSCIA: boolean
  requiresRentalContract: boolean
  maxUnits: number | null
  minUnits: number | null
  requiresInsurance: boolean
  requiresAML: boolean
}

// ---------------------------------------------------------------------------
// Opzioni fatturazione
// ---------------------------------------------------------------------------

export interface PropertyInvoicing {
  availableDocumentTypes: InvoiceType[]
  defaultDocumentType: InvoiceType
}

// ---------------------------------------------------------------------------
// Config completa per property type
// ---------------------------------------------------------------------------

export interface PropertyTypeConfig {
  value: PropertyType
  label: string
  labelPlural: string
  description: string
  icon: string
  unitLabel: string
  unitLabelPlural: string
  // Flags operativi (backward compat)
  hasRoomTypes: boolean
  hasRooms: boolean
  hasRatePlans: boolean
  hasSeasons: boolean
  hasMealPlans: boolean
  hasStarRating: boolean
  hasCheckInOut: boolean
  defaultMealPlan: string
  // Config strutturate
  features: PropertyFeatures
  navigation: PropertyNavigation
  fiscal: PropertyFiscalRules
  compliance: PropertyCompliance
  invoicing: PropertyInvoicing
}

// ---------------------------------------------------------------------------
// Definizioni per tipo
// ---------------------------------------------------------------------------

export const PROPERTY_TYPE_CONFIGS: Record<PropertyType, PropertyTypeConfig> = {
  hotel: {
    value: 'hotel',
    label: 'Hotel',
    labelPlural: 'Hotel',
    description: 'Struttura alberghiera con servizi completi',
    icon: 'Hotel',
    unitLabel: 'camera',
    unitLabelPlural: 'camere',
    hasRoomTypes: true,
    hasRooms: true,
    hasRatePlans: true,
    hasSeasons: true,
    hasMealPlans: true,
    hasStarRating: true,
    hasCheckInOut: true,
    defaultMealPlan: 'breakfast',
    features: {
      restaurant: true,
      housekeepingDaily: true,
      folioCharges: true,
      mealPlans: true,
      selfCheckin: false,
      rentalContracts: false,
      utilityCosts: false,
      securityDeposits: false,
      guestGuidebook: false,
      farmConnection: false,
      weeklyMonthlyPricing: false,
    },
    navigation: {
      showRestaurant: true,
      showHousekeeping: true,
      showSelfCheckin: false,
      showContracts: false,
      showUtilities: false,
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
      requiresCIN: true, requiresAlloggiati: true, requiresISTAT: true, requiresSCIA: true,
      requiresRentalContract: false, maxUnits: null, minUnits: 7,
      requiresInsurance: true, requiresAML: true,
    },
    invoicing: {
      availableDocumentTypes: ['invoice', 'corrispettivo', 'proforma', 'credit_note', 'receipt'],
      defaultDocumentType: 'corrispettivo',
    },
  },

  residence: {
    value: 'residence',
    label: 'Residence',
    labelPlural: 'Residence',
    description: 'Residenza turistico-alberghiera con unità abitative',
    icon: 'Building',
    unitLabel: 'unità',
    unitLabelPlural: 'unità',
    hasRoomTypes: true,
    hasRooms: true,
    hasRatePlans: true,
    hasSeasons: true,
    hasMealPlans: false,
    hasStarRating: false,
    hasCheckInOut: true,
    defaultMealPlan: 'room_only',
    features: {
      restaurant: true,
      housekeepingDaily: true,
      folioCharges: true,
      mealPlans: true,
      selfCheckin: true,
      rentalContracts: false,
      utilityCosts: false,
      securityDeposits: true,
      guestGuidebook: true,
      farmConnection: false,
      weeklyMonthlyPricing: true,
    },
    navigation: {
      showRestaurant: true,
      showHousekeeping: true,
      showSelfCheckin: true,
      showContracts: false,
      showUtilities: false,
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
      requiresCIN: true, requiresAlloggiati: true, requiresISTAT: true, requiresSCIA: true,
      requiresRentalContract: false, maxUnits: null, minUnits: null,
      requiresInsurance: true, requiresAML: true,
    },
    invoicing: {
      availableDocumentTypes: ['invoice', 'corrispettivo', 'proforma', 'credit_note', 'receipt'],
      defaultDocumentType: 'corrispettivo',
    },
  },

  mixed: {
    value: 'mixed',
    label: 'Hotel + Residence',
    labelPlural: 'Hotel + Residence',
    description: 'Struttura mista alberghiera e residenziale',
    icon: 'Building2',
    unitLabel: 'unità',
    unitLabelPlural: 'unità',
    hasRoomTypes: true,
    hasRooms: true,
    hasRatePlans: true,
    hasSeasons: true,
    hasMealPlans: true,
    hasStarRating: false,
    hasCheckInOut: true,
    defaultMealPlan: 'room_only',
    features: {
      restaurant: true,
      housekeepingDaily: true,
      folioCharges: true,
      mealPlans: true,
      selfCheckin: true,
      rentalContracts: false,
      utilityCosts: false,
      securityDeposits: true,
      guestGuidebook: true,
      farmConnection: false,
      weeklyMonthlyPricing: true,
    },
    navigation: {
      showRestaurant: true,
      showHousekeeping: true,
      showSelfCheckin: true,
      showContracts: false,
      showUtilities: false,
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
      requiresCIN: true, requiresAlloggiati: true, requiresISTAT: true, requiresSCIA: true,
      requiresRentalContract: false, maxUnits: null, minUnits: null,
      requiresInsurance: true, requiresAML: true,
    },
    invoicing: {
      availableDocumentTypes: ['invoice', 'corrispettivo', 'proforma', 'credit_note', 'receipt'],
      defaultDocumentType: 'corrispettivo',
    },
  },

  b_and_b: {
    value: 'b_and_b',
    label: 'Bed & Breakfast',
    labelPlural: 'Bed & Breakfast',
    description: 'B&B imprenditoriale o non imprenditoriale',
    icon: 'Home',
    unitLabel: 'camera',
    unitLabelPlural: 'camere',
    hasRoomTypes: true,
    hasRooms: true,
    hasRatePlans: true,
    hasSeasons: true,
    hasMealPlans: true,
    hasStarRating: false,
    hasCheckInOut: true,
    defaultMealPlan: 'breakfast',
    features: {
      restaurant: false,
      housekeepingDaily: false,
      folioCharges: false,
      mealPlans: false,
      selfCheckin: true,
      rentalContracts: false,
      utilityCosts: false,
      securityDeposits: false,
      guestGuidebook: true,
      farmConnection: false,
      weeklyMonthlyPricing: false,
    },
    navigation: {
      showRestaurant: false,
      showHousekeeping: true,
      showSelfCheckin: true,
      showContracts: false,
      showUtilities: false,
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
      atecoSuggestion: '55.20.41',
      specialAgriRegime: false,
    },
    compliance: {
      requiresCIN: true, requiresAlloggiati: true, requiresISTAT: true, requiresSCIA: false,
      requiresRentalContract: false, maxUnits: 6, minUnits: null,
      requiresInsurance: false, requiresAML: false,
    },
    invoicing: {
      availableDocumentTypes: ['receipt', 'proforma'],
      defaultDocumentType: 'receipt',
    },
  },

  apartment: {
    value: 'apartment',
    label: 'Casa Vacanze',
    labelPlural: 'Case Vacanze',
    description: 'Appartamento turistico / Locazione turistica',
    icon: 'DoorOpen',
    unitLabel: 'appartamento',
    unitLabelPlural: 'appartamenti',
    hasRoomTypes: false,
    hasRooms: false,
    hasRatePlans: true,
    hasSeasons: true,
    hasMealPlans: false,
    hasStarRating: false,
    hasCheckInOut: true,
    defaultMealPlan: 'room_only',
    features: {
      restaurant: false,
      housekeepingDaily: false,
      folioCharges: false,
      mealPlans: false,
      selfCheckin: true,
      rentalContracts: true,
      utilityCosts: true,
      securityDeposits: true,
      guestGuidebook: true,
      farmConnection: false,
      weeklyMonthlyPricing: true,
    },
    navigation: {
      showRestaurant: false,
      showHousekeeping: true,
      showSelfCheckin: true,
      showContracts: true,
      showUtilities: true,
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
      requiresCIN: true, requiresAlloggiati: true, requiresISTAT: true, requiresSCIA: false,
      requiresRentalContract: true, maxUnits: 2, minUnits: null,
      requiresInsurance: false, requiresAML: false,
    },
    invoicing: {
      availableDocumentTypes: ['receipt', 'proforma'],
      defaultDocumentType: 'receipt',
    },
  },

  affittacamere: {
    value: 'affittacamere',
    label: 'Affittacamere',
    labelPlural: 'Affittacamere',
    description: 'Affittacamere (sempre imprenditoriale)',
    icon: 'BedDouble',
    unitLabel: 'camera',
    unitLabelPlural: 'camere',
    hasRoomTypes: true,
    hasRooms: true,
    hasRatePlans: true,
    hasSeasons: true,
    hasMealPlans: true,
    hasStarRating: false,
    hasCheckInOut: true,
    defaultMealPlan: 'room_only',
    features: {
      restaurant: false,
      housekeepingDaily: false,
      folioCharges: false,
      mealPlans: false,
      selfCheckin: true,
      rentalContracts: false,
      utilityCosts: false,
      securityDeposits: false,
      guestGuidebook: true,
      farmConnection: false,
      weeklyMonthlyPricing: false,
    },
    navigation: {
      showRestaurant: false,
      showHousekeeping: true,
      showSelfCheckin: true,
      showContracts: false,
      showUtilities: false,
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
      requiresCIN: true, requiresAlloggiati: true, requiresISTAT: true, requiresSCIA: true,
      requiresRentalContract: false, maxUnits: 6, minUnits: null,
      requiresInsurance: true, requiresAML: true,
    },
    invoicing: {
      availableDocumentTypes: ['invoice', 'proforma', 'credit_note'],
      defaultDocumentType: 'invoice',
    },
  },

  agriturismo: {
    value: 'agriturismo',
    label: 'Agriturismo',
    labelPlural: 'Agriturismi',
    description: 'Agriturismo con attività agricola connessa',
    icon: 'Wheat',
    unitLabel: 'camera',
    unitLabelPlural: 'camere',
    hasRoomTypes: true,
    hasRooms: true,
    hasRatePlans: true,
    hasSeasons: true,
    hasMealPlans: true,
    hasStarRating: false,
    hasCheckInOut: true,
    defaultMealPlan: 'half_board',
    features: {
      restaurant: true,
      housekeepingDaily: false,
      folioCharges: true,
      mealPlans: true,
      selfCheckin: false,
      rentalContracts: false,
      utilityCosts: false,
      securityDeposits: false,
      guestGuidebook: true,
      farmConnection: true,
      weeklyMonthlyPricing: false,
    },
    navigation: {
      showRestaurant: true,
      showHousekeeping: true,
      showSelfCheckin: false,
      showContracts: false,
      showUtilities: false,
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
      requiresCIN: true, requiresAlloggiati: true, requiresISTAT: true, requiresSCIA: true,
      requiresRentalContract: false, maxUnits: null, minUnits: null,
      requiresInsurance: true, requiresAML: true,
    },
    invoicing: {
      availableDocumentTypes: ['invoice', 'receipt', 'proforma', 'credit_note'],
      defaultDocumentType: 'invoice',
    },
  },
}

// ---------------------------------------------------------------------------
// Array di compatibilità (per select options, iterazione)
// ---------------------------------------------------------------------------

export const PROPERTY_TYPES: PropertyTypeConfig[] = Object.values(PROPERTY_TYPE_CONFIGS)

export function getPropertyTypeConfig(type: PropertyType): PropertyTypeConfig {
  return PROPERTY_TYPE_CONFIGS[type] ?? PROPERTY_TYPE_CONFIGS.hotel
}

export const PROPERTY_TYPE_OPTIONS = PROPERTY_TYPES.map((pt) => ({
  value: pt.value,
  label: pt.label,
}))

// ---------------------------------------------------------------------------
// Helper: config fiscale effettiva considerando is_imprenditoriale
// ---------------------------------------------------------------------------

export function getEffectiveFiscalConfig(
  propertyType: PropertyType,
  isImprenditoriale: boolean
): PropertyFiscalRules {
  const base = PROPERTY_TYPE_CONFIGS[propertyType].fiscal

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

  if (propertyType === 'apartment' && isImprenditoriale) {
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
// Helper: compliance effettiva considerando is_imprenditoriale
// ---------------------------------------------------------------------------

export function getEffectiveCompliance(
  propertyType: PropertyType,
  isImprenditoriale: boolean
): PropertyCompliance {
  const base = PROPERTY_TYPE_CONFIGS[propertyType].compliance

  if (isImprenditoriale && (propertyType === 'b_and_b' || propertyType === 'apartment')) {
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
// Helper: fatturazione effettiva considerando is_imprenditoriale
// ---------------------------------------------------------------------------

export function getEffectiveInvoicing(
  propertyType: PropertyType,
  isImprenditoriale: boolean
): PropertyInvoicing {
  const base = PROPERTY_TYPE_CONFIGS[propertyType].invoicing

  if (isImprenditoriale && (propertyType === 'b_and_b' || propertyType === 'apartment')) {
    return {
      availableDocumentTypes: ['invoice', 'proforma', 'credit_note'],
      defaultDocumentType: 'invoice',
    }
  }

  return base
}

// ---------------------------------------------------------------------------
// Helper: is_imprenditoriale è configurabile per questo tipo?
// ---------------------------------------------------------------------------

export function canToggleImprenditoriale(propertyType: PropertyType): boolean {
  return propertyType === 'b_and_b' || propertyType === 'apartment'
}

// ---------------------------------------------------------------------------
// Helper: is_imprenditoriale forzato per questo tipo?
// ---------------------------------------------------------------------------

export function isAlwaysImprenditoriale(propertyType: PropertyType): boolean {
  return propertyType === 'hotel' || propertyType === 'residence' || propertyType === 'mixed'
    || propertyType === 'affittacamere' || propertyType === 'agriturismo'
}
