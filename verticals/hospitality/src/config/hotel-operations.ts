import { randomBytes } from 'crypto'
import { getPropertyTypeOperationsModule } from './property-operations'
import type { Json, RoomType } from '../types/database'

export type HotelServiceChargeMode = 'free' | 'paid'
export type HotelServicePricingMode =
  | 'per_stay'
  | 'per_night'
  | 'per_guest'
  | 'per_item'
  | 'per_hour'
  | 'per_day'

export type HotelPropertyServiceKind =
  | 'front_desk_24h'
  | 'concierge'
  | 'room_service'
  | 'restaurant'
  | 'bar'
  | 'shuttle'
  | 'guest_laundry'
  | 'meeting_room'
  | 'business_corner'

export type HotelAddonKind =
  | 'breakfast'
  | 'half_board'
  | 'full_board'
  | 'parking'
  | 'spa_access'
  | 'transfer'
  | 'extra_bed'
  | 'crib'
  | 'pet_fee'
  | 'early_check_in'
  | 'late_check_out'
  | 'minibar_package'

export type HotelLinenKind =
  | 'bed_linen'
  | 'bath_linen'
  | 'bathrobe'
  | 'slippers'
  | 'pillows'
  | 'blanket'

export interface HotelManagedBase {
  id: string
  name: string
  description: string
  is_active: boolean
  charge_mode: HotelServiceChargeMode
  price: number
  pricing_mode: HotelServicePricingMode
  included_quantity: number
  max_quantity: number | null
  requires_request: boolean
  online_bookable: boolean
  advance_notice_hours: number
  security_deposit: number
  guest_visible: boolean
  channel_visible: boolean
  notes: string
}

export interface HotelPropertyService extends HotelManagedBase {
  kind: HotelPropertyServiceKind
  reservation_required: boolean
}

export interface HotelAddonService extends HotelManagedBase {
  kind: HotelAddonKind
  reservation_required: boolean
  booking_engine_visible: boolean
  folio_group: string
}

export interface HotelLinenPolicyItem {
  id: string
  kind: HotelLinenKind
  name: string
  is_active: boolean
  included: boolean
  on_request: boolean
  charge_mode: HotelServiceChargeMode
  price: number
  pricing_mode: HotelServicePricingMode
  quantity_per_room: number
  par_level: number
  notes: string
}

export interface HotelHousekeepingSettings {
  daily_service_included: boolean
  change_towels_every_days: number
  change_linens_every_days: number
  turndown_available: boolean
  eco_program_enabled: boolean
  inspection_required: boolean
  do_not_disturb_supported: boolean
  express_pickup_enabled: boolean
  minibar_check_required: boolean
  service_start_time: string
  service_end_time: string
  linens: HotelLinenPolicyItem[]
}

export interface HotelRoomTypeProfile {
  room_type_id: string
  room_type_name: string
  public_title: string
  public_description: string
  amenity_codes: string[]
  housekeeping_zone: string
  turndown_eligible: boolean
  minibar_enabled: boolean
  pillow_menu_available: boolean
  guest_visible: boolean
}

export interface HotelRoomFeatureDefinition {
  code: string
  label: string
  description: string
}

export interface HotelOperationsSettings {
  property_services: HotelPropertyService[]
  sellable_addons: HotelAddonService[]
  housekeeping: HotelHousekeepingSettings
  room_type_profiles: HotelRoomTypeProfile[]
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function getNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function getBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function getNullableNumber(value: unknown): number | null {
  if (value === null) return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function createBaseId(prefix: string) {
  return `${prefix}-${randomBytes(6).toString('hex')}`
}

const defaultBase: Omit<HotelManagedBase, 'id' | 'name' | 'description' | 'guest_visible' | 'channel_visible'> = {
  is_active: true,
  charge_mode: 'free',
  price: 0,
  pricing_mode: 'per_stay',
  included_quantity: 0,
  max_quantity: null,
  requires_request: false,
  online_bookable: false,
  advance_notice_hours: 0,
  security_deposit: 0,
  notes: '',
}

export const HOTEL_ROOM_FEATURE_DEFINITIONS: HotelRoomFeatureDefinition[] = [
  { code: 'wifi', label: 'WiFi', description: 'Connessione internet in camera' },
  { code: 'tv', label: 'TV', description: 'TV in camera' },
  { code: 'streaming_tv', label: 'Smart TV', description: 'TV con streaming' },
  { code: 'air_conditioning', label: 'Aria condizionata', description: 'Climatizzazione camera' },
  { code: 'heating', label: 'Riscaldamento', description: 'Riscaldamento dedicato' },
  { code: 'minibar', label: 'Minibar', description: 'Minibar in camera' },
  { code: 'safe', label: 'Cassaforte', description: 'Cassaforte in camera' },
  { code: 'coffee_machine', label: 'Set caffe\'', description: 'Macchina caffe\' o kettle' },
  { code: 'hairdryer', label: 'Asciugacapelli', description: 'Phon in camera o bagno' },
  { code: 'soap_shampoo', label: 'Set cortesia', description: 'Amenities bagno' },
  { code: 'private_bathroom', label: 'Bagno privato', description: 'Bagno privato in camera' },
  { code: 'soundproof_room', label: 'Insonorizzata', description: 'Camera insonorizzata' },
  { code: 'balcony_terrace', label: 'Balcone / terrazza', description: 'Spazio esterno privato' },
  { code: 'view', label: 'Vista', description: 'Vista panoramica o tematizzata' },
  { code: 'dedicated_workspace', label: 'Scrivania', description: 'Postazione lavoro in camera' },
  { code: 'bed_linen', label: 'Biancheria letto', description: 'Lenzuola incluse' },
  { code: 'towels', label: 'Asciugamani', description: 'Set asciugamani inclusi' },
  { code: 'extra_pillows', label: 'Menu cuscini', description: 'Cuscini extra o pillow menu' },
  { code: 'bathrobe', label: 'Accappatoio', description: 'Accappatoio disponibile' },
  { code: 'slippers', label: 'Ciabattine', description: 'Ciabattine ospite' },
  { code: 'family_friendly', label: 'Family room', description: 'Camera adatta a famiglie' },
  { code: 'accessible_room', label: 'Accessibile', description: 'Camera accessibile / barrier free' },
  { code: 'non_smoking', label: 'Non fumatori', description: 'Camera non fumatori' },
]

function createPropertyService(
  kind: HotelPropertyServiceKind,
  name: string,
  description: string,
  overrides: Partial<HotelPropertyService> = {}
): HotelPropertyService {
  return {
    id: createBaseId(`hotel-service-${kind}`),
    kind,
    name,
    description,
    guest_visible: true,
    channel_visible: true,
    reservation_required: false,
    ...defaultBase,
    ...overrides,
  }
}

function createAddon(
  kind: HotelAddonKind,
  name: string,
  description: string,
  overrides: Partial<HotelAddonService> = {}
): HotelAddonService {
  return {
    id: createBaseId(`hotel-addon-${kind}`),
    kind,
    name,
    description,
    guest_visible: true,
    channel_visible: false,
    reservation_required: false,
    booking_engine_visible: true,
    folio_group: 'extra_service',
    ...defaultBase,
    online_bookable: true,
    ...overrides,
  }
}

function createLinenItem(
  kind: HotelLinenKind,
  name: string,
  quantityPerRoom: number,
  overrides: Partial<HotelLinenPolicyItem> = {}
): HotelLinenPolicyItem {
  return {
    id: createBaseId(`hotel-linen-${kind}`),
    kind,
    name,
    is_active: true,
    included: true,
    on_request: false,
    charge_mode: 'free',
    price: 0,
    pricing_mode: 'per_stay',
    quantity_per_room: quantityPerRoom,
    par_level: quantityPerRoom * 3,
    notes: '',
    ...overrides,
  }
}

export function createHotelPropertyService(kind: HotelPropertyServiceKind = 'front_desk_24h') {
  return createPropertyService(kind, 'Nuovo servizio hotel', 'Servizio hotel collegato alla struttura.')
}

export function createHotelAddon(kind: HotelAddonKind = 'breakfast') {
  return createAddon(kind, 'Nuovo add-on', 'Extra vendibile nel PMS e nel booking engine.')
}

export function createHotelLinenItem(kind: HotelLinenKind = 'bed_linen') {
  return createLinenItem(kind, 'Nuova dotazione biancheria', 1)
}

export const DEFAULT_HOTEL_OPERATIONS_SETTINGS: HotelOperationsSettings = {
  property_services: [
    createPropertyService('front_desk_24h', 'Reception 24h', 'Reception sempre disponibile.', {
      guest_visible: true,
      channel_visible: true,
    }),
    createPropertyService('concierge', 'Concierge', 'Assistenza ospiti e supporto dedicato.', {
      charge_mode: 'free',
      guest_visible: true,
      channel_visible: true,
    }),
    createPropertyService('room_service', 'Room service', 'Servizio in camera con orario dedicato.', {
      charge_mode: 'paid',
      pricing_mode: 'per_item',
      online_bookable: false,
    }),
    createPropertyService('restaurant', 'Ristorante', 'Servizio ristorazione interno all’hotel.', {
      charge_mode: 'free',
      guest_visible: true,
      channel_visible: true,
    }),
    createPropertyService('bar', 'Bar', 'Bar o lounge interno alla struttura.', {
      charge_mode: 'free',
      guest_visible: true,
      channel_visible: true,
    }),
    createPropertyService('shuttle', 'Navetta hotel', 'Navetta programmata della struttura.', {
      charge_mode: 'paid',
      pricing_mode: 'per_stay',
      reservation_required: true,
    }),
    createPropertyService('guest_laundry', 'Lavanderia ospiti', 'Servizio lavanderia o supporto ospiti.', {
      charge_mode: 'paid',
      pricing_mode: 'per_item',
      reservation_required: false,
    }),
  ],
  sellable_addons: [
    createAddon('breakfast', 'Colazione', 'Colazione vendibile separatamente.', {
      pricing_mode: 'per_guest',
      charge_mode: 'paid',
      folio_group: 'restaurant',
    }),
    createAddon('parking', 'Posto auto', 'Parcheggio come add-on prenotabile.', {
      pricing_mode: 'per_night',
      charge_mode: 'paid',
    }),
    createAddon('spa_access', 'Accesso spa', 'Ingresso spa per ospite o per coppia.', {
      pricing_mode: 'per_guest',
      charge_mode: 'paid',
      reservation_required: true,
    }),
    createAddon('late_check_out', 'Late check-out', 'Uscita posticipata gestita dal front office.', {
      pricing_mode: 'per_stay',
      charge_mode: 'paid',
    }),
    createAddon('early_check_in', 'Early check-in', 'Arrivo anticipato su disponibilita\'.', {
      pricing_mode: 'per_stay',
      charge_mode: 'paid',
    }),
    createAddon('extra_bed', 'Letto extra', 'Letto aggiuntivo collegato alla prenotazione.', {
      pricing_mode: 'per_night',
      charge_mode: 'paid',
      max_quantity: 1,
    }),
    createAddon('crib', 'Culla', 'Culla o lettino bimbo.', {
      pricing_mode: 'per_stay',
      charge_mode: 'free',
      max_quantity: 1,
    }),
  ],
  housekeeping: {
    daily_service_included: true,
    change_towels_every_days: 1,
    change_linens_every_days: 3,
    turndown_available: false,
    eco_program_enabled: true,
    inspection_required: true,
    do_not_disturb_supported: true,
    express_pickup_enabled: true,
    minibar_check_required: true,
    service_start_time: '08:30',
    service_end_time: '16:30',
    linens: [
      createLinenItem('bed_linen', 'Set lenzuola', 1),
      createLinenItem('bath_linen', 'Set asciugamani', 2),
      createLinenItem('bathrobe', 'Accappatoio', 0, { included: false, on_request: true }),
      createLinenItem('slippers', 'Ciabattine', 1),
      createLinenItem('pillows', 'Cuscini extra', 0, { included: false, on_request: true }),
    ],
  },
  room_type_profiles: [],
}

function normalizePropertyService(value: unknown): HotelPropertyService | null {
  if (!isRecord(value)) return null

  return {
    id: getString(value.id, createBaseId('hotel-service')),
    kind: getString(value.kind, 'front_desk_24h') as HotelPropertyServiceKind,
    name: getString(value.name, 'Servizio hotel'),
    description: getString(value.description),
    is_active: getBoolean(value.is_active, true),
    charge_mode: getString(value.charge_mode, 'free') as HotelServiceChargeMode,
    price: getNumber(value.price),
    pricing_mode: getString(value.pricing_mode, 'per_stay') as HotelServicePricingMode,
    included_quantity: getNumber(value.included_quantity),
    max_quantity: getNullableNumber(value.max_quantity),
    requires_request: getBoolean(value.requires_request),
    online_bookable: getBoolean(value.online_bookable),
    advance_notice_hours: getNumber(value.advance_notice_hours),
    security_deposit: getNumber(value.security_deposit),
    guest_visible: getBoolean(value.guest_visible, true),
    channel_visible: getBoolean(value.channel_visible, true),
    reservation_required: getBoolean(value.reservation_required),
    notes: getString(value.notes),
  }
}

function normalizeAddon(value: unknown): HotelAddonService | null {
  if (!isRecord(value)) return null

  return {
    id: getString(value.id, createBaseId('hotel-addon')),
    kind: getString(value.kind, 'breakfast') as HotelAddonKind,
    name: getString(value.name, 'Add-on'),
    description: getString(value.description),
    is_active: getBoolean(value.is_active, true),
    charge_mode: getString(value.charge_mode, 'free') as HotelServiceChargeMode,
    price: getNumber(value.price),
    pricing_mode: getString(value.pricing_mode, 'per_stay') as HotelServicePricingMode,
    included_quantity: getNumber(value.included_quantity),
    max_quantity: getNullableNumber(value.max_quantity),
    requires_request: getBoolean(value.requires_request),
    online_bookable: getBoolean(value.online_bookable, true),
    advance_notice_hours: getNumber(value.advance_notice_hours),
    security_deposit: getNumber(value.security_deposit),
    guest_visible: getBoolean(value.guest_visible, true),
    channel_visible: getBoolean(value.channel_visible),
    reservation_required: getBoolean(value.reservation_required),
    booking_engine_visible: getBoolean(value.booking_engine_visible, true),
    folio_group: getString(value.folio_group, 'extra_service'),
    notes: getString(value.notes),
  }
}

function normalizeLinenItem(value: unknown): HotelLinenPolicyItem | null {
  if (!isRecord(value)) return null

  return {
    id: getString(value.id, createBaseId('hotel-linen')),
    kind: getString(value.kind, 'bed_linen') as HotelLinenKind,
    name: getString(value.name, 'Dotazione biancheria'),
    is_active: getBoolean(value.is_active, true),
    included: getBoolean(value.included, true),
    on_request: getBoolean(value.on_request),
    charge_mode: getString(value.charge_mode, 'free') as HotelServiceChargeMode,
    price: getNumber(value.price),
    pricing_mode: getString(value.pricing_mode, 'per_stay') as HotelServicePricingMode,
    quantity_per_room: getNumber(value.quantity_per_room, 1),
    par_level: getNumber(value.par_level, 3),
    notes: getString(value.notes),
  }
}

function normalizeRoomTypeProfile(value: unknown, roomTypeById: Map<string, RoomType>): HotelRoomTypeProfile | null {
  if (!isRecord(value)) return null

  const roomTypeId = getString(value.room_type_id)
  if (!roomTypeId) return null

  const roomType = roomTypeById.get(roomTypeId)

  return {
    room_type_id: roomTypeId,
    room_type_name: getString(value.room_type_name, roomType?.name ?? 'Tipologia camera'),
    public_title: getString(value.public_title, roomType?.name ?? ''),
    public_description: getString(value.public_description, roomType?.description ?? ''),
    amenity_codes: getStringArray(value.amenity_codes).filter((code) =>
      HOTEL_ROOM_FEATURE_DEFINITIONS.some((definition) => definition.code === code)
    ),
    housekeeping_zone: getString(value.housekeeping_zone),
    turndown_eligible: getBoolean(value.turndown_eligible),
    minibar_enabled: getBoolean(value.minibar_enabled),
    pillow_menu_available: getBoolean(value.pillow_menu_available),
    guest_visible: getBoolean(value.guest_visible, true),
  }
}

function createRoomTypeProfileFromRoomType(roomType: RoomType): HotelRoomTypeProfile {
  const amenityLabels = Array.isArray(roomType.amenities)
    ? roomType.amenities.filter((item): item is string => typeof item === 'string')
    : []

  const amenityCodes = HOTEL_ROOM_FEATURE_DEFINITIONS
    .filter((definition) => amenityLabels.includes(definition.label))
    .map((definition) => definition.code)

  return {
    room_type_id: roomType.id,
    room_type_name: roomType.name,
    public_title: roomType.name,
    public_description: roomType.description ?? '',
    amenity_codes: amenityCodes,
    housekeeping_zone: roomType.floor_range ?? '',
    turndown_eligible: false,
    minibar_enabled: amenityCodes.includes('minibar'),
    pillow_menu_available: amenityCodes.includes('extra_pillows'),
    guest_visible: true,
  }
}

export function getHotelOperationsSettings(
  settings: Json | null | undefined,
  roomTypes: RoomType[] = []
): HotelOperationsSettings {
  const root = getPropertyTypeOperationsModule(settings, 'hotel')
  const roomTypeById = new Map(roomTypes.map((roomType) => [roomType.id, roomType]))

  const propertyServices = Array.isArray(root.property_services)
    ? root.property_services
      .map((value) => normalizePropertyService(value))
      .filter((value): value is HotelPropertyService => Boolean(value))
    : DEFAULT_HOTEL_OPERATIONS_SETTINGS.property_services

  const sellableAddons = Array.isArray(root.sellable_addons)
    ? root.sellable_addons
      .map((value) => normalizeAddon(value))
      .filter((value): value is HotelAddonService => Boolean(value))
    : DEFAULT_HOTEL_OPERATIONS_SETTINGS.sellable_addons

  const housekeepingRoot = isRecord(root.housekeeping) ? root.housekeeping : {}
  const housekeeping: HotelHousekeepingSettings = {
    daily_service_included: getBoolean(
      housekeepingRoot.daily_service_included,
      DEFAULT_HOTEL_OPERATIONS_SETTINGS.housekeeping.daily_service_included
    ),
    change_towels_every_days: getNumber(
      housekeepingRoot.change_towels_every_days,
      DEFAULT_HOTEL_OPERATIONS_SETTINGS.housekeeping.change_towels_every_days
    ),
    change_linens_every_days: getNumber(
      housekeepingRoot.change_linens_every_days,
      DEFAULT_HOTEL_OPERATIONS_SETTINGS.housekeeping.change_linens_every_days
    ),
    turndown_available: getBoolean(
      housekeepingRoot.turndown_available,
      DEFAULT_HOTEL_OPERATIONS_SETTINGS.housekeeping.turndown_available
    ),
    eco_program_enabled: getBoolean(
      housekeepingRoot.eco_program_enabled,
      DEFAULT_HOTEL_OPERATIONS_SETTINGS.housekeeping.eco_program_enabled
    ),
    inspection_required: getBoolean(
      housekeepingRoot.inspection_required,
      DEFAULT_HOTEL_OPERATIONS_SETTINGS.housekeeping.inspection_required
    ),
    do_not_disturb_supported: getBoolean(
      housekeepingRoot.do_not_disturb_supported,
      DEFAULT_HOTEL_OPERATIONS_SETTINGS.housekeeping.do_not_disturb_supported
    ),
    express_pickup_enabled: getBoolean(
      housekeepingRoot.express_pickup_enabled,
      DEFAULT_HOTEL_OPERATIONS_SETTINGS.housekeeping.express_pickup_enabled
    ),
    minibar_check_required: getBoolean(
      housekeepingRoot.minibar_check_required,
      DEFAULT_HOTEL_OPERATIONS_SETTINGS.housekeeping.minibar_check_required
    ),
    service_start_time: getString(
      housekeepingRoot.service_start_time,
      DEFAULT_HOTEL_OPERATIONS_SETTINGS.housekeeping.service_start_time
    ),
    service_end_time: getString(
      housekeepingRoot.service_end_time,
      DEFAULT_HOTEL_OPERATIONS_SETTINGS.housekeeping.service_end_time
    ),
    linens: Array.isArray(housekeepingRoot.linens)
      ? housekeepingRoot.linens
        .map((value) => normalizeLinenItem(value))
        .filter((value): value is HotelLinenPolicyItem => Boolean(value))
      : DEFAULT_HOTEL_OPERATIONS_SETTINGS.housekeeping.linens,
  }

  const savedProfiles = Array.isArray(root.room_type_profiles)
    ? root.room_type_profiles
      .map((value) => normalizeRoomTypeProfile(value, roomTypeById))
      .filter((value): value is HotelRoomTypeProfile => Boolean(value))
    : []

  const roomTypeProfiles = roomTypes.map((roomType) => {
    return savedProfiles.find((profile) => profile.room_type_id === roomType.id)
      ?? createRoomTypeProfileFromRoomType(roomType)
  })

  return {
    property_services: propertyServices,
    sellable_addons: sellableAddons,
    housekeeping,
    room_type_profiles: roomTypeProfiles,
  }
}

export function getHotelRoomFeatureDefinitions() {
  return HOTEL_ROOM_FEATURE_DEFINITIONS
}

export function getHotelRoomAmenityLabels(codes: string[]): string[] {
  return codes
    .map((code) => {
      const fromHotelFeatures = HOTEL_ROOM_FEATURE_DEFINITIONS.find((definition) => definition.code === code)
      return fromHotelFeatures?.label ?? code
    })
    .filter((label, index, list) => list.indexOf(label) === index)
}

export function buildHotelAmenitySuggestionCodes(settings: HotelOperationsSettings, sharedExtras: Array<{ kind: string; is_active: boolean; parking_details?: { ev_charger?: boolean; covered?: boolean } | null; bike_details?: { e_bike?: boolean } | null; pool_details?: { accessories?: Array<{ is_active: boolean; kind: string }> } | null }> = []): string[] {
  const suggestions = new Set<string>()

  settings.property_services.forEach((service) => {
    if (!service.is_active) return
    if (service.kind === 'front_desk_24h') suggestions.add('front_desk_24h')
    if (service.kind === 'concierge') suggestions.add('concierge')
    if (service.kind === 'room_service') suggestions.add('room_service')
    if (service.kind === 'restaurant') suggestions.add('restaurant')
    if (service.kind === 'bar') suggestions.add('bar')
    if (service.kind === 'shuttle') suggestions.add('airport_shuttle')
    if (service.kind === 'business_corner' || service.kind === 'meeting_room') suggestions.add('dedicated_workspace')
  })

  settings.sellable_addons.forEach((addon) => {
    if (!addon.is_active) return
    if (addon.kind === 'breakfast') suggestions.add('breakfast')
    if (addon.kind === 'parking') suggestions.add('parking')
    if (addon.kind === 'spa_access') suggestions.add('spa')
    if (addon.kind === 'transfer') suggestions.add('airport_shuttle')
    if (addon.kind === 'crib') suggestions.add('crib')
    if (addon.kind === 'extra_bed') suggestions.add('family_friendly')
    if (addon.kind === 'pet_fee') suggestions.add('pets_allowed')
  })

  settings.housekeeping.linens.forEach((linen) => {
    if (!linen.is_active || !linen.included) return
    if (linen.kind === 'bed_linen') suggestions.add('bed_linen')
    if (linen.kind === 'bath_linen') suggestions.add('towels')
    if (linen.kind === 'pillows') suggestions.add('extra_pillows')
    if (linen.kind === 'bathrobe') suggestions.add('bathrobe')
    if (linen.kind === 'slippers') suggestions.add('slippers')
  })

  settings.room_type_profiles.forEach((profile) => {
    profile.amenity_codes.forEach((code) => suggestions.add(code))
  })

  sharedExtras.forEach((item) => {
    if (!item.is_active) return
    if (item.kind === 'parking') suggestions.add('parking')
    if (item.kind === 'pool') {
      suggestions.add('pool')
      item.pool_details?.accessories?.forEach((accessory) => {
        if (!accessory.is_active) return
        if (accessory.kind === 'sunbed') suggestions.add('sunbeds')
        if (accessory.kind === 'umbrella') suggestions.add('umbrellas')
      })
    }
    if (item.kind === 'spa') suggestions.add('spa')
    if (item.kind === 'bike') suggestions.add('bicycles')
    if (item.kind === 'breakfast') suggestions.add('breakfast')
    if (item.kind === 'luggage_storage') suggestions.add('luggage_storage')
    if (item.kind === 'transfer') suggestions.add('airport_shuttle')
    if (item.kind === 'beach_service') suggestions.add('beach_access')
    if (item.kind === 'coworking') suggestions.add('dedicated_workspace')
    if (item.kind === 'bbq') suggestions.add('bbq')
    if (item.kind === 'baby_kit') {
      suggestions.add('crib')
      suggestions.add('high_chair')
      suggestions.add('family_friendly')
    }
    if (item.kind === 'pet_kit') suggestions.add('pet_kit')
    if (item.kind === 'gym') suggestions.add('gym')
    if (item.kind === 'ev_charger') suggestions.add('ev_charger')
    if (item.kind === 'parking' && item.parking_details?.ev_charger) suggestions.add('ev_charger')
    if (item.kind === 'bike' && item.bike_details?.e_bike) suggestions.add('bicycles')
    if (item.kind === 'parking' && item.parking_details?.covered) suggestions.add('parking')
  })

  return Array.from(suggestions)
}
