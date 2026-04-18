import type { BookingMode, ExperienceCategory, Difficulty, VariantKind } from './types/database'

export const BOOKING_MODES: Record<
  BookingMode,
  { label: string; description: string; needsCapacity: boolean; needsPool: boolean }
> = {
  timeslot_capacity: {
    label: 'Slot con capacità',
    description: 'Slot orario condiviso con N posti disponibili (motoslitta, parco avventura, tour gruppo)',
    needsCapacity: true,
    needsPool: false,
  },
  timeslot_private: {
    label: 'Slot privato esclusivo',
    description: 'Slot riservato al booking, nessun altro può prenotarlo (escape room, private tour, karting)',
    needsCapacity: false,
    needsPool: false,
  },
  asset_rental: {
    label: 'Pool noleggio unitario',
    description: 'Pool di unità condivise noleggiabili (bob, kayak, SUP, e-scooter)',
    needsCapacity: true,
    needsPool: true,
  },
}

export const CATEGORY_META: Record<ExperienceCategory, { label: string; icon: string }> = {
  snow_sport: { label: 'Sport sulla neve', icon: '🎿' },
  water_sport: { label: 'Sport acquatici', icon: '🚣' },
  adventure_park: { label: 'Parco avventura', icon: '🧗' },
  escape_room: { label: 'Escape room', icon: '🗝️' },
  guided_tour: { label: 'Tour guidato', icon: '🗺️' },
  tasting: { label: 'Degustazione', icon: '🍷' },
  karting: { label: 'Karting', icon: '🏎️' },
  laser_tag: { label: 'Laser tag', icon: '🔫' },
  rental_gear: { label: 'Noleggio attrezzatura', icon: '🛶' },
  workshop: { label: 'Workshop', icon: '🛠️' },
  wellness_experience: { label: 'Wellness experience', icon: '💆' },
  other: { label: 'Altro', icon: '✨' },
}

export const DIFFICULTY_META: Record<Difficulty, { label: string; color: string }> = {
  easy: { label: 'Facile', color: 'green' },
  medium: { label: 'Medio', color: 'yellow' },
  hard: { label: 'Difficile', color: 'orange' },
  extreme: { label: 'Estremo', color: 'red' },
}

export const VARIANT_KIND_META: Record<VariantKind, { label: string }> = {
  adult: { label: 'Adulto' },
  child: { label: 'Bambino' },
  infant: { label: 'Neonato' },
  senior: { label: 'Senior' },
  family: { label: 'Famiglia' },
  group: { label: 'Gruppo' },
  private: { label: 'Privato' },
  student: { label: 'Studente' },
  resident: { label: 'Residente' },
  other: { label: 'Altro' },
}

export const RESOURCE_TYPES = ['guide', 'vehicle', 'equipment', 'location'] as const
export type ResourceType = (typeof RESOURCE_TYPES)[number]

export const SUPPORTED_LANGUAGES = ['it', 'en', 'de', 'fr', 'es'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]
