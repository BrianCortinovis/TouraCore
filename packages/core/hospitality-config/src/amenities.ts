// ---------------------------------------------------------------------------
// Categorie amenities (9 categorie, 61 amenities — allineato a Gest PMS)
// ---------------------------------------------------------------------------

export type AmenityCategoryKey =
  | 'bedroom'
  | 'bathroom'
  | 'kitchen'
  | 'comfort'
  | 'outdoor'
  | 'services'
  | 'family'
  | 'transport'
  | 'rules'

export interface AmenityDefinition {
  code: string
  label: string
  description: string
  category: AmenityCategoryKey
  otaMapping: {
    booking: string
    airbnb: string
    holidu: string
  }
}

export interface AmenityCategory {
  key: AmenityCategoryKey
  label: string
  amenities: string[]
}

// ---------------------------------------------------------------------------
// Definizioni complete con OTA mapping
// ---------------------------------------------------------------------------

export const AMENITY_DEFINITIONS: AmenityDefinition[] = [
  // --- services ---
  { code: 'front_desk_24h', label: 'Reception 24h', description: 'Reception sempre attiva o disponibile H24.', category: 'services', otaMapping: { booking: '24-hour front desk', airbnb: 'Host greets you', holidu: 'Reception 24h' } },
  { code: 'concierge', label: 'Concierge', description: 'Servizio concierge e assistenza ospiti.', category: 'services', otaMapping: { booking: 'Concierge service', airbnb: 'Host assistance', holidu: 'Concierge' } },
  { code: 'room_service', label: 'Room service', description: 'Servizio in camera disponibile.', category: 'services', otaMapping: { booking: 'Room service', airbnb: 'Room service', holidu: 'Room service' } },
  { code: 'restaurant', label: 'Ristorante', description: 'Ristorante presente in struttura.', category: 'services', otaMapping: { booking: 'Restaurant', airbnb: 'Restaurant', holidu: 'Ristorante' } },
  { code: 'bar', label: 'Bar', description: 'Bar o lounge bar in struttura.', category: 'services', otaMapping: { booking: 'Bar', airbnb: 'Bar', holidu: 'Bar' } },
  { code: 'washing_machine', label: 'Lavatrice', description: 'Lavatrice ad uso ospiti o a richiesta.', category: 'services', otaMapping: { booking: 'Washing machine', airbnb: 'Washer', holidu: 'Lavatrice' } },
  { code: 'spa', label: 'Spa / wellness', description: 'Accesso wellness o spa disponibile.', category: 'services', otaMapping: { booking: 'Spa and wellness centre', airbnb: 'Hot tub / sauna / spa', holidu: 'Spa' } },
  { code: 'bicycles', label: 'Bici', description: 'Noleggio bici o bici disponibili.', category: 'services', otaMapping: { booking: 'Bicycle rental', airbnb: 'Bikes', holidu: 'Bici' } },
  { code: 'breakfast', label: 'Colazione', description: 'Colazione disponibile in struttura.', category: 'services', otaMapping: { booking: 'Breakfast available', airbnb: 'Breakfast', holidu: 'Colazione' } },
  { code: 'gym', label: 'Palestra / fitness', description: 'Area fitness o palestra disponibile.', category: 'services', otaMapping: { booking: 'Fitness centre', airbnb: 'Gym', holidu: 'Fitness' } },
  { code: 'luggage_storage', label: 'Deposito bagagli', description: 'Deposito bagagli pre/post check-in.', category: 'services', otaMapping: { booking: 'Luggage storage', airbnb: 'Luggage dropoff allowed', holidu: 'Deposito bagagli' } },
  { code: 'pet_kit', label: 'Kit animali', description: 'Ciotole, tappetino o amenities per animali.', category: 'services', otaMapping: { booking: 'Pet bowls', airbnb: 'Pets allowed', holidu: 'Kit animali' } },

  // --- comfort ---
  { code: 'minibar', label: 'Minibar', description: 'Minibar disponibile in camera.', category: 'comfort', otaMapping: { booking: 'Minibar', airbnb: 'Mini fridge', holidu: 'Minibar' } },
  { code: 'safe', label: 'Cassaforte', description: 'Cassaforte in camera.', category: 'comfort', otaMapping: { booking: 'Safety deposit box', airbnb: 'Safe', holidu: 'Cassaforte' } },
  { code: 'soundproof_room', label: 'Camera insonorizzata', description: 'Camera con isolamento acustico.', category: 'comfort', otaMapping: { booking: 'Soundproofing', airbnb: 'Soundproof', holidu: 'Insonorizzata' } },
  { code: 'accessible_room', label: 'Camera accessibile', description: 'Unità accessibile per disabili.', category: 'comfort', otaMapping: { booking: 'Entire unit wheelchair accessible', airbnb: 'Accessible room', holidu: 'Accessibile' } },
  { code: 'wifi', label: 'WiFi', description: 'Connessione internet disponibile.', category: 'comfort', otaMapping: { booking: 'WiFi', airbnb: 'Wifi', holidu: 'WiFi' } },
  { code: 'tv', label: 'TV', description: 'Televisore in struttura.', category: 'comfort', otaMapping: { booking: 'TV', airbnb: 'TV', holidu: 'TV' } },
  { code: 'air_conditioning', label: 'Aria condizionata', description: 'Climatizzazione presente.', category: 'comfort', otaMapping: { booking: 'Air conditioning', airbnb: 'Air conditioning', holidu: 'Aria condizionata' } },
  { code: 'heating', label: 'Riscaldamento', description: 'Riscaldamento disponibile.', category: 'comfort', otaMapping: { booking: 'Heating', airbnb: 'Heating', holidu: 'Riscaldamento' } },
  { code: 'dedicated_workspace', label: 'Workspace dedicato', description: 'Scrivania o spazio lavoro per business.', category: 'comfort', otaMapping: { booking: 'Desk', airbnb: 'Dedicated workspace', holidu: 'Spazio lavoro' } },
  { code: 'streaming_tv', label: 'TV con streaming', description: 'Smart TV con servizi streaming.', category: 'comfort', otaMapping: { booking: 'Streaming service', airbnb: 'TV', holidu: 'TV streaming' } },

  // --- bedroom ---
  { code: 'bed_linen', label: 'Lenzuola incluse', description: 'Set lenzuola e federe pronto all\'arrivo.', category: 'bedroom', otaMapping: { booking: 'Bed linen', airbnb: 'Essentials', holidu: 'Lenzuola incluse' } },
  { code: 'blankets', label: 'Coperte', description: 'Coperte aggiuntive o plaid disponibili.', category: 'bedroom', otaMapping: { booking: 'Blankets', airbnb: 'Extra pillows and blankets', holidu: 'Coperte' } },
  { code: 'extra_pillows', label: 'Cuscini extra', description: 'Cuscini supplementari richiedibili.', category: 'bedroom', otaMapping: { booking: 'Extra pillows and blankets', airbnb: 'Extra pillows and blankets', holidu: 'Cuscini extra' } },

  // --- bathroom ---
  { code: 'private_bathroom', label: 'Bagno privato', description: 'Bagno privato in camera o suite.', category: 'bathroom', otaMapping: { booking: 'Private bathroom', airbnb: 'Private bathroom', holidu: 'Bagno privato' } },
  { code: 'bathrobe', label: 'Accappatoio', description: 'Accappatoio disponibile in camera.', category: 'bathroom', otaMapping: { booking: 'Bathrobe', airbnb: 'Bathrobe', holidu: 'Accappatoio' } },
  { code: 'slippers', label: 'Ciabattine', description: 'Ciabattine disponibili per l\'ospite.', category: 'bathroom', otaMapping: { booking: 'Slippers', airbnb: 'Slippers', holidu: 'Ciabattine' } },
  { code: 'towels', label: 'Asciugamani', description: 'Set asciugamani bagno disponibili.', category: 'bathroom', otaMapping: { booking: 'Towels', airbnb: 'Essentials', holidu: 'Asciugamani' } },
  { code: 'hairdryer', label: 'Asciugacapelli', description: 'Phon disponibile nel bagno.', category: 'bathroom', otaMapping: { booking: 'Hairdryer', airbnb: 'Hair dryer', holidu: 'Asciugacapelli' } },
  { code: 'soap_shampoo', label: 'Sapone e shampoo', description: 'Amenities bagno base fornite.', category: 'bathroom', otaMapping: { booking: 'Free toiletries', airbnb: 'Shampoo', holidu: 'Sapone e shampoo' } },
  { code: 'toilet_paper', label: 'Carta igienica', description: 'Fornitura iniziale di carta igienica.', category: 'bathroom', otaMapping: { booking: 'Toilet paper', airbnb: 'Essentials', holidu: 'Carta igienica' } },

  // --- kitchen ---
  { code: 'kitchen_utensils', label: 'Utensili cucina', description: 'Set utensili, posate e stoviglie.', category: 'kitchen', otaMapping: { booking: 'Kitchenware', airbnb: 'Kitchen', holidu: 'Utensili cucina' } },
  { code: 'dishwasher', label: 'Lavastoviglie', description: 'Lavastoviglie disponibile.', category: 'kitchen', otaMapping: { booking: 'Dishwasher', airbnb: 'Dishwasher', holidu: 'Lavastoviglie' } },
  { code: 'microwave', label: 'Microonde', description: 'Forno microonde disponibile.', category: 'kitchen', otaMapping: { booking: 'Microwave', airbnb: 'Microwave', holidu: 'Microonde' } },
  { code: 'coffee_machine', label: 'Macchina caffè', description: 'Macchina caffè o capsule disponibile.', category: 'kitchen', otaMapping: { booking: 'Coffee machine', airbnb: 'Coffee maker', holidu: 'Macchina caffè' } },
  { code: 'fridge', label: 'Frigorifero', description: 'Frigorifero o frigorifero con freezer.', category: 'kitchen', otaMapping: { booking: 'Refrigerator', airbnb: 'Refrigerator', holidu: 'Frigorifero' } },
  { code: 'oven', label: 'Forno', description: 'Forno tradizionale disponibile.', category: 'kitchen', otaMapping: { booking: 'Oven', airbnb: 'Oven', holidu: 'Forno' } },
  { code: 'kettle', label: 'Bollitore', description: 'Bollitore per bevande calde.', category: 'kitchen', otaMapping: { booking: 'Electric kettle', airbnb: 'Hot water kettle', holidu: 'Bollitore' } },
  { code: 'toaster', label: 'Tostapane', description: 'Tostapane disponibile in cucina.', category: 'kitchen', otaMapping: { booking: 'Toaster', airbnb: 'Toaster', holidu: 'Tostapane' } },

  // --- outdoor ---
  { code: 'parking', label: 'Parcheggio', description: 'Parcheggio riservato o disponibile.', category: 'outdoor', otaMapping: { booking: 'Parking', airbnb: 'Free parking on premises', holidu: 'Parcheggio' } },
  { code: 'pool', label: 'Piscina', description: 'Piscina stagionale o annuale.', category: 'outdoor', otaMapping: { booking: 'Swimming pool', airbnb: 'Pool', holidu: 'Piscina' } },
  { code: 'sunbeds', label: 'Sdraio', description: 'Sdraio collegate a piscina o area esterna.', category: 'outdoor', otaMapping: { booking: 'Sun loungers or beach chairs', airbnb: 'Outdoor furniture', holidu: 'Sdraio' } },
  { code: 'umbrellas', label: 'Ombrelloni', description: 'Ombrelloni area piscina o terrazza.', category: 'outdoor', otaMapping: { booking: 'Sun umbrellas', airbnb: 'Outdoor furniture', holidu: 'Ombrelloni' } },
  { code: 'balcony_terrace', label: 'Balcone / terrazza', description: 'Spazio esterno privato.', category: 'outdoor', otaMapping: { booking: 'Balcony', airbnb: 'Patio or balcony', holidu: 'Balcone / terrazza' } },
  { code: 'view', label: 'Vista', description: 'Vista mare, montagna, lago o panoramica.', category: 'outdoor', otaMapping: { booking: 'View', airbnb: 'Scenic views', holidu: 'Vista' } },
  { code: 'bbq', label: 'Barbecue', description: 'Area barbecue o griglia a disposizione.', category: 'outdoor', otaMapping: { booking: 'BBQ facilities', airbnb: 'BBQ grill', holidu: 'Barbecue' } },
  { code: 'garden', label: 'Giardino', description: 'Giardino o area verde.', category: 'outdoor', otaMapping: { booking: 'Garden', airbnb: 'Backyard', holidu: 'Giardino' } },
  { code: 'outdoor_dining', label: 'Zona pranzo esterna', description: 'Spazio attrezzato per mangiare all\'aperto.', category: 'outdoor', otaMapping: { booking: 'Outdoor dining area', airbnb: 'Outdoor dining area', holidu: 'Zona pranzo esterna' } },
  { code: 'beach_access', label: 'Servizio spiaggia', description: 'Lido convenzionato o accesso spiaggia.', category: 'outdoor', otaMapping: { booking: 'Beachfront', airbnb: 'Beach access', holidu: 'Servizio spiaggia' } },

  // --- family ---
  { code: 'crib', label: 'Culla', description: 'Culla o lettino per neonati disponibile.', category: 'family', otaMapping: { booking: 'Cot', airbnb: 'Crib', holidu: 'Culla' } },
  { code: 'high_chair', label: 'Seggiolone', description: 'Seggiolone per bambini disponibile.', category: 'family', otaMapping: { booking: 'High chair', airbnb: 'High chair', holidu: 'Seggiolone' } },
  { code: 'family_friendly', label: 'Family friendly', description: 'Struttura pensata per famiglie.', category: 'family', otaMapping: { booking: 'Family rooms', airbnb: 'Family-friendly', holidu: 'Adatto a famiglie' } },

  // --- transport ---
  { code: 'airport_shuttle', label: 'Transfer aeroporto', description: 'Servizio navetta o transfer su richiesta.', category: 'transport', otaMapping: { booking: 'Airport shuttle', airbnb: 'Airport shuttle', holidu: 'Transfer' } },
  { code: 'ev_charger', label: 'Ricarica EV', description: 'Stazione di ricarica auto elettrica.', category: 'transport', otaMapping: { booking: 'Electric vehicle charging station', airbnb: 'EV charger', holidu: 'Ricarica EV' } },

  // --- rules ---
  { code: 'non_smoking', label: 'Non fumatori', description: 'Camera non fumatori o area smoke-free.', category: 'rules', otaMapping: { booking: 'Non-smoking rooms', airbnb: 'Smoking allowed: no', holidu: 'Non fumatori' } },
  { code: 'pets_allowed', label: 'Animali ammessi', description: 'Struttura pet friendly.', category: 'rules', otaMapping: { booking: 'Pets allowed', airbnb: 'Pets allowed', holidu: 'Animali ammessi' } },
  { code: 'children_allowed', label: 'Bambini ammessi', description: 'Struttura adatta a bambini.', category: 'rules', otaMapping: { booking: 'Children of any age are welcome', airbnb: 'Family-friendly', holidu: 'Bambini ammessi' } },
  { code: 'smoking_not_allowed', label: 'Vietato fumare', description: 'Vietato fumare negli ambienti interni.', category: 'rules', otaMapping: { booking: 'Non-smoking rooms', airbnb: 'Smoking allowed: no', holidu: 'Non fumatori' } },
  { code: 'events_not_allowed', label: 'No eventi', description: 'No feste o eventi in struttura.', category: 'rules', otaMapping: { booking: 'Parties/events are not allowed', airbnb: 'Events allowed: no', holidu: 'No eventi' } },
]

// ---------------------------------------------------------------------------
// Label categorie
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<AmenityCategoryKey, string> = {
  bedroom: 'Camera e biancheria',
  bathroom: 'Bagno',
  kitchen: 'Cucina',
  comfort: 'Comfort e tecnologia',
  outdoor: 'Spazi esterni',
  services: 'Servizi',
  family: 'Famiglia',
  transport: 'Trasporti',
  rules: 'Regole',
}

const CATEGORY_ORDER: AmenityCategoryKey[] = [
  'comfort', 'services', 'bathroom', 'bedroom', 'kitchen',
  'outdoor', 'family', 'transport', 'rules',
]

// ---------------------------------------------------------------------------
// Categorie raggruppate (per UI: grid con accordion/tab)
// ---------------------------------------------------------------------------

export const AMENITY_CATEGORIES: AmenityCategory[] = CATEGORY_ORDER.map((key) => ({
  key,
  label: CATEGORY_LABELS[key],
  amenities: AMENITY_DEFINITIONS
    .filter((a) => a.category === key)
    .map((a) => a.code),
}))

export const ALL_AMENITIES = AMENITY_DEFINITIONS.map((a) => a.code)

// ---------------------------------------------------------------------------
// Helper: lookup per codice
// ---------------------------------------------------------------------------

const AMENITY_MAP = new Map(AMENITY_DEFINITIONS.map((a) => [a.code, a]))

export function getAmenityDefinition(code: string): AmenityDefinition | undefined {
  return AMENITY_MAP.get(code)
}

export function getAmenityLabel(code: string): string {
  return AMENITY_MAP.get(code)?.label ?? code
}
