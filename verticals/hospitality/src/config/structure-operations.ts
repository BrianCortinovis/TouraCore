import { getOperationsSharedCatalogs, getPropertyTypeOperationsModule } from './property-operations'
import type { Json, PropertyType } from '../types/database'

export type StructurePropertyType = Exclude<PropertyType, 'hotel'>
export type ServiceChargeMode = 'free' | 'paid'
export type ServicePricingMode = 'per_stay' | 'per_night' | 'per_guest' | 'per_item' | 'per_hour' | 'per_day'
export type LinenItemType =
  | 'bed_linen'
  | 'bath_linen'
  | 'beach_towel'
  | 'pillows'
  | 'blanket'
  | 'bathrobe'
  | 'slippers'
  | 'other'
export type LaundryServiceType =
  | 'washing_machine'
  | 'dryer'
  | 'iron'
  | 'ironing_board'
  | 'drying_rack'
  | 'laundry_service'
  | 'detergent'
  | 'other'
export type KitchenItemCategory = 'appliance' | 'small_appliance' | 'cookware' | 'tableware' | 'other'
export type ExtraAmenityType =
  | 'spa'
  | 'pool'
  | 'bike'
  | 'parking'
  | 'breakfast'
  | 'gym'
  | 'beach_service'
  | 'luggage_storage'
  | 'coworking'
  | 'ev_charger'
  | 'bbq'
  | 'baby_kit'
  | 'pet_kit'
  | 'transfer'
  | 'other'
export type PoolAccessoryType = 'sunbed' | 'umbrella'

export interface ManagedServiceBase {
  id: string
  name: string
  description: string
  is_active: boolean
  charge_mode: ServiceChargeMode
  price: number
  pricing_mode: ServicePricingMode
  included_quantity: number
  max_quantity: number | null
  requires_request: boolean
  online_bookable: boolean
  advance_notice_hours: number
  security_deposit: number
  notes: string
}

export interface ManagedLinenItem extends ManagedServiceBase {
  kind: LinenItemType
  change_included: boolean
}

export interface ManagedLaundryService extends ManagedServiceBase {
  kind: LaundryServiceType
  self_service: boolean
  reservation_required: boolean
}

export interface ManagedKitchenItem {
  id: string
  name: string
  category: KitchenItemCategory
  quantity: number
  is_active: boolean
  included: boolean
  notes: string
}

export interface ManagedExtraAmenity extends ManagedServiceBase {
  kind: ExtraAmenityType
  reservation_required: boolean
  guest_visible: boolean
  pool_details: {
    opening_hours: string
    heated: boolean
    private_access: boolean
    seasonal: boolean
    children_friendly: boolean
    accessories: ManagedPoolAccessory[]
  } | null
  spa_details: {
    opening_hours: string
    adults_only: boolean
    private_access: boolean
    treatments_available: boolean
    slot_minutes: number | null
  } | null
  bike_details: {
    e_bike: boolean
    helmet_included: boolean
    child_seat: boolean
    guided_tours: boolean
  } | null
  parking_details: {
    covered: boolean
    indoor: boolean
    guarded: boolean
    ev_charger: boolean
    requires_plate: boolean
  } | null
  transfer_details: {
    airport_service: boolean
    station_service: boolean
    private_transfer: boolean
    roundtrip: boolean
  } | null
  family_details: {
    crib: boolean
    high_chair: boolean
    baby_bath: boolean
    stroller: boolean
  } | null
  breakfast_details: {
    buffet: boolean
    in_room: boolean
    dietary_options: boolean
  } | null
  beach_details: {
    private_area: boolean
    towels_included: boolean
    seasonal: boolean
  } | null
  workspace_details: {
    desk: boolean
    monitor: boolean
    printer: boolean
  } | null
}

export interface ManagedPoolAccessory extends ManagedServiceBase {
  kind: PoolAccessoryType
  reservation_required: boolean
  guest_visible: boolean
}

export interface PropertyTypeModuleItem extends ManagedServiceBase {
  category: string
  reservation_required: boolean
  guest_visible: boolean
}

export interface PropertyTypeModuleDefinition {
  key: string
  title: string
  description: string
  item_label: string
  category_options: Array<{ value: string; label: string }>
  defaults: PropertyTypeModuleItem[]
}

export interface StructureOperationsSettings {
  linens: ManagedLinenItem[]
  laundry: ManagedLaundryService[]
  kitchen: ManagedKitchenItem[]
  extras: ManagedExtraAmenity[]
  type_specific: Record<string, PropertyTypeModuleItem[]>
}

const defaultManagedService = {
  is_active: true,
  charge_mode: 'free' as ServiceChargeMode,
  price: 0,
  pricing_mode: 'per_stay' as ServicePricingMode,
  included_quantity: 0,
  max_quantity: null,
  requires_request: true,
  online_bookable: false,
  advance_notice_hours: 0,
  security_deposit: 0,
  notes: '',
}

function createDefaultPoolDetails(): NonNullable<ManagedExtraAmenity['pool_details']> {
  return {
    opening_hours: '09:00 - 19:00',
    heated: false,
    private_access: false,
    seasonal: true,
    children_friendly: true,
    accessories: [
      createManagedPoolAccessory('sunbed'),
      createManagedPoolAccessory('umbrella'),
    ],
  }
}

function createDefaultSpaDetails(): NonNullable<ManagedExtraAmenity['spa_details']> {
  return {
    opening_hours: '10:00 - 20:00',
    adults_only: false,
    private_access: false,
    treatments_available: true,
    slot_minutes: 90,
  }
}

function createDefaultBikeDetails(): NonNullable<ManagedExtraAmenity['bike_details']> {
  return {
    e_bike: false,
    helmet_included: true,
    child_seat: false,
    guided_tours: false,
  }
}

function createDefaultParkingDetails(): NonNullable<ManagedExtraAmenity['parking_details']> {
  return {
    covered: false,
    indoor: false,
    guarded: false,
    ev_charger: false,
    requires_plate: false,
  }
}

function createDefaultTransferDetails(): NonNullable<ManagedExtraAmenity['transfer_details']> {
  return {
    airport_service: true,
    station_service: false,
    private_transfer: true,
    roundtrip: false,
  }
}

function createDefaultFamilyDetails(): NonNullable<ManagedExtraAmenity['family_details']> {
  return {
    crib: true,
    high_chair: true,
    baby_bath: false,
    stroller: false,
  }
}

function createDefaultBreakfastDetails(): NonNullable<ManagedExtraAmenity['breakfast_details']> {
  return {
    buffet: false,
    in_room: false,
    dietary_options: true,
  }
}

function createDefaultBeachDetails(): NonNullable<ManagedExtraAmenity['beach_details']> {
  return {
    private_area: false,
    towels_included: false,
    seasonal: true,
  }
}

function createDefaultWorkspaceDetails(): NonNullable<ManagedExtraAmenity['workspace_details']> {
  return {
    desk: true,
    monitor: false,
    printer: false,
  }
}

function createTypeSpecificDefault(
  id: string,
  category: string,
  name: string,
  description: string,
  overrides: Partial<PropertyTypeModuleItem> = {}
): PropertyTypeModuleItem {
  return {
    id,
    category,
    name,
    description,
    reservation_required: false,
    guest_visible: true,
    ...defaultManagedService,
    ...overrides,
  }
}

export const DEFAULT_STRUCTURE_OPERATIONS_SETTINGS: Omit<StructureOperationsSettings, 'type_specific'> = {
  linens: [
    {
      id: 'linen-bed',
      kind: 'bed_linen',
      name: 'Set lenzuola',
      description: 'Lenzuola e federe per letto matrimoniale',
      is_active: true,
      charge_mode: 'free',
      price: 0,
      pricing_mode: 'per_stay',
      included_quantity: 1,
      max_quantity: 2,
      requires_request: false,
      online_bookable: false,
      advance_notice_hours: 0,
      security_deposit: 0,
      notes: '',
      change_included: true,
    },
    {
      id: 'linen-bath',
      kind: 'bath_linen',
      name: 'Set asciugamani',
      description: 'Viso, ospite e telo doccia',
      is_active: true,
      charge_mode: 'free',
      price: 0,
      pricing_mode: 'per_guest',
      included_quantity: 1,
      max_quantity: 2,
      requires_request: false,
      online_bookable: false,
      advance_notice_hours: 0,
      security_deposit: 0,
      notes: '',
      change_included: true,
    },
    {
      id: 'linen-beach',
      kind: 'beach_towel',
      name: 'Telo mare',
      description: 'Disponibile su richiesta',
      is_active: true,
      charge_mode: 'paid',
      price: 8,
      pricing_mode: 'per_item',
      included_quantity: 0,
      max_quantity: 4,
      requires_request: true,
      online_bookable: true,
      advance_notice_hours: 6,
      security_deposit: 0,
      notes: '',
      change_included: false,
    },
    {
      id: 'linen-pillows',
      kind: 'pillows',
      name: 'Cuscini extra',
      description: 'Cuscini aggiuntivi per camera',
      is_active: true,
      charge_mode: 'free',
      price: 0,
      pricing_mode: 'per_item',
      included_quantity: 0,
      max_quantity: 4,
      requires_request: true,
      online_bookable: false,
      advance_notice_hours: 0,
      security_deposit: 0,
      notes: '',
      change_included: false,
    },
    {
      id: 'linen-bathrobe',
      kind: 'bathrobe',
      name: 'Accappatoio',
      description: 'Accappatoio disponibile per spa o soggiorni premium',
      is_active: false,
      charge_mode: 'paid',
      price: 12,
      pricing_mode: 'per_item',
      included_quantity: 0,
      max_quantity: 2,
      requires_request: true,
      online_bookable: true,
      advance_notice_hours: 12,
      security_deposit: 0,
      notes: '',
      change_included: false,
    },
    {
      id: 'linen-slippers',
      kind: 'slippers',
      name: 'Ciabattine',
      description: 'Kit ciabattine monouso o premium',
      is_active: false,
      charge_mode: 'free',
      price: 0,
      pricing_mode: 'per_item',
      included_quantity: 0,
      max_quantity: 2,
      requires_request: true,
      online_bookable: false,
      advance_notice_hours: 0,
      security_deposit: 0,
      notes: '',
      change_included: false,
    },
  ],
  laundry: [
    {
      id: 'laundry-washer',
      kind: 'washing_machine',
      name: 'Uso lavatrice',
      description: 'Accesso self-service alla lavatrice',
      is_active: true,
      charge_mode: 'paid',
      price: 10,
      pricing_mode: 'per_item',
      included_quantity: 0,
      max_quantity: 1,
      requires_request: true,
      online_bookable: true,
      advance_notice_hours: 6,
      security_deposit: 0,
      notes: '',
      self_service: true,
      reservation_required: true,
    },
    {
      id: 'laundry-dryer',
      kind: 'dryer',
      name: 'Uso asciugatrice',
      description: 'Disponibile su prenotazione',
      is_active: true,
      charge_mode: 'paid',
      price: 8,
      pricing_mode: 'per_item',
      included_quantity: 0,
      max_quantity: 1,
      requires_request: true,
      online_bookable: true,
      advance_notice_hours: 6,
      security_deposit: 0,
      notes: '',
      self_service: true,
      reservation_required: true,
    },
    {
      id: 'laundry-service',
      kind: 'laundry_service',
      name: 'Servizio lavanderia',
      description: 'Lavaggio e riconsegna da parte dello staff',
      is_active: true,
      charge_mode: 'paid',
      price: 15,
      pricing_mode: 'per_item',
      included_quantity: 0,
      max_quantity: null,
      requires_request: true,
      online_bookable: true,
      advance_notice_hours: 12,
      security_deposit: 0,
      notes: '',
      self_service: false,
      reservation_required: false,
    },
    {
      id: 'laundry-iron',
      kind: 'iron',
      name: 'Ferro da stiro',
      description: 'Ferro disponibile su richiesta',
      is_active: false,
      charge_mode: 'free',
      price: 0,
      pricing_mode: 'per_stay',
      included_quantity: 1,
      max_quantity: 1,
      requires_request: true,
      online_bookable: false,
      advance_notice_hours: 0,
      security_deposit: 0,
      notes: '',
      self_service: true,
      reservation_required: false,
    },
    {
      id: 'laundry-detergent',
      kind: 'detergent',
      name: 'Detersivo lavanderia',
      description: 'Capsule o dosi per lavaggio',
      is_active: false,
      charge_mode: 'paid',
      price: 2.5,
      pricing_mode: 'per_item',
      included_quantity: 0,
      max_quantity: 6,
      requires_request: true,
      online_bookable: true,
      advance_notice_hours: 0,
      security_deposit: 0,
      notes: '',
      self_service: true,
      reservation_required: false,
    },
  ],
  kitchen: [
    {
      id: 'kitchen-fridge',
      name: 'Frigorifero',
      category: 'appliance',
      quantity: 1,
      is_active: true,
      included: true,
      notes: '',
    },
    {
      id: 'kitchen-cooktop',
      name: 'Piano cottura',
      category: 'appliance',
      quantity: 1,
      is_active: true,
      included: true,
      notes: '',
    },
    {
      id: 'kitchen-pans',
      name: 'Set pentole e padelle',
      category: 'cookware',
      quantity: 1,
      is_active: true,
      included: true,
      notes: '',
    },
    {
      id: 'kitchen-oven',
      name: 'Forno',
      category: 'appliance',
      quantity: 1,
      is_active: true,
      included: true,
      notes: '',
    },
    {
      id: 'kitchen-microwave',
      name: 'Microonde',
      category: 'small_appliance',
      quantity: 1,
      is_active: true,
      included: true,
      notes: '',
    },
    {
      id: 'kitchen-dishwasher',
      name: 'Lavastoviglie',
      category: 'appliance',
      quantity: 1,
      is_active: true,
      included: true,
      notes: '',
    },
    {
      id: 'kitchen-coffee',
      name: 'Macchina caffe\'',
      category: 'small_appliance',
      quantity: 1,
      is_active: true,
      included: true,
      notes: '',
    },
    {
      id: 'kitchen-kettle',
      name: 'Bollitore',
      category: 'small_appliance',
      quantity: 1,
      is_active: false,
      included: true,
      notes: '',
    },
    {
      id: 'kitchen-toaster',
      name: 'Tostapane',
      category: 'small_appliance',
      quantity: 1,
      is_active: false,
      included: true,
      notes: '',
    },
    {
      id: 'kitchen-cutlery',
      name: 'Posate e stoviglie',
      category: 'tableware',
      quantity: 6,
      is_active: true,
      included: true,
      notes: '',
    },
  ],
  extras: [
    {
      id: 'extra-spa',
      kind: 'spa',
      name: 'Accesso spa',
      description: 'Ingresso all\'area benessere',
      is_active: true,
      charge_mode: 'paid',
      price: 35,
      pricing_mode: 'per_guest',
      included_quantity: 0,
      max_quantity: null,
      requires_request: true,
      online_bookable: true,
      advance_notice_hours: 24,
      security_deposit: 0,
      notes: '',
      reservation_required: true,
      guest_visible: true,
      pool_details: null,
      spa_details: createDefaultSpaDetails(),
      bike_details: null,
      parking_details: null,
      transfer_details: null,
      family_details: null,
      breakfast_details: null,
      beach_details: null,
      workspace_details: null,
    },
    {
      id: 'extra-pool',
      kind: 'pool',
      name: 'Accesso piscina',
      description: 'Uso piscina con regolamento e capienza dedicata',
      is_active: true,
      charge_mode: 'free',
      price: 0,
      pricing_mode: 'per_stay',
      included_quantity: 1,
      max_quantity: null,
      requires_request: false,
      online_bookable: false,
      advance_notice_hours: 0,
      security_deposit: 0,
      notes: '',
      reservation_required: false,
      guest_visible: true,
      pool_details: {
        opening_hours: '09:00 - 19:00',
        heated: false,
        private_access: false,
        seasonal: true,
        children_friendly: true,
        accessories: [
          {
            id: 'pool-sunbed-default',
            kind: 'sunbed',
            name: 'Sdraio piscina',
            description: 'Postazione relax bordo piscina',
            is_active: true,
            charge_mode: 'free',
            price: 0,
            pricing_mode: 'per_item',
            included_quantity: 2,
            max_quantity: 4,
            requires_request: true,
            online_bookable: true,
            advance_notice_hours: 0,
            security_deposit: 0,
            notes: '',
            reservation_required: true,
            guest_visible: true,
          },
          {
            id: 'pool-umbrella-default',
            kind: 'umbrella',
            name: 'Ombrellone piscina',
            description: 'Ombrellone riservabile per area solarium',
            is_active: true,
            charge_mode: 'paid',
            price: 12,
            pricing_mode: 'per_item',
            included_quantity: 0,
            max_quantity: 2,
            requires_request: true,
            online_bookable: true,
            advance_notice_hours: 0,
            security_deposit: 0,
            notes: '',
            reservation_required: true,
            guest_visible: true,
          },
        ],
      },
      spa_details: null,
      bike_details: null,
      parking_details: null,
      transfer_details: null,
      family_details: null,
      breakfast_details: null,
      beach_details: null,
      workspace_details: null,
    },
    {
      id: 'extra-bike',
      kind: 'bike',
      name: 'Noleggio bici',
      description: 'Disponibile in base alla disponibilita\'',
      is_active: true,
      charge_mode: 'paid',
      price: 20,
      pricing_mode: 'per_item',
      included_quantity: 0,
      max_quantity: 4,
      requires_request: true,
      online_bookable: true,
      advance_notice_hours: 12,
      security_deposit: 50,
      notes: '',
      reservation_required: true,
      guest_visible: true,
      pool_details: null,
      spa_details: null,
      bike_details: createDefaultBikeDetails(),
      parking_details: null,
      transfer_details: null,
      family_details: null,
      breakfast_details: null,
      beach_details: null,
      workspace_details: null,
    },
    {
      id: 'extra-parking',
      kind: 'parking',
      name: 'Parcheggio',
      description: 'Posto auto dedicato',
      is_active: true,
      charge_mode: 'free',
      price: 0,
      pricing_mode: 'per_stay',
      included_quantity: 1,
      max_quantity: 1,
      requires_request: true,
      online_bookable: true,
      advance_notice_hours: 0,
      security_deposit: 0,
      notes: '',
      reservation_required: true,
      guest_visible: true,
      pool_details: null,
      spa_details: null,
      bike_details: null,
      parking_details: {
        ...createDefaultParkingDetails(),
        covered: true,
        requires_plate: true,
      },
      transfer_details: null,
      family_details: null,
      breakfast_details: null,
      beach_details: null,
      workspace_details: null,
    },
    {
      id: 'extra-breakfast',
      kind: 'breakfast',
      name: 'Colazione',
      description: 'Colazione in struttura o convenzionata',
      is_active: false,
      charge_mode: 'paid',
      price: 12,
      pricing_mode: 'per_guest',
      included_quantity: 0,
      max_quantity: null,
      requires_request: true,
      online_bookable: true,
      advance_notice_hours: 12,
      security_deposit: 0,
      notes: '',
      reservation_required: true,
      guest_visible: true,
      pool_details: null,
      spa_details: null,
      bike_details: null,
      parking_details: null,
      transfer_details: null,
      family_details: null,
      breakfast_details: createDefaultBreakfastDetails(),
      beach_details: null,
      workspace_details: null,
    },
    {
      id: 'extra-luggage',
      kind: 'luggage_storage',
      name: 'Deposito bagagli',
      description: 'Deposito prima del check-in o dopo il check-out',
      is_active: false,
      charge_mode: 'free',
      price: 0,
      pricing_mode: 'per_stay',
      included_quantity: 1,
      max_quantity: null,
      requires_request: true,
      online_bookable: true,
      advance_notice_hours: 0,
      security_deposit: 0,
      notes: '',
      reservation_required: false,
      guest_visible: true,
      pool_details: null,
      spa_details: null,
      bike_details: null,
      parking_details: null,
      transfer_details: null,
      family_details: null,
      breakfast_details: null,
      beach_details: null,
      workspace_details: null,
    },
    {
      id: 'extra-ev',
      kind: 'ev_charger',
      name: 'Ricarica auto elettrica',
      description: 'Punto di ricarica per veicoli elettrici',
      is_active: false,
      charge_mode: 'paid',
      price: 18,
      pricing_mode: 'per_item',
      included_quantity: 0,
      max_quantity: 1,
      requires_request: true,
      online_bookable: true,
      advance_notice_hours: 2,
      security_deposit: 0,
      notes: '',
      reservation_required: true,
      guest_visible: true,
      pool_details: null,
      spa_details: null,
      bike_details: null,
      parking_details: {
        ...createDefaultParkingDetails(),
        ev_charger: true,
      },
      transfer_details: null,
      family_details: null,
      breakfast_details: null,
      beach_details: null,
      workspace_details: null,
    },
    {
      id: 'extra-family',
      kind: 'baby_kit',
      name: 'Kit famiglia',
      description: 'Culla, seggiolone e accessori bimbo',
      is_active: false,
      charge_mode: 'paid',
      price: 15,
      pricing_mode: 'per_stay',
      included_quantity: 1,
      max_quantity: 1,
      requires_request: true,
      online_bookable: true,
      advance_notice_hours: 12,
      security_deposit: 0,
      notes: '',
      reservation_required: false,
      guest_visible: true,
      pool_details: null,
      spa_details: null,
      bike_details: null,
      parking_details: null,
      transfer_details: null,
      family_details: createDefaultFamilyDetails(),
      breakfast_details: null,
      beach_details: null,
      workspace_details: null,
    },
    {
      id: 'extra-pet-kit',
      kind: 'pet_kit',
      name: 'Kit animali',
      description: 'Ciotole, tappetino e amenities dedicate per pet friendly stay',
      is_active: true,
      charge_mode: 'paid',
      price: 15,
      pricing_mode: 'per_stay',
      included_quantity: 1,
      max_quantity: 1,
      requires_request: true,
      online_bookable: true,
      advance_notice_hours: 12,
      security_deposit: 0,
      notes: '',
      reservation_required: false,
      guest_visible: true,
      pool_details: null,
      spa_details: null,
      bike_details: null,
      parking_details: null,
      transfer_details: null,
      family_details: null,
      breakfast_details: null,
      beach_details: null,
      workspace_details: null,
    },
    {
      id: 'extra-transfer',
      kind: 'transfer',
      name: 'Transfer',
      description: 'Servizio transfer per aeroporto o stazione',
      is_active: false,
      charge_mode: 'paid',
      price: 65,
      pricing_mode: 'per_item',
      included_quantity: 0,
      max_quantity: 1,
      requires_request: true,
      online_bookable: true,
      advance_notice_hours: 24,
      security_deposit: 0,
      notes: '',
      reservation_required: true,
      guest_visible: true,
      pool_details: null,
      spa_details: null,
      bike_details: null,
      parking_details: null,
      transfer_details: createDefaultTransferDetails(),
      family_details: null,
      breakfast_details: null,
      beach_details: null,
      workspace_details: null,
    },
    {
      id: 'extra-beach',
      kind: 'beach_service',
      name: 'Servizio spiaggia',
      description: 'Accesso lido, ombrellone e teli mare',
      is_active: false,
      charge_mode: 'paid',
      price: 25,
      pricing_mode: 'per_day',
      included_quantity: 0,
      max_quantity: null,
      requires_request: true,
      online_bookable: true,
      advance_notice_hours: 12,
      security_deposit: 0,
      notes: '',
      reservation_required: true,
      guest_visible: true,
      pool_details: null,
      spa_details: null,
      bike_details: null,
      parking_details: null,
      transfer_details: null,
      family_details: null,
      breakfast_details: null,
      beach_details: createDefaultBeachDetails(),
      workspace_details: null,
    },
    {
      id: 'extra-coworking',
      kind: 'coworking',
      name: 'Spazio lavoro',
      description: 'Desk dedicato e servizi workation',
      is_active: false,
      charge_mode: 'free',
      price: 0,
      pricing_mode: 'per_day',
      included_quantity: 1,
      max_quantity: 1,
      requires_request: false,
      online_bookable: false,
      advance_notice_hours: 0,
      security_deposit: 0,
      notes: '',
      reservation_required: false,
      guest_visible: true,
      pool_details: null,
      spa_details: null,
      bike_details: null,
      parking_details: null,
      transfer_details: null,
      family_details: null,
      breakfast_details: null,
      beach_details: null,
      workspace_details: createDefaultWorkspaceDetails(),
    },
  ],
}

export const PROPERTY_TYPE_MODULE_DEFINITIONS: Partial<Record<StructurePropertyType, PropertyTypeModuleDefinition[]>> = {
  agriturismo: [
    {
      key: 'farm_experiences',
      title: 'Esperienze agricole',
      description: 'Degustazioni, visite in fattoria, laboratori e attivita\' rurali.',
      item_label: 'esperienza',
      category_options: [
        { value: 'degustation', label: 'Degustazione' },
        { value: 'farm_visit', label: 'Visita in fattoria' },
        { value: 'lab', label: 'Laboratorio' },
        { value: 'product', label: 'Prodotto aziendale' },
        { value: 'other', label: 'Altro' },
      ],
      defaults: [
        createTypeSpecificDefault(
          'agri-degustazione',
          'degustation',
          'Degustazione prodotti aziendali',
          'Esperienza guidata con prodotti della struttura',
          { charge_mode: 'paid', price: 25, pricing_mode: 'per_guest', reservation_required: true }
        ),
        createTypeSpecificDefault(
          'agri-visita',
          'farm_visit',
          'Visita alla fattoria',
          'Tour di stalla, orto o vigneto',
          { charge_mode: 'free', requires_request: true, reservation_required: true }
        ),
      ],
    },
    {
      key: 'rural_facilities',
      title: 'Spazi rurali e dotazioni esterne',
      description: 'Griglia, area picnic, maneggio, orto e altre aree tipiche dell\'agriturismo.',
      item_label: 'dotazione',
      category_options: [
        { value: 'garden', label: 'Giardino / orto' },
        { value: 'bbq', label: 'Barbecue' },
        { value: 'animals', label: 'Area animali' },
        { value: 'wellness', label: 'Benessere outdoor' },
        { value: 'other', label: 'Altro' },
      ],
      defaults: [
        createTypeSpecificDefault(
          'agri-bbq',
          'bbq',
          'Area barbecue',
          'Utilizzo area barbecue con prenotazione',
          { charge_mode: 'free', reservation_required: true }
        ),
        createTypeSpecificDefault(
          'agri-picnic',
          'garden',
          'Area picnic',
          'Postazioni tavolo per ospiti',
          { charge_mode: 'free' }
        ),
      ],
    },
  ],
  casa_vacanze: [
    {
      key: 'apartment_stay_services',
      title: 'Servizi soggiorno casa vacanze',
      description: 'Pulizie extra, kit di consumo, accoglienza e servizi tipici delle case vacanze.',
      item_label: 'servizio',
      category_options: [
        { value: 'cleaning', label: 'Pulizia' },
        { value: 'consumables', label: 'Consumabili' },
        { value: 'checkin', label: 'Accoglienza / check-in' },
        { value: 'maintenance', label: 'Assistenza soggiorno' },
        { value: 'other', label: 'Altro' },
      ],
      defaults: [
        createTypeSpecificDefault(
          'apt-cleaning',
          'cleaning',
          'Pulizia extra in soggiorno',
          'Riassetto o pulizia profonda su richiesta',
          { charge_mode: 'paid', price: 45, pricing_mode: 'per_stay', reservation_required: true }
        ),
        createTypeSpecificDefault(
          'apt-welcome-kit',
          'consumables',
          'Kit benvenuto',
          'Acqua, caffe\', capsule, carta casa',
          { charge_mode: 'free', included_quantity: 1, requires_request: false }
        ),
      ],
    },
  ],
  affittacamere: [
    {
      key: 'guesthouse_services',
      title: 'Servizi affittacamere',
      description: 'Colazione, deposito bagagli e servizi leggeri per struttura camere.',
      item_label: 'servizio',
      category_options: [
        { value: 'breakfast', label: 'Colazione' },
        { value: 'luggage', label: 'Deposito bagagli' },
        { value: 'cleaning', label: 'Riassetto' },
        { value: 'transfer', label: 'Transfer' },
        { value: 'other', label: 'Altro' },
      ],
      defaults: [
        createTypeSpecificDefault(
          'guest-breakfast',
          'breakfast',
          'Colazione convenzionata',
          'Voucher colazione bar o in struttura',
          { charge_mode: 'paid', price: 8, pricing_mode: 'per_guest' }
        ),
        createTypeSpecificDefault(
          'guest-luggage',
          'luggage',
          'Deposito bagagli',
          'Servizio prima del check-in o dopo il check-out',
          { charge_mode: 'free', requires_request: true }
        ),
      ],
    },
  ],
  b_and_b: [
    {
      key: 'bnb_breakfast',
      title: 'Colazione e ospitalita\' B&B',
      description: 'Varianti colazione, fasce orarie e richieste alimentari tipiche del B&B.',
      item_label: 'servizio',
      category_options: [
        { value: 'breakfast', label: 'Colazione' },
        { value: 'dietary', label: 'Esigenze alimentari' },
        { value: 'in_room', label: 'Servizio in camera' },
        { value: 'other', label: 'Altro' },
      ],
      defaults: [
        createTypeSpecificDefault(
          'bnb-breakfast-standard',
          'breakfast',
          'Colazione standard',
          'Servita nella fascia oraria definita',
          { charge_mode: 'free', included_quantity: 1, requires_request: false }
        ),
        createTypeSpecificDefault(
          'bnb-breakfast-special',
          'dietary',
          'Colazione gluten free / veg',
          'Preparazione su richiesta',
          { charge_mode: 'paid', price: 6, pricing_mode: 'per_guest', reservation_required: true }
        ),
      ],
    },
  ],
  residence: [
    {
      key: 'residence_facilities',
      title: 'Servizi residence',
      description: 'Piscina, aree comuni, posti auto e servizi continuativi per soggiorni medi.',
      item_label: 'servizio',
      category_options: [
        { value: 'pool', label: 'Piscina' },
        { value: 'parking', label: 'Parcheggio' },
        { value: 'kids', label: 'Famiglie / bambini' },
        { value: 'common_area', label: 'Aree comuni' },
        { value: 'other', label: 'Altro' },
      ],
      defaults: [
        createTypeSpecificDefault(
          'res-pool',
          'pool',
          'Accesso piscina',
          'Accesso alla piscina del residence',
          { charge_mode: 'free', requires_request: false }
        ),
        createTypeSpecificDefault(
          'res-parking',
          'parking',
          'Posto auto coperto',
          'Assegnazione posto auto su prenotazione',
          { charge_mode: 'paid', price: 10, pricing_mode: 'per_night', reservation_required: true }
        ),
      ],
    },
  ],
  mixed: [
    {
      key: 'mixed_property_services',
      title: 'Servizi struttura mista',
      description: 'Configura i servizi condivisi tra camere e unita\' residence.',
      item_label: 'servizio',
      category_options: [
        { value: 'shared', label: 'Condiviso' },
        { value: 'room_only', label: 'Solo camere' },
        { value: 'apartment_only', label: 'Solo unita\'' },
        { value: 'other', label: 'Altro' },
      ],
      defaults: [
        createTypeSpecificDefault(
          'mixed-luggage',
          'shared',
          'Deposito bagagli centralizzato',
          'Servizio condiviso per tutte le tipologie',
          { charge_mode: 'free', requires_request: true }
        ),
        createTypeSpecificDefault(
          'mixed-cleaning',
          'apartment_only',
          'Pulizia extra unita\' residence',
          'Servizio dedicato alle unita\' con angolo cottura',
          { charge_mode: 'paid', price: 50, pricing_mode: 'per_stay', reservation_required: true }
        ),
      ],
    },
  ],
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function getNullableNumber(value: unknown, fallback: number | null): number | null {
  if (value === null || value === '') return null
  if (typeof value === 'undefined') return fallback
  const parsed = getNumber(value, Number.NaN)
  return Number.isFinite(parsed) ? parsed : fallback
}

function getString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function getBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function normalizeManagedServiceBase<T extends ManagedServiceBase>(item: unknown, fallback: T): T {
  if (!isRecord(item)) return { ...fallback }

  return {
    ...fallback,
    id: getString(item.id, fallback.id),
    name: getString(item.name, fallback.name),
    description: getString(item.description, fallback.description),
    is_active: getBoolean(item.is_active, fallback.is_active),
    charge_mode: item.charge_mode === 'paid' ? 'paid' : 'free',
    price: getNumber(item.price, fallback.price),
    pricing_mode: isPricingMode(item.pricing_mode) ? item.pricing_mode : fallback.pricing_mode,
    included_quantity: Math.max(0, getNumber(item.included_quantity, fallback.included_quantity)),
    max_quantity: getNullableNumber(item.max_quantity, fallback.max_quantity),
    requires_request: getBoolean(item.requires_request, fallback.requires_request),
    online_bookable: getBoolean(item.online_bookable, fallback.online_bookable),
    advance_notice_hours: Math.max(0, getNumber(item.advance_notice_hours, fallback.advance_notice_hours)),
    security_deposit: Math.max(0, getNumber(item.security_deposit, fallback.security_deposit)),
    notes: getString(item.notes, fallback.notes),
  } as T
}

function normalizeLinenItem(item: unknown, fallback: ManagedLinenItem): ManagedLinenItem {
  const base = normalizeManagedServiceBase(item, fallback)
  const record = isRecord(item) ? item : {}

  return {
    ...base,
    kind: isLinenItemType(record.kind) ? record.kind : fallback.kind,
    change_included: getBoolean(record.change_included, fallback.change_included),
  }
}

function normalizeLaundryItem(item: unknown, fallback: ManagedLaundryService): ManagedLaundryService {
  const base = normalizeManagedServiceBase(item, fallback)
  const record = isRecord(item) ? item : {}

  return {
    ...base,
    kind: isLaundryServiceType(record.kind) ? record.kind : fallback.kind,
    self_service: getBoolean(record.self_service, fallback.self_service),
    reservation_required: getBoolean(record.reservation_required, fallback.reservation_required),
  }
}

function normalizeKitchenItem(item: unknown, fallback: ManagedKitchenItem): ManagedKitchenItem {
  if (!isRecord(item)) return { ...fallback }

  return {
    ...fallback,
    id: getString(item.id, fallback.id),
    name: getString(item.name, fallback.name),
    category: isKitchenItemCategory(item.category) ? item.category : fallback.category,
    quantity: Math.max(0, getNumber(item.quantity, fallback.quantity)),
    is_active: getBoolean(item.is_active, fallback.is_active),
    included: getBoolean(item.included, fallback.included),
    notes: getString(item.notes, fallback.notes),
  }
}

function normalizeExtraAmenity(item: unknown, fallback: ManagedExtraAmenity): ManagedExtraAmenity {
  const base = normalizeManagedServiceBase(item, fallback)
  const record = isRecord(item) ? item : {}

  return {
    ...base,
    kind: isExtraAmenityType(record.kind) ? record.kind : fallback.kind,
    reservation_required: getBoolean(record.reservation_required, fallback.reservation_required),
    guest_visible: getBoolean(record.guest_visible, fallback.guest_visible),
    pool_details: normalizePoolDetails(record.pool_details, fallback.pool_details),
    spa_details: normalizeSpaDetails(record.spa_details, fallback.spa_details),
    bike_details: normalizeBikeDetails(record.bike_details, fallback.bike_details),
    parking_details: normalizeParkingDetails(record.parking_details, fallback.parking_details),
    transfer_details: normalizeTransferDetails(record.transfer_details, fallback.transfer_details),
    family_details: normalizeFamilyDetails(record.family_details, fallback.family_details),
    breakfast_details: normalizeBreakfastDetails(record.breakfast_details, fallback.breakfast_details),
    beach_details: normalizeBeachDetails(record.beach_details, fallback.beach_details),
    workspace_details: normalizeWorkspaceDetails(record.workspace_details, fallback.workspace_details),
  }
}

function normalizePoolAccessory(item: unknown, fallback: ManagedPoolAccessory): ManagedPoolAccessory {
  const base = normalizeManagedServiceBase(item, fallback)
  const record = isRecord(item) ? item : {}

  return {
    ...base,
    kind: isPoolAccessoryType(record.kind) ? record.kind : fallback.kind,
    reservation_required: getBoolean(record.reservation_required, fallback.reservation_required),
    guest_visible: getBoolean(record.guest_visible, fallback.guest_visible),
  }
}

function normalizePoolDetails(
  value: unknown,
  fallback: ManagedExtraAmenity['pool_details']
): ManagedExtraAmenity['pool_details'] {
  if (!fallback) {
    if (!isRecord(value)) return null
    return {
      opening_hours: getString(value.opening_hours, ''),
      heated: getBoolean(value.heated, false),
      private_access: getBoolean(value.private_access, false),
      seasonal: getBoolean(value.seasonal, true),
      children_friendly: getBoolean(value.children_friendly, true),
      accessories: normalizeList(
        value.accessories,
        [createManagedPoolAccessory('sunbed')],
        normalizePoolAccessory
      ),
    }
  }

  const record = isRecord(value) ? value : {}
  return {
    opening_hours: getString(record.opening_hours, fallback.opening_hours),
    heated: getBoolean(record.heated, fallback.heated),
    private_access: getBoolean(record.private_access, fallback.private_access),
    seasonal: getBoolean(record.seasonal, fallback.seasonal),
    children_friendly: getBoolean(record.children_friendly, fallback.children_friendly),
    accessories: normalizeList(record.accessories, fallback.accessories, normalizePoolAccessory),
  }
}

function normalizeSpaDetails(
  value: unknown,
  fallback: ManagedExtraAmenity['spa_details']
): ManagedExtraAmenity['spa_details'] {
  if (!fallback) return null
  const record = isRecord(value) ? value : {}

  return {
    opening_hours: getString(record.opening_hours, fallback.opening_hours),
    adults_only: getBoolean(record.adults_only, fallback.adults_only),
    private_access: getBoolean(record.private_access, fallback.private_access),
    treatments_available: getBoolean(record.treatments_available, fallback.treatments_available),
    slot_minutes: getNullableNumber(record.slot_minutes, fallback.slot_minutes),
  }
}

function normalizeBikeDetails(
  value: unknown,
  fallback: ManagedExtraAmenity['bike_details']
): ManagedExtraAmenity['bike_details'] {
  if (!fallback) return null
  const record = isRecord(value) ? value : {}

  return {
    e_bike: getBoolean(record.e_bike, fallback.e_bike),
    helmet_included: getBoolean(record.helmet_included, fallback.helmet_included),
    child_seat: getBoolean(record.child_seat, fallback.child_seat),
    guided_tours: getBoolean(record.guided_tours, fallback.guided_tours),
  }
}

function normalizeParkingDetails(
  value: unknown,
  fallback: ManagedExtraAmenity['parking_details']
): ManagedExtraAmenity['parking_details'] {
  if (!fallback) return null
  const record = isRecord(value) ? value : {}

  return {
    covered: getBoolean(record.covered, fallback.covered),
    indoor: getBoolean(record.indoor, fallback.indoor),
    guarded: getBoolean(record.guarded, fallback.guarded),
    ev_charger: getBoolean(record.ev_charger, fallback.ev_charger),
    requires_plate: getBoolean(record.requires_plate, fallback.requires_plate),
  }
}

function normalizeTransferDetails(
  value: unknown,
  fallback: ManagedExtraAmenity['transfer_details']
): ManagedExtraAmenity['transfer_details'] {
  if (!fallback) return null
  const record = isRecord(value) ? value : {}

  return {
    airport_service: getBoolean(record.airport_service, fallback.airport_service),
    station_service: getBoolean(record.station_service, fallback.station_service),
    private_transfer: getBoolean(record.private_transfer, fallback.private_transfer),
    roundtrip: getBoolean(record.roundtrip, fallback.roundtrip),
  }
}

function normalizeFamilyDetails(
  value: unknown,
  fallback: ManagedExtraAmenity['family_details']
): ManagedExtraAmenity['family_details'] {
  if (!fallback) return null
  const record = isRecord(value) ? value : {}

  return {
    crib: getBoolean(record.crib, fallback.crib),
    high_chair: getBoolean(record.high_chair, fallback.high_chair),
    baby_bath: getBoolean(record.baby_bath, fallback.baby_bath),
    stroller: getBoolean(record.stroller, fallback.stroller),
  }
}

function normalizeBreakfastDetails(
  value: unknown,
  fallback: ManagedExtraAmenity['breakfast_details']
): ManagedExtraAmenity['breakfast_details'] {
  if (!fallback) return null
  const record = isRecord(value) ? value : {}

  return {
    buffet: getBoolean(record.buffet, fallback.buffet),
    in_room: getBoolean(record.in_room, fallback.in_room),
    dietary_options: getBoolean(record.dietary_options, fallback.dietary_options),
  }
}

function normalizeBeachDetails(
  value: unknown,
  fallback: ManagedExtraAmenity['beach_details']
): ManagedExtraAmenity['beach_details'] {
  if (!fallback) return null
  const record = isRecord(value) ? value : {}

  return {
    private_area: getBoolean(record.private_area, fallback.private_area),
    towels_included: getBoolean(record.towels_included, fallback.towels_included),
    seasonal: getBoolean(record.seasonal, fallback.seasonal),
  }
}

function normalizeWorkspaceDetails(
  value: unknown,
  fallback: ManagedExtraAmenity['workspace_details']
): ManagedExtraAmenity['workspace_details'] {
  if (!fallback) return null
  const record = isRecord(value) ? value : {}

  return {
    desk: getBoolean(record.desk, fallback.desk),
    monitor: getBoolean(record.monitor, fallback.monitor),
    printer: getBoolean(record.printer, fallback.printer),
  }
}

function normalizeTypeSpecificItem(item: unknown, fallback: PropertyTypeModuleItem): PropertyTypeModuleItem {
  const base = normalizeManagedServiceBase(item, fallback)
  const record = isRecord(item) ? item : {}

  return {
    ...base,
    category: getString(record.category, fallback.category),
    reservation_required: getBoolean(record.reservation_required, fallback.reservation_required),
    guest_visible: getBoolean(record.guest_visible, fallback.guest_visible),
  }
}

function normalizeList<T>(
  items: unknown,
  fallbacks: T[],
  normalizer: (item: unknown, fallback: T) => T
): T[] {
  if (!Array.isArray(items)) {
    return fallbacks.map((item) => normalizer(item, item))
  }

  return items.map((item, index) => normalizer(item, fallbacks[index] ?? fallbacks[0]!))
}

function isPricingMode(value: unknown): value is ServicePricingMode {
  return ['per_stay', 'per_night', 'per_guest', 'per_item', 'per_hour', 'per_day'].includes(String(value))
}

function isLinenItemType(value: unknown): value is LinenItemType {
  return ['bed_linen', 'bath_linen', 'beach_towel', 'pillows', 'blanket', 'bathrobe', 'slippers', 'other'].includes(String(value))
}

function isLaundryServiceType(value: unknown): value is LaundryServiceType {
  return ['washing_machine', 'dryer', 'iron', 'ironing_board', 'drying_rack', 'laundry_service', 'detergent', 'other'].includes(String(value))
}

function isKitchenItemCategory(value: unknown): value is KitchenItemCategory {
  return ['appliance', 'small_appliance', 'cookware', 'tableware', 'other'].includes(String(value))
}

function isExtraAmenityType(value: unknown): value is ExtraAmenityType {
  return ['spa', 'pool', 'bike', 'parking', 'breakfast', 'gym', 'beach_service', 'luggage_storage', 'coworking', 'ev_charger', 'bbq', 'baby_kit', 'pet_kit', 'transfer', 'other'].includes(String(value))
}

function isPoolAccessoryType(value: unknown): value is PoolAccessoryType {
  return ['sunbed', 'umbrella'].includes(String(value))
}

function isStructurePropertyType(value: PropertyType): value is StructurePropertyType {
  return value !== 'hotel'
}

export function getPropertyTypeModuleDefinitions(propertyType: PropertyType): PropertyTypeModuleDefinition[] {
  if (!isStructurePropertyType(propertyType)) return []
  return PROPERTY_TYPE_MODULE_DEFINITIONS[propertyType] ?? []
}

export function getStructureOperationsSettings(
  settings: Json | null | undefined,
  propertyType: PropertyType
): StructureOperationsSettings {
  const sharedCatalogs = getOperationsSharedCatalogs(settings)
  const root = {
    ...sharedCatalogs,
    property_type_modules: {
      [propertyType]: getPropertyTypeOperationsModule(settings, propertyType),
    },
  }

  const propertyTypeModules =
    isRecord(root.property_type_modules) && isRecord(root.property_type_modules[propertyType])
      ? (root.property_type_modules[propertyType] as UnknownRecord)
      : {}

  const typeSpecific = Object.fromEntries(
    getPropertyTypeModuleDefinitions(propertyType).map((definition) => [
      definition.key,
      normalizeList(
        propertyTypeModules[definition.key],
        definition.defaults,
        normalizeTypeSpecificItem
      ),
    ])
  ) as Record<string, PropertyTypeModuleItem[]>

  const extrasWithoutLegacyStandalone = normalizeSharedExtraAmenities(root.extras)

  return {
    linens: normalizeList(root.linens, DEFAULT_STRUCTURE_OPERATIONS_SETTINGS.linens, normalizeLinenItem),
    laundry: normalizeList(root.laundry, DEFAULT_STRUCTURE_OPERATIONS_SETTINGS.laundry, normalizeLaundryItem),
    kitchen: normalizeList(root.kitchen, DEFAULT_STRUCTURE_OPERATIONS_SETTINGS.kitchen, normalizeKitchenItem),
    extras: extrasWithoutLegacyStandalone,
    type_specific: typeSpecific,
  }
}

export function getSharedExtraAmenitiesSettings(settings: Json | null | undefined): ManagedExtraAmenity[] {
  return normalizeSharedExtraAmenities(getOperationsSharedCatalogs(settings).extras)
}

function normalizeSharedExtraAmenities(items: unknown): ManagedExtraAmenity[] {
  const rawExtras = Array.isArray(items) ? items : []
  const legacyPoolAccessories = rawExtras
    .filter((item) => isRecord(item) && isPoolAccessoryType(item.kind))
    .map((item, index) =>
      normalizePoolAccessory(
        item,
        createManagedPoolAccessory(index % 2 === 0 ? 'sunbed' : 'umbrella')
      )
    )
  const normalizedExtras = normalizeList(
    rawExtras.filter((item) => !(isRecord(item) && isPoolAccessoryType(item.kind))),
    DEFAULT_STRUCTURE_OPERATIONS_SETTINGS.extras,
    normalizeExtraAmenity
  )

  const extrasWithoutLegacyStandalone = normalizedExtras
  const poolIndex = extrasWithoutLegacyStandalone.findIndex((item) => item.kind === 'pool')

  if (legacyPoolAccessories.length > 0 && poolIndex >= 0) {
    const poolItem = extrasWithoutLegacyStandalone[poolIndex]!
    const currentAccessories = poolItem.pool_details?.accessories ?? []
    const existingKinds = new Set(currentAccessories.map((accessory) => accessory.kind))
    extrasWithoutLegacyStandalone[poolIndex] = {
      ...poolItem,
      pool_details: {
        opening_hours: poolItem.pool_details?.opening_hours ?? '',
        heated: poolItem.pool_details?.heated ?? false,
        private_access: poolItem.pool_details?.private_access ?? false,
        seasonal: poolItem.pool_details?.seasonal ?? true,
        children_friendly: poolItem.pool_details?.children_friendly ?? true,
        accessories: [
          ...currentAccessories,
          ...legacyPoolAccessories.filter((accessory) => !existingKinds.has(accessory.kind)),
        ],
      },
    }
  }

  return extrasWithoutLegacyStandalone
}

export function createManagedLinenItem(): ManagedLinenItem {
  return {
    id: `linen-${crypto.randomUUID()}`,
    kind: 'other',
    name: '',
    description: '',
    is_active: true,
    charge_mode: 'free',
    price: 0,
    pricing_mode: 'per_item',
    included_quantity: 0,
    max_quantity: null,
    requires_request: false,
    online_bookable: false,
    advance_notice_hours: 0,
    security_deposit: 0,
    notes: '',
    change_included: false,
  }
}

export function createManagedLaundryService(): ManagedLaundryService {
  return {
    id: `laundry-${crypto.randomUUID()}`,
    kind: 'other',
    name: '',
    description: '',
    is_active: true,
    charge_mode: 'free',
    price: 0,
    pricing_mode: 'per_item',
    included_quantity: 0,
    max_quantity: null,
    requires_request: true,
    online_bookable: false,
    advance_notice_hours: 0,
    security_deposit: 0,
    notes: '',
    self_service: false,
    reservation_required: false,
  }
}

export function createManagedKitchenItem(): ManagedKitchenItem {
  return {
    id: `kitchen-${crypto.randomUUID()}`,
    name: '',
    category: 'other',
    quantity: 1,
    is_active: true,
    included: true,
    notes: '',
  }
}

export function createManagedExtraAmenity(): ManagedExtraAmenity {
  return {
    id: `extra-${crypto.randomUUID()}`,
    kind: 'other',
    name: '',
    description: '',
    is_active: true,
    charge_mode: 'free',
    price: 0,
    pricing_mode: 'per_stay',
    included_quantity: 0,
    max_quantity: null,
    requires_request: true,
    online_bookable: false,
    advance_notice_hours: 0,
    security_deposit: 0,
    notes: '',
    reservation_required: false,
    guest_visible: true,
    pool_details: null,
    spa_details: null,
    bike_details: null,
    parking_details: null,
    transfer_details: null,
    family_details: null,
    breakfast_details: null,
    beach_details: null,
    workspace_details: null,
  }
}

export function applyManagedExtraAmenityKindDefaults(
  item: ManagedExtraAmenity,
  kind: ExtraAmenityType
): ManagedExtraAmenity {
  return {
    ...item,
    kind,
    pool_details: kind === 'pool' ? item.pool_details ?? createDefaultPoolDetails() : null,
    spa_details: kind === 'spa' ? item.spa_details ?? createDefaultSpaDetails() : null,
    bike_details: kind === 'bike' ? item.bike_details ?? createDefaultBikeDetails() : null,
    parking_details:
      kind === 'parking' || kind === 'ev_charger'
        ? item.parking_details ?? createDefaultParkingDetails()
        : null,
    transfer_details: kind === 'transfer' ? item.transfer_details ?? createDefaultTransferDetails() : null,
    family_details: kind === 'baby_kit' ? item.family_details ?? createDefaultFamilyDetails() : null,
    breakfast_details:
      kind === 'breakfast' ? item.breakfast_details ?? createDefaultBreakfastDetails() : null,
    beach_details:
      kind === 'beach_service' ? item.beach_details ?? createDefaultBeachDetails() : null,
    workspace_details:
      kind === 'coworking' ? item.workspace_details ?? createDefaultWorkspaceDetails() : null,
  }
}

export function createManagedPoolAccessory(kind: PoolAccessoryType = 'sunbed'): ManagedPoolAccessory {
  return {
    id: `pool-accessory-${crypto.randomUUID()}`,
    kind,
    name: kind === 'sunbed' ? 'Sdraio piscina' : 'Ombrellone piscina',
    description: '',
    is_active: true,
    charge_mode: 'free',
    price: 0,
    pricing_mode: 'per_item',
    included_quantity: 0,
    max_quantity: null,
    requires_request: true,
    online_bookable: true,
    advance_notice_hours: 0,
    security_deposit: 0,
    notes: '',
    reservation_required: false,
    guest_visible: true,
  }
}

export function createPropertyTypeModuleItem(defaultCategory = 'other'): PropertyTypeModuleItem {
  return {
    id: `module-${crypto.randomUUID()}`,
    category: defaultCategory,
    name: '',
    description: '',
    is_active: true,
    charge_mode: 'free',
    price: 0,
    pricing_mode: 'per_stay',
    included_quantity: 0,
    max_quantity: null,
    requires_request: true,
    online_bookable: false,
    advance_notice_hours: 0,
    security_deposit: 0,
    notes: '',
    reservation_required: false,
    guest_visible: true,
  }
}
