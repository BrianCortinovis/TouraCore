import { getNonHotelOperationsSettings, getSharedExtraAmenitiesSettings } from './non-hotel-operations'
import { buildHotelAmenitySuggestionCodes, getHotelOperationsSettings } from './hotel-operations'
import { getPropertyTypeOperationsProfile } from './property-operations'
import type { Json, Property } from '../types/database'

export type ListingAmenityCategory =
  | 'bedroom'
  | 'bathroom'
  | 'kitchen'
  | 'comfort'
  | 'outdoor'
  | 'services'
  | 'family'
  | 'transport'
  | 'rules'

export interface ListingAmenityDefinition {
  code: string
  label: string
  description: string
  category: ListingAmenityCategory
  ota_mapping: {
    booking: string
    airbnb: string
    holidu: string
  }
}

export interface ListingProfileSettings {
  public_title: string
  short_description: string
  long_description: string
  arrival_instructions: string
  check_out_instructions: string
  house_rules: string
  cancellation_summary: string
  amenity_codes: string[]
  ota_notes: string
}

export interface ListingReadiness {
  score: number
  completed: number
  total: number
  missing: string[]
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export const LISTING_AMENITY_DEFINITIONS: ListingAmenityDefinition[] = [
  {
    code: 'front_desk_24h',
    label: 'Reception 24h',
    description: 'Reception sempre attiva o disponibile H24.',
    category: 'services',
    ota_mapping: { booking: '24-hour front desk', airbnb: 'Host greets you', holidu: 'Reception 24h' },
  },
  {
    code: 'concierge',
    label: 'Concierge',
    description: 'Servizio concierge e assistenza ospiti.',
    category: 'services',
    ota_mapping: { booking: 'Concierge service', airbnb: 'Host assistance', holidu: 'Concierge' },
  },
  {
    code: 'room_service',
    label: 'Room service',
    description: 'Servizio in camera disponibile in hotel.',
    category: 'services',
    ota_mapping: { booking: 'Room service', airbnb: 'Room service', holidu: 'Room service' },
  },
  {
    code: 'restaurant',
    label: 'Ristorante',
    description: 'Ristorante presente in struttura.',
    category: 'services',
    ota_mapping: { booking: 'Restaurant', airbnb: 'Restaurant', holidu: 'Ristorante' },
  },
  {
    code: 'bar',
    label: 'Bar',
    description: 'Bar o lounge bar in struttura.',
    category: 'services',
    ota_mapping: { booking: 'Bar', airbnb: 'Bar', holidu: 'Bar' },
  },
  {
    code: 'minibar',
    label: 'Minibar',
    description: 'Minibar disponibile in camera.',
    category: 'comfort',
    ota_mapping: { booking: 'Minibar', airbnb: 'Mini fridge', holidu: 'Minibar' },
  },
  {
    code: 'safe',
    label: 'Cassaforte',
    description: 'Cassaforte in camera.',
    category: 'comfort',
    ota_mapping: { booking: 'Safety deposit box', airbnb: 'Safe', holidu: 'Cassaforte' },
  },
  {
    code: 'private_bathroom',
    label: 'Bagno privato',
    description: 'Bagno privato in camera o suite.',
    category: 'bathroom',
    ota_mapping: { booking: 'Private bathroom', airbnb: 'Private bathroom', holidu: 'Bagno privato' },
  },
  {
    code: 'soundproof_room',
    label: 'Camera insonorizzata',
    description: 'Camera con isolamento acustico.',
    category: 'comfort',
    ota_mapping: { booking: 'Soundproofing', airbnb: 'Soundproof', holidu: 'Insonorizzata' },
  },
  {
    code: 'bathrobe',
    label: 'Accappatoio',
    description: 'Accappatoio disponibile in camera.',
    category: 'bathroom',
    ota_mapping: { booking: 'Bathrobe', airbnb: 'Bathrobe', holidu: 'Accappatoio' },
  },
  {
    code: 'slippers',
    label: 'Ciabattine',
    description: 'Ciabattine disponibili per l’ospite.',
    category: 'bathroom',
    ota_mapping: { booking: 'Slippers', airbnb: 'Slippers', holidu: 'Ciabattine' },
  },
  {
    code: 'accessible_room',
    label: 'Camera accessibile',
    description: 'Camera o unita` accessibile.',
    category: 'comfort',
    ota_mapping: { booking: 'Entire unit wheelchair accessible', airbnb: 'Accessible room', holidu: 'Accessibile' },
  },
  {
    code: 'non_smoking',
    label: 'Camera non fumatori',
    description: 'Camera non fumatori o area smoke-free.',
    category: 'rules',
    ota_mapping: { booking: 'Non-smoking rooms', airbnb: 'Smoking allowed: no', holidu: 'Non fumatori' },
  },
  {
    code: 'bed_linen',
    label: 'Lenzuola incluse',
    description: 'Set lenzuola e federe standard pronto all\'arrivo.',
    category: 'bedroom',
    ota_mapping: { booking: 'Bed linen', airbnb: 'Essentials', holidu: 'Lenzuola incluse' },
  },
  {
    code: 'towels',
    label: 'Asciugamani',
    description: 'Set asciugamani bagno disponibili per gli ospiti.',
    category: 'bathroom',
    ota_mapping: { booking: 'Towels', airbnb: 'Essentials', holidu: 'Asciugamani' },
  },
  {
    code: 'blankets',
    label: 'Coperte',
    description: 'Coperte aggiuntive o plaid disponibili.',
    category: 'bedroom',
    ota_mapping: { booking: 'Blankets', airbnb: 'Extra pillows and blankets', holidu: 'Coperte' },
  },
  {
    code: 'extra_pillows',
    label: 'Cuscini extra',
    description: 'Cuscini supplementari richiedibili.',
    category: 'bedroom',
    ota_mapping: { booking: 'Extra pillows and blankets', airbnb: 'Extra pillows and blankets', holidu: 'Cuscini extra' },
  },
  {
    code: 'hairdryer',
    label: 'Asciugacapelli',
    description: 'Phon disponibile nel bagno.',
    category: 'bathroom',
    ota_mapping: { booking: 'Hairdryer', airbnb: 'Hair dryer', holidu: 'Asciugacapelli' },
  },
  {
    code: 'soap_shampoo',
    label: 'Sapone e shampoo',
    description: 'Amenities bagno base fornite all\'arrivo.',
    category: 'bathroom',
    ota_mapping: { booking: 'Free toiletries', airbnb: 'Shampoo', holidu: 'Sapone e shampoo' },
  },
  {
    code: 'toilet_paper',
    label: 'Carta igienica',
    description: 'Fornitura iniziale di carta igienica.',
    category: 'bathroom',
    ota_mapping: { booking: 'Toilet paper', airbnb: 'Essentials', holidu: 'Carta igienica' },
  },
  {
    code: 'kitchen_utensils',
    label: 'Utensili cucina',
    description: 'Set utensili, posate e stoviglie.',
    category: 'kitchen',
    ota_mapping: { booking: 'Kitchenware', airbnb: 'Kitchen', holidu: 'Utensili cucina' },
  },
  {
    code: 'dishwasher',
    label: 'Lavastoviglie',
    description: 'Lavastoviglie disponibile nella struttura.',
    category: 'kitchen',
    ota_mapping: { booking: 'Dishwasher', airbnb: 'Dishwasher', holidu: 'Lavastoviglie' },
  },
  {
    code: 'microwave',
    label: 'Microonde',
    description: 'Forno microonde disponibile.',
    category: 'kitchen',
    ota_mapping: { booking: 'Microwave', airbnb: 'Microwave', holidu: 'Microonde' },
  },
  {
    code: 'washing_machine',
    label: 'Lavatrice',
    description: 'Lavatrice ad uso ospiti o a richiesta.',
    category: 'services',
    ota_mapping: { booking: 'Washing machine', airbnb: 'Washer', holidu: 'Lavatrice' },
  },
  {
    code: 'coffee_machine',
    label: 'Macchina caffe\'',
    description: 'Macchina caffe\' o capsule disponibile.',
    category: 'kitchen',
    ota_mapping: { booking: 'Coffee machine', airbnb: 'Coffee maker', holidu: 'Macchina caffe\'' },
  },
  {
    code: 'fridge',
    label: 'Frigorifero',
    description: 'Frigorifero o frigorifero con freezer.',
    category: 'kitchen',
    ota_mapping: { booking: 'Refrigerator', airbnb: 'Refrigerator', holidu: 'Frigorifero' },
  },
  {
    code: 'wifi',
    label: 'WiFi',
    description: 'Connessione internet disponibile.',
    category: 'comfort',
    ota_mapping: { booking: 'WiFi', airbnb: 'Wifi', holidu: 'WiFi' },
  },
  {
    code: 'tv',
    label: 'TV',
    description: 'Televisore in struttura.',
    category: 'comfort',
    ota_mapping: { booking: 'TV', airbnb: 'TV', holidu: 'TV' },
  },
  {
    code: 'air_conditioning',
    label: 'Aria condizionata',
    description: 'Climatizzazione presente.',
    category: 'comfort',
    ota_mapping: { booking: 'Air conditioning', airbnb: 'Air conditioning', holidu: 'Aria condizionata' },
  },
  {
    code: 'heating',
    label: 'Riscaldamento',
    description: 'Riscaldamento disponibile.',
    category: 'comfort',
    ota_mapping: { booking: 'Heating', airbnb: 'Heating', holidu: 'Riscaldamento' },
  },
  {
    code: 'parking',
    label: 'Parcheggio',
    description: 'Parcheggio riservato o disponibile in loco.',
    category: 'outdoor',
    ota_mapping: { booking: 'Parking', airbnb: 'Free parking on premises', holidu: 'Parcheggio' },
  },
  {
    code: 'pool',
    label: 'Piscina',
    description: 'Piscina stagionale o annuale.',
    category: 'outdoor',
    ota_mapping: { booking: 'Swimming pool', airbnb: 'Pool', holidu: 'Piscina' },
  },
  {
    code: 'spa',
    label: 'Spa / wellness',
    description: 'Accesso wellness o spa disponibile.',
    category: 'services',
    ota_mapping: { booking: 'Spa and wellness centre', airbnb: 'Hot tub / sauna / spa', holidu: 'Spa' },
  },
  {
    code: 'sunbeds',
    label: 'Sdraio',
    description: 'Sdraio collegate a piscina o area esterna.',
    category: 'outdoor',
    ota_mapping: { booking: 'Sun loungers or beach chairs', airbnb: 'Outdoor furniture', holidu: 'Sdraio' },
  },
  {
    code: 'umbrellas',
    label: 'Ombrelloni',
    description: 'Ombrelloni area piscina o terrazza.',
    category: 'outdoor',
    ota_mapping: { booking: 'Sun umbrellas', airbnb: 'Outdoor furniture', holidu: 'Ombrelloni' },
  },
  {
    code: 'balcony_terrace',
    label: 'Balcone / terrazza',
    description: 'Spazio esterno privato per gli ospiti.',
    category: 'outdoor',
    ota_mapping: { booking: 'Balcony', airbnb: 'Patio or balcony', holidu: 'Balcone / terrazza' },
  },
  {
    code: 'view',
    label: 'Vista',
    description: 'Vista mare, montagna, lago o panoramica.',
    category: 'outdoor',
    ota_mapping: { booking: 'View', airbnb: 'Scenic views', holidu: 'Vista' },
  },
  {
    code: 'bicycles',
    label: 'Bici',
    description: 'Noleggio bici o bici disponibili.',
    category: 'services',
    ota_mapping: { booking: 'Bicycle rental', airbnb: 'Bikes', holidu: 'Bici' },
  },
  {
    code: 'breakfast',
    label: 'Colazione',
    description: 'Colazione disponibile in struttura o convenzionata.',
    category: 'services',
    ota_mapping: { booking: 'Breakfast available', airbnb: 'Breakfast', holidu: 'Colazione' },
  },
  {
    code: 'gym',
    label: 'Palestra / fitness',
    description: 'Area fitness o palestra disponibile.',
    category: 'services',
    ota_mapping: { booking: 'Fitness centre', airbnb: 'Gym', holidu: 'Fitness' },
  },
  {
    code: 'luggage_storage',
    label: 'Deposito bagagli',
    description: 'Deposito bagagli pre check-in o post check-out.',
    category: 'services',
    ota_mapping: { booking: 'Luggage storage', airbnb: 'Luggage dropoff allowed', holidu: 'Deposito bagagli' },
  },
  {
    code: 'airport_shuttle',
    label: 'Transfer aeroporto / stazione',
    description: 'Servizio navetta o transfer su richiesta.',
    category: 'transport',
    ota_mapping: { booking: 'Airport shuttle', airbnb: 'Airport shuttle', holidu: 'Transfer' },
  },
  {
    code: 'ev_charger',
    label: 'Ricarica auto elettrica',
    description: 'Stazione di ricarica EV in loco.',
    category: 'transport',
    ota_mapping: { booking: 'Electric vehicle charging station', airbnb: 'EV charger', holidu: 'Ricarica EV' },
  },
  {
    code: 'dedicated_workspace',
    label: 'Workspace dedicato',
    description: 'Scrivania o spazio lavoro per soggiorni business e workation.',
    category: 'comfort',
    ota_mapping: { booking: 'Desk', airbnb: 'Dedicated workspace', holidu: 'Spazio lavoro' },
  },
  {
    code: 'streaming_tv',
    label: 'TV con streaming',
    description: 'Smart TV con servizi streaming disponibili.',
    category: 'comfort',
    ota_mapping: { booking: 'Streaming service', airbnb: 'TV', holidu: 'TV streaming' },
  },
  {
    code: 'oven',
    label: 'Forno',
    description: 'Forno tradizionale disponibile.',
    category: 'kitchen',
    ota_mapping: { booking: 'Oven', airbnb: 'Oven', holidu: 'Forno' },
  },
  {
    code: 'kettle',
    label: 'Bollitore',
    description: 'Bollitore per bevande calde.',
    category: 'kitchen',
    ota_mapping: { booking: 'Electric kettle', airbnb: 'Hot water kettle', holidu: 'Bollitore' },
  },
  {
    code: 'toaster',
    label: 'Tostapane',
    description: 'Tostapane disponibile in cucina.',
    category: 'kitchen',
    ota_mapping: { booking: 'Toaster', airbnb: 'Toaster', holidu: 'Tostapane' },
  },
  {
    code: 'bbq',
    label: 'Barbecue',
    description: 'Area barbecue o griglia a disposizione.',
    category: 'outdoor',
    ota_mapping: { booking: 'BBQ facilities', airbnb: 'BBQ grill', holidu: 'Barbecue' },
  },
  {
    code: 'garden',
    label: 'Giardino',
    description: 'Giardino o area verde privata/comune.',
    category: 'outdoor',
    ota_mapping: { booking: 'Garden', airbnb: 'Backyard', holidu: 'Giardino' },
  },
  {
    code: 'outdoor_dining',
    label: 'Zona pranzo esterna',
    description: 'Spazio attrezzato per mangiare all\'aperto.',
    category: 'outdoor',
    ota_mapping: { booking: 'Outdoor dining area', airbnb: 'Outdoor dining area', holidu: 'Zona pranzo esterna' },
  },
  {
    code: 'beach_access',
    label: 'Servizio spiaggia / accesso mare',
    description: 'Lido convenzionato, spiaggia privata o accesso dedicato.',
    category: 'outdoor',
    ota_mapping: { booking: 'Beachfront', airbnb: 'Beach access', holidu: 'Servizio spiaggia' },
  },
  {
    code: 'crib',
    label: 'Culla',
    description: 'Culla o lettino per neonati disponibile.',
    category: 'family',
    ota_mapping: { booking: 'Cot', airbnb: 'Crib', holidu: 'Culla' },
  },
  {
    code: 'high_chair',
    label: 'Seggiolone',
    description: 'Seggiolone per bambini disponibile.',
    category: 'family',
    ota_mapping: { booking: 'High chair', airbnb: 'High chair', holidu: 'Seggiolone' },
  },
  {
    code: 'family_friendly',
    label: 'Family friendly',
    description: 'Struttura pensata per famiglie.',
    category: 'family',
    ota_mapping: { booking: 'Family rooms', airbnb: 'Family-friendly', holidu: 'Adatto a famiglie' },
  },
  {
    code: 'pet_kit',
    label: 'Kit animali',
    description: 'Ciotole, tappetino o amenities dedicate agli animali.',
    category: 'services',
    ota_mapping: { booking: 'Pet bowls', airbnb: 'Pets allowed', holidu: 'Kit animali' },
  },
  {
    code: 'pets_allowed',
    label: 'Animali ammessi',
    description: 'Struttura pet friendly con policy dedicata.',
    category: 'rules',
    ota_mapping: { booking: 'Pets allowed', airbnb: 'Pets allowed', holidu: 'Animali ammessi' },
  },
  {
    code: 'children_allowed',
    label: 'Bambini ammessi',
    description: 'Struttura adatta a famiglie e bambini.',
    category: 'rules',
    ota_mapping: { booking: 'Children of any age are welcome', airbnb: 'Family-friendly', holidu: 'Bambini ammessi' },
  },
  {
    code: 'smoking_not_allowed',
    label: 'Non fumatori',
    description: 'Vietato fumare negli ambienti interni.',
    category: 'rules',
    ota_mapping: { booking: 'Non-smoking rooms', airbnb: 'Smoking allowed: no', holidu: 'Non fumatori' },
  },
  {
    code: 'events_not_allowed',
    label: 'Eventi non consentiti',
    description: 'No feste o eventi in struttura.',
    category: 'rules',
    ota_mapping: { booking: 'Parties/events are not allowed', airbnb: 'Events allowed: no', holidu: 'No eventi' },
  },
]

export const LISTING_AMENITY_CATEGORY_LABELS: Record<ListingAmenityCategory, string> = {
  bedroom: 'Camera e biancheria',
  bathroom: 'Bagno',
  kitchen: 'Cucina',
  comfort: 'Comfort e tecnologia',
  outdoor: 'Esterni e spazi',
  services: 'Servizi',
  family: 'Famiglie e bambini',
  transport: 'Mobilita\' e accesso',
  rules: 'Regole struttura',
}

export const DEFAULT_LISTING_PROFILE_SETTINGS: ListingProfileSettings = {
  public_title: '',
  short_description: '',
  long_description: '',
  arrival_instructions: '',
  check_out_instructions: '',
  house_rules: '',
  cancellation_summary: '',
  amenity_codes: [],
  ota_notes: '',
}

export function getListingAmenityDefinitionsByCategory() {
  return Object.entries(LISTING_AMENITY_CATEGORY_LABELS).map(([category, label]) => ({
    category: category as ListingAmenityCategory,
    label,
    items: LISTING_AMENITY_DEFINITIONS.filter((item) => item.category === category),
  }))
}

export function getListingProfileSettings(settings: Json | null | undefined): ListingProfileSettings {
  const root = isRecord(settings) ? settings : {}
  const listing = isRecord(root.listing_profile) ? root.listing_profile : {}

  return {
    public_title: getString(listing.public_title),
    short_description: getString(listing.short_description),
    long_description: getString(listing.long_description),
    arrival_instructions: getString(listing.arrival_instructions),
    check_out_instructions: getString(listing.check_out_instructions),
    house_rules: getString(listing.house_rules),
    cancellation_summary: getString(listing.cancellation_summary),
    amenity_codes: getStringArray(listing.amenity_codes).filter((code) =>
      LISTING_AMENITY_DEFINITIONS.some((item) => item.code === code)
    ),
    ota_notes: getString(listing.ota_notes),
  }
}

export function getSelectedListingAmenities(codes: string[]): ListingAmenityDefinition[] {
  return LISTING_AMENITY_DEFINITIONS.filter((definition) => codes.includes(definition.code))
}

export function buildPmsAmenitySuggestions(org: Property | null): string[] {
  if (!org) return []

  if (org.type === 'hotel') {
    return buildHotelAmenitySuggestionCodes(
      getHotelOperationsSettings(org.settings),
      getSharedExtraAmenitiesSettings(org.settings)
    )
  }

  const suggestions = new Set<string>()
  const settings = getNonHotelOperationsSettings(org.settings, org.type)
  const profile = getPropertyTypeOperationsProfile(org.type)
  const sharedCatalogs = new Set(profile?.sharedCatalogs ?? [])

  if (sharedCatalogs.has('linens')) {
    settings.linens.forEach((item) => {
      if (!item.is_active) return
      if (item.kind === 'bed_linen') suggestions.add('bed_linen')
      if (item.kind === 'bath_linen') suggestions.add('towels')
      if (item.kind === 'blanket') suggestions.add('blankets')
      if (item.kind === 'pillows') suggestions.add('extra_pillows')
    })
  }

  if (sharedCatalogs.has('laundry')) {
    settings.laundry.forEach((item) => {
      if (!item.is_active) return
      if (item.kind === 'washing_machine') suggestions.add('washing_machine')
    })
  }

  if (sharedCatalogs.has('kitchen')) {
    settings.kitchen.forEach((item) => {
      if (!item.is_active) return
      const name = item.name.toLowerCase()
      if (name.includes('lavastoviglie')) suggestions.add('dishwasher')
      if (name.includes('microonde')) suggestions.add('microwave')
      if (name.includes('frigorifero')) suggestions.add('fridge')
      if (name.includes('forno')) suggestions.add('oven')
      if (name.includes('bollitore')) suggestions.add('kettle')
      if (name.includes('tostapane')) suggestions.add('toaster')
      if (name.includes('posate') || name.includes('stoviglie') || name.includes('utensili')) {
        suggestions.add('kitchen_utensils')
      }
      if (name.includes('caffe')) suggestions.add('coffee_machine')
    })
  }

  if (sharedCatalogs.has('extras')) {
    settings.extras.forEach((item) => {
      if (!item.is_active) return
      if (item.kind === 'parking') suggestions.add('parking')
      if (item.kind === 'pool') {
        suggestions.add('pool')
        if (item.pool_details?.private_access) suggestions.add('pool')
        item.pool_details?.accessories.forEach((accessory) => {
          if (!accessory.is_active) return
          if (accessory.kind === 'sunbed') suggestions.add('sunbeds')
          if (accessory.kind === 'umbrella') suggestions.add('umbrellas')
        })
      }
      if (item.kind === 'spa') suggestions.add('spa')
      if (item.kind === 'bike') suggestions.add('bicycles')
      if (item.kind === 'parking') suggestions.add('parking')
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
  }

  const petPolicy = isRecord(org.pet_policy) ? org.pet_policy : {}
  if (org.pets_allowed) suggestions.add('pets_allowed')
  if ((petPolicy.smoking_allowed as boolean) === false) suggestions.add('smoking_not_allowed')

  return Array.from(suggestions)
}

export function computeListingReadiness(profile: ListingProfileSettings): ListingReadiness {
  const checks = [
    { label: 'Titolo pubblico', ok: profile.public_title.trim().length >= 12 },
    { label: 'Descrizione breve', ok: profile.short_description.trim().length >= 80 },
    { label: 'Descrizione completa', ok: profile.long_description.trim().length >= 160 },
    { label: 'Istruzioni arrivo', ok: profile.arrival_instructions.trim().length >= 20 },
    { label: 'Istruzioni check-out', ok: profile.check_out_instructions.trim().length >= 12 },
    { label: 'House rules', ok: profile.house_rules.trim().length >= 20 },
    { label: 'Politica cancellazione', ok: profile.cancellation_summary.trim().length >= 20 },
    { label: 'Servizi e dotazioni', ok: profile.amenity_codes.length >= 10 },
  ]

  const completed = checks.filter((check) => check.ok).length
  const total = checks.length

  return {
    score: Math.round((completed / total) * 100),
    completed,
    total,
    missing: checks.filter((check) => !check.ok).map((check) => check.label),
  }
}
