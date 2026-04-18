import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'

const openingSlotSchema = z.object({
  open: z.string(),
  close: z.string(),
})

const openingHoursSchema = z
  .object({
    mon: z.array(openingSlotSchema).optional(),
    tue: z.array(openingSlotSchema).optional(),
    wed: z.array(openingSlotSchema).optional(),
    thu: z.array(openingSlotSchema).optional(),
    fri: z.array(openingSlotSchema).optional(),
    sat: z.array(openingSlotSchema).optional(),
    sun: z.array(openingSlotSchema).optional(),
  })
  .default({})

export type OpeningSlot = z.infer<typeof openingSlotSchema>
export type OpeningHours = z.infer<typeof openingHoursSchema>

// services JSONB in DB can be objects (e.g. {name, start, end, max_covers})
// or plain strings depending on seed. Use passthrough to avoid parse failure.
export const restaurantDetailsSchema = z.object({
  id: z.string(),
  cuisine_type: z.array(z.string()).default([]),
  price_range: z.number().nullable(),
  capacity_total: z.number().default(0),
  avg_turn_minutes: z.number().default(90),
  opening_hours: openingHoursSchema,
  reservation_mode: z.string().default('slot'),
  services: z.array(z.unknown()).default([]),
})
export type RestaurantDetails = z.infer<typeof restaurantDetailsSchema>

export const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number]

const WEEKDAY_LABELS_IT: Record<WeekdayKey, string> = {
  mon: 'Lunedì',
  tue: 'Martedì',
  wed: 'Mercoledì',
  thu: 'Giovedì',
  fri: 'Venerdì',
  sat: 'Sabato',
  sun: 'Domenica',
}

const WEEKDAY_SCHEMA_ORG: Record<WeekdayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

export function getWeekdayLabel(k: WeekdayKey): string {
  return WEEKDAY_LABELS_IT[k]
}

export function getWeekdaySchemaOrg(k: WeekdayKey): string {
  return WEEKDAY_SCHEMA_ORG[k]
}

export function formatOpeningSlots(slots: OpeningSlot[] | undefined): string {
  if (!slots || slots.length === 0) return 'Chiuso'
  return slots.map((s) => `${s.open} — ${s.close}`).join(' · ')
}

const CUISINE_LABELS: Record<string, string> = {
  italiana: 'Italiana',
  tradizionale: 'Tradizionale',
  pesce: 'Pesce',
  pizza: 'Pizza',
  internazionale: 'Internazionale',
  regionale: 'Regionale',
  vegetariana: 'Vegetariana',
  vegana: 'Vegana',
  fusion: 'Fusion',
  stellata: 'Stellata',
}

export function formatCuisineTag(tag: string): string {
  return CUISINE_LABELS[tag.toLowerCase()] ?? tag.charAt(0).toUpperCase() + tag.slice(1)
}

export function formatPriceRange(pr: number | null | undefined): string {
  if (pr == null || pr < 1 || pr > 4) return ''
  return '€'.repeat(Math.round(pr))
}

/** Fetch restaurant details via anon-safe view. Only rows with is_public=true visible. */
export async function getRestaurantDetails(
  supabase: SupabaseClient,
  entityId: string
): Promise<RestaurantDetails | null> {
  const { data, error } = await supabase
    .from('public_restaurant_view')
    .select(
      'id, cuisine_type, price_range, capacity_total, avg_turn_minutes, opening_hours, reservation_mode, services'
    )
    .eq('id', entityId)
    .maybeSingle()

  if (error || !data) return null
  const parsed = restaurantDetailsSchema.safeParse({
    ...data,
    cuisine_type: Array.isArray(data.cuisine_type) ? data.cuisine_type : [],
    services: Array.isArray(data.services) ? data.services : [],
    opening_hours: data.opening_hours ?? {},
  })
  return parsed.success ? parsed.data : null
}
