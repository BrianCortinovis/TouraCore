import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AMENITY_KEYS, type AmenityKey } from './types'

export const accommodationDetailsSchema = z.object({
  entity_id: z.string(),
  property_type: z.string().nullable(),
  amenities: z.array(z.string()).default([]),
  address: z.string().nullable(),
  city: z.string().nullable(),
  province: z.string().nullable(),
  zip: z.string().nullable(),
  country: z.string().nullable(),
  region: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  check_in_time: z.string().nullable(),
  check_out_time: z.string().nullable(),
  default_currency: z.string().nullable(),
})
export type AccommodationDetails = z.infer<typeof accommodationDetailsSchema>

const AMENITY_ALIASES: Record<string, AmenityKey> = {
  airco: 'ac',
  air_conditioning: 'ac',
  aircon: 'ac',
  wifi_free: 'wifi',
  internet: 'wifi',
  swimming_pool: 'pool',
  parking_free: 'parking',
  free_parking: 'parking',
  private_parking: 'parking',
  lake: 'lake_view',
  sea: 'sea_view',
  mountain: 'mountain_view',
  mountains: 'mountain_view',
}

/** Normalize legacy / alternative amenity keys to canonical AmenityKey */
export function normalizeAmenityKey(input: string): AmenityKey | null {
  const lowered = input.toLowerCase().trim()
  if (AMENITY_ALIASES[lowered]) return AMENITY_ALIASES[lowered]
  if ((AMENITY_KEYS as readonly string[]).includes(lowered)) return lowered as AmenityKey
  return null
}

export function normalizeAmenities(input: string[] | null | undefined): AmenityKey[] {
  if (!input) return []
  const seen = new Set<AmenityKey>()
  for (const raw of input) {
    const k = normalizeAmenityKey(raw)
    if (k) seen.add(k)
  }
  return Array.from(seen)
}

/** Fetch accommodation details via anon-safe view. Only rows with is_public=true visible. */
export async function getAccommodationDetails(
  supabase: SupabaseClient,
  entityId: string
): Promise<AccommodationDetails | null> {
  const { data, error } = await supabase
    .from('public_accommodation_view')
    .select(
      'entity_id, property_type, amenities, address, city, province, zip, country, region, email, phone, website, latitude, longitude, check_in_time, check_out_time, default_currency'
    )
    .eq('entity_id', entityId)
    .maybeSingle()

  if (error || !data) return null
  const parsed = accommodationDetailsSchema.safeParse({
    ...data,
    amenities: Array.isArray(data.amenities) ? data.amenities : [],
    latitude: data.latitude == null ? null : Number(data.latitude),
    longitude: data.longitude == null ? null : Number(data.longitude),
  })
  return parsed.success ? parsed.data : null
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  hotel: 'Hotel',
  villa: 'Villa',
  casa_vacanze: 'Casa vacanze',
  b_and_b: 'B&B',
  appartamento: 'Appartamento',
  residence: 'Residence',
  agriturismo: 'Agriturismo',
  ostello: 'Ostello',
}

export function formatPropertyType(type: string | null, locale: 'it' = 'it'): string {
  if (!type) return ''
  return PROPERTY_TYPE_LABELS[type] ?? type.replace(/_/g, ' ')
}
