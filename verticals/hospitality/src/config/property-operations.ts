import type { Json, PropertyType } from '../types/database'

type UnknownRecord = Record<string, unknown>

export type SharedOperationsCatalogKey = 'linens' | 'laundry' | 'kitchen' | 'extras'

export interface SharedOperationsCatalogPresentation {
  key: SharedOperationsCatalogKey
  label: string
  title: string
  description: string
}

export interface PropertyTypeOperationsProfile {
  propertyType: PropertyType
  label: string
  description: string
  serviceSummary: string
  operationalModel: 'hospitality' | 'residential' | 'hybrid'
  usesStructureServiceModel: boolean
  sharedCatalogs: SharedOperationsCatalogKey[]
  sharedCatalogPresentation: Partial<Record<SharedOperationsCatalogKey, SharedOperationsCatalogPresentation>>
}

export interface OperationsConfigRoot {
  shared_catalogs: Partial<Record<SharedOperationsCatalogKey, unknown>>
  property_type_modules: Partial<Record<PropertyType, UnknownRecord>>
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function toSettingsRecord(value: Json | null | undefined): UnknownRecord {
  return isRecord(value) ? value : {}
}

function toOperationsConfigRecord(settings: Json | null | undefined): UnknownRecord {
  const root = toSettingsRecord(settings)
  return isRecord(root.operations_config) ? root.operations_config : {}
}

function toSharedCatalogRecord(settings: Json | null | undefined): Partial<Record<SharedOperationsCatalogKey, unknown>> {
  const root = toOperationsConfigRecord(settings)
  const shared = isRecord(root.shared_catalogs) ? root.shared_catalogs : {}

  return {
    linens: shared.linens,
    laundry: shared.laundry,
    kitchen: shared.kitchen,
    extras: shared.extras,
  }
}

function toPropertyTypeModuleRecord(
  settings: Json | null | undefined,
  propertyType: PropertyType
): UnknownRecord {
  const root = toOperationsConfigRecord(settings)
  const propertyTypeModules = isRecord(root.property_type_modules) ? root.property_type_modules : {}
  const fromUnified = isRecord(propertyTypeModules[propertyType])
    ? (propertyTypeModules[propertyType] as UnknownRecord)
    : null

  if (fromUnified) return fromUnified

  return {}
}

export function getOperationsConfigRoot(settings: Json | null | undefined): OperationsConfigRoot {
  return {
    shared_catalogs: toSharedCatalogRecord(settings),
    property_type_modules: {
      hotel: toPropertyTypeModuleRecord(settings, 'hotel'),
      residence: toPropertyTypeModuleRecord(settings, 'residence'),
      casa_vacanze: toPropertyTypeModuleRecord(settings, 'casa_vacanze'),
      b_and_b: toPropertyTypeModuleRecord(settings, 'b_and_b'),
      agriturismo: toPropertyTypeModuleRecord(settings, 'agriturismo'),
      affittacamere: toPropertyTypeModuleRecord(settings, 'affittacamere'),
      mixed: toPropertyTypeModuleRecord(settings, 'mixed'),
    },
  }
}

export function getOperationsSharedCatalogs(settings: Json | null | undefined) {
  return getOperationsConfigRoot(settings).shared_catalogs
}

export function getPropertyTypeOperationsModule(
  settings: Json | null | undefined,
  propertyType: PropertyType
) {
  return getOperationsConfigRoot(settings).property_type_modules[propertyType] ?? {}
}

export function buildOperationsSettingsPayload({
  currentSettings,
  propertyType,
  sharedCatalogs,
  typeModule,
}: {
  currentSettings: Json | null | undefined
  propertyType: PropertyType
  sharedCatalogs?: Partial<Record<SharedOperationsCatalogKey, unknown>>
  typeModule?: UnknownRecord
}): Record<string, unknown> {
  const settingsRecord = toSettingsRecord(currentSettings)
  const operationsRoot = getOperationsConfigRoot(currentSettings)
  const nextSharedCatalogs = {
    ...operationsRoot.shared_catalogs,
    ...(sharedCatalogs ?? {}),
  }
  const nextPropertyTypeModules = {
    ...operationsRoot.property_type_modules,
    ...(typeModule ? { [propertyType]: typeModule } : {}),
  }

  const nextSettings: UnknownRecord = {
    ...settingsRecord,
    operations_config: {
      ...toOperationsConfigRecord(currentSettings),
      shared_catalogs: nextSharedCatalogs as unknown as Json,
      property_type_modules: nextPropertyTypeModules as unknown as Json,
    },
  }

  return {
    settings: nextSettings as unknown as Json,
  }
}

export const PROPERTY_TYPE_OPERATIONS_PROFILES: Record<PropertyType, PropertyTypeOperationsProfile> = {
  hotel: {
    propertyType: 'hotel',
    label: 'Hotel',
    description: 'Modello alberghiero con front office, housekeeping, add-on vendibili e dotazioni per tipologia camera.',
    serviceSummary: 'Servizi trasversali struttura, moduli hotel dedicati, housekeeping, add-on vendibili e tipologie camera.',
    operationalModel: 'hospitality',
    usesStructureServiceModel: true,
    sharedCatalogs: ['extras'],
    sharedCatalogPresentation: {
      extras: {
        key: 'extras',
        label: 'Servizi struttura',
        title: 'Servizi struttura condivisi',
        description: 'Piscina, spa, parcheggio, transfer, bici, wellness e altri servizi trasversali validi anche per hotel.',
      },
    },
  },
  residence: {
    propertyType: 'residence',
    label: 'Residence',
    description: 'Struttura ibrida tra alberghiero e soggiorno medio-lungo, con servizi comuni e unita` abitative.',
    serviceSummary: 'Pulizie programmate, servizi struttura, extra e soggiorni medio-lunghi.',
    operationalModel: 'hybrid',
    usesStructureServiceModel: false,
    sharedCatalogs: ['linens', 'laundry', 'kitchen', 'extras'],
    sharedCatalogPresentation: {
      linens: {
        key: 'linens',
        label: 'Biancheria',
        title: 'Biancheria residence',
        description: 'Set letto e bagno, ricambi programmati e dotazioni per soggiorni medio-lunghi.',
      },
      laundry: {
        key: 'laundry',
        label: 'Lavanderia',
        title: 'Lavanderia residence',
        description: 'Lavanderia ospite o servizi gestiti per soggiorni piu` lunghi.',
      },
      kitchen: {
        key: 'kitchen',
        label: 'Cucina',
        title: 'Dotazione angolo cottura',
        description: 'Elettrodomestici, cookware e dotazioni delle unita` residence.',
      },
      extras: {
        key: 'extras',
        label: 'Servizi comuni',
        title: 'Servizi comuni residence',
        description: 'Piscina, parcheggio, reception leggera e servizi condivisi della struttura.',
      },
    },
  },
  casa_vacanze: {
    propertyType: 'casa_vacanze',
    label: 'Casa Vacanze',
    description: 'Gestione self-service o semi-assistita con cucina, biancheria e servizi extra della struttura.',
    serviceSummary: 'Biancheria, cucina, extra, self-service e servizi prenotabili.',
    operationalModel: 'residential',
    usesStructureServiceModel: false,
    sharedCatalogs: ['linens', 'laundry', 'kitchen', 'extras'],
    sharedCatalogPresentation: {
      linens: {
        key: 'linens',
        label: 'Biancheria',
        title: 'Biancheria casa vacanze',
        description: 'Lenzuola, asciugamani, teli mare e ricambi per il soggiorno.',
      },
      laundry: {
        key: 'laundry',
        label: 'Lavanderia',
        title: 'Lavanderia appartamento',
        description: 'Lavatrice, asciugatrice, detersivi e regole di utilizzo per gli ospiti.',
      },
      kitchen: {
        key: 'kitchen',
        label: 'Cucina',
        title: 'Dotazione cucina appartamento',
        description: 'Angolo cottura, stoviglie, elettrodomestici e dotazione domestica.',
      },
      extras: {
        key: 'extras',
        label: 'Extra',
        title: 'Servizi extra appartamento',
        description: 'Spa, parcheggio, bici, transfer e servizi prenotabili dalla struttura.',
      },
    },
  },
  b_and_b: {
    propertyType: 'b_and_b',
    label: 'B&B',
    description: 'Modello leggero con forte attenzione a colazione, accoglienza e servizi ospite essenziali.',
    serviceSummary: 'Accoglienza, colazione, biancheria, servizi ospite ed extra.',
    operationalModel: 'hospitality',
    usesStructureServiceModel: false,
    sharedCatalogs: ['linens', 'laundry', 'extras'],
    sharedCatalogPresentation: {
      linens: {
        key: 'linens',
        label: 'Biancheria',
        title: 'Biancheria camere B&B',
        description: 'Set letto e bagno, ricambi e comfort camera per ospitalita` leggera.',
      },
      laundry: {
        key: 'laundry',
        label: 'Lavanderia',
        title: 'Lavanderia e riassetto',
        description: 'Riassetto biancheria, servizi extra e supporto lavanderia per ospiti.',
      },
      extras: {
        key: 'extras',
        label: 'Servizi ospite',
        title: 'Servizi ospite B&B',
        description: 'Colazione, deposito bagagli, transfer e servizi accessori per la permanenza.',
      },
    },
  },
  agriturismo: {
    propertyType: 'agriturismo',
    label: 'Agriturismo',
    description: 'Struttura rurale con servizi ospite, esperienze, outdoor e moduli dedicati all’identita` agricola.',
    serviceSummary: 'Servizi struttura, outdoor, esperienze, biancheria e moduli rurali.',
    operationalModel: 'hybrid',
    usesStructureServiceModel: false,
    sharedCatalogs: ['linens', 'laundry', 'kitchen', 'extras'],
    sharedCatalogPresentation: {
      linens: {
        key: 'linens',
        label: 'Biancheria',
        title: 'Biancheria ospitalita` rurale',
        description: 'Set letto, bagno e teli per area benessere o piscina agrituristica.',
      },
      laundry: {
        key: 'laundry',
        label: 'Lavanderia',
        title: 'Lavanderia agriturismo',
        description: 'Lavatrice, servizi di supporto e regole operative della struttura rurale.',
      },
      kitchen: {
        key: 'kitchen',
        label: 'Cucina',
        title: 'Dotazione cucina e degustazione',
        description: 'Cucina ospite, attrezzature e supporto alla somministrazione o degustazione.',
      },
      extras: {
        key: 'extras',
        label: 'Servizi struttura',
        title: 'Servizi e attivita` agriturismo',
        description: 'Wellness, outdoor, bici, transfer e servizi accessori della struttura.',
      },
    },
  },
  affittacamere: {
    propertyType: 'affittacamere',
    label: 'Affittacamere',
    description: 'Gestione camere con servizi leggeri, pulizie e dotazioni essenziali.',
    serviceSummary: 'Biancheria, lavanderia, servizi ospite e moduli leggeri per camere.',
    operationalModel: 'hospitality',
    usesStructureServiceModel: false,
    sharedCatalogs: ['linens', 'laundry', 'extras'],
    sharedCatalogPresentation: {
      linens: {
        key: 'linens',
        label: 'Biancheria',
        title: 'Biancheria camere',
        description: 'Lenzuola, asciugamani e comfort base delle camere in affittacamere.',
      },
      laundry: {
        key: 'laundry',
        label: 'Lavanderia',
        title: 'Servizi lavanderia leggeri',
        description: 'Ricambi, ferro da stiro e servizi lavanderia su richiesta.',
      },
      extras: {
        key: 'extras',
        label: 'Servizi ospite',
        title: 'Servizi accessori affittacamere',
        description: 'Colazione, deposito bagagli, transfer e servizi prenotabili per gli ospiti.',
      },
    },
  },
  mixed: {
    propertyType: 'mixed',
    label: 'Struttura mista',
    description: 'Configurazione flessibile che combina esigenze alberghiere e unita` indipendenti.',
    serviceSummary: 'Configurazione flessibile con servizi comuni e moduli dedicati.',
    operationalModel: 'hybrid',
    usesStructureServiceModel: false,
    sharedCatalogs: ['linens', 'laundry', 'kitchen', 'extras'],
    sharedCatalogPresentation: {
      linens: {
        key: 'linens',
        label: 'Biancheria',
        title: 'Biancheria struttura mista',
        description: 'Dotazioni condivise e differenziate tra camere e unita` indipendenti.',
      },
      laundry: {
        key: 'laundry',
        label: 'Lavanderia',
        title: 'Lavanderia struttura mista',
        description: 'Servizi lavanderia e supporto ospite per ambienti con logiche diverse.',
      },
      kitchen: {
        key: 'kitchen',
        label: 'Cucina',
        title: 'Dotazione cucine e unita`',
        description: 'Attrezzature cucina per appartamenti o unita` dotate di angolo cottura.',
      },
      extras: {
        key: 'extras',
        label: 'Servizi comuni',
        title: 'Servizi comuni struttura mista',
        description: 'Servizi condivisi tra camere, appartamenti e aree comuni della struttura.',
      },
    },
  },
}

export function getPropertyTypeOperationsProfile(propertyType: PropertyType | null | undefined) {
  return propertyType ? PROPERTY_TYPE_OPERATIONS_PROFILES[propertyType] : null
}

export function getSharedOperationsCatalogPresentation(
  propertyType: PropertyType | null | undefined,
  key: SharedOperationsCatalogKey
): SharedOperationsCatalogPresentation | null {
  const profile = getPropertyTypeOperationsProfile(propertyType)
  return profile?.sharedCatalogPresentation[key] ?? null
}
