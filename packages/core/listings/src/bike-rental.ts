import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'

const openingSlotSchema = z.object({
  open: z.string().optional(),
  close: z.string().optional(),
})

const openingHoursSchema = z
  .object({
    mon: z.array(z.union([openingSlotSchema, z.string()])).optional(),
    tue: z.array(z.union([openingSlotSchema, z.string()])).optional(),
    wed: z.array(z.union([openingSlotSchema, z.string()])).optional(),
    thu: z.array(z.union([openingSlotSchema, z.string()])).optional(),
    fri: z.array(z.union([openingSlotSchema, z.string()])).optional(),
    sat: z.array(z.union([openingSlotSchema, z.string()])).optional(),
    sun: z.array(z.union([openingSlotSchema, z.string()])).optional(),
  })
  .passthrough()
  .default({})

export type BikeRentalOpeningHours = z.infer<typeof openingHoursSchema>

export const bikeRentalDetailsSchema = z.object({
  entity_id: z.string(),
  bike_types: z.array(z.string()).default([]),
  capacity_total: z.number().default(0),
  avg_rental_hours: z.number().default(4),
  address: z.string().nullable().default(null),
  city: z.string().nullable().default(null),
  zip: z.string().nullable().default(null),
  country: z.string().default('IT'),
  latitude: z.number().nullable().default(null),
  longitude: z.number().nullable().default(null),
  opening_hours: openingHoursSchema,
  delivery_config: z.record(z.string(), z.unknown()).nullable().default(null),
  one_way_config: z.record(z.string(), z.unknown()).nullable().default(null),
})
export type BikeRentalDetails = z.infer<typeof bikeRentalDetailsSchema>

export const bikeTypePublicSchema = z.object({
  id: z.string(),
  bike_rental_id: z.string(),
  type_key: z.string(),
  display_name: z.string(),
  description: z.string().nullable(),
  photo: z.string().nullable(),
  hourly_rate: z.number().nullable(),
  half_day_rate: z.number().nullable(),
  daily_rate: z.number().nullable(),
  weekly_rate: z.number().nullable(),
  deposit_amount: z.number(),
  age_min: z.number().nullable(),
  height_min: z.number().nullable(),
  height_max: z.number().nullable(),
  display_order: z.number(),
})
export type BikeTypePublic = z.infer<typeof bikeTypePublicSchema>

export const bikeLocationPublicSchema = z.object({
  id: z.string(),
  bike_rental_id: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  is_pickup: z.boolean(),
  is_return: z.boolean(),
})
export type BikeLocationPublic = z.infer<typeof bikeLocationPublicSchema>

export async function getBikeRentalDetails(
  supabase: SupabaseClient,
  entityId: string,
): Promise<BikeRentalDetails | null> {
  const { data, error } = await supabase
    .from('public_bike_rental_view')
    .select('*')
    .eq('entity_id', entityId)
    .maybeSingle()
  if (error || !data) return null
  const parsed = bikeRentalDetailsSchema.safeParse(data)
  return parsed.success ? parsed.data : null
}

export async function getBikeTypesPublic(
  supabase: SupabaseClient,
  entityId: string,
): Promise<BikeTypePublic[]> {
  const { data } = await supabase
    .from('public_bike_types_view')
    .select('*')
    .eq('bike_rental_id', entityId)
    .order('display_order', { ascending: true })
  if (!data) return []
  return data.flatMap((row) => {
    const parsed = bikeTypePublicSchema.safeParse(row)
    return parsed.success ? [parsed.data] : []
  })
}

export async function getBikeLocationsPublic(
  supabase: SupabaseClient,
  entityId: string,
): Promise<BikeLocationPublic[]> {
  const { data } = await supabase
    .from('public_bike_locations_view')
    .select('*')
    .eq('bike_rental_id', entityId)
    .order('display_order', { ascending: true })
  if (!data) return []
  return data.flatMap((row) => {
    const parsed = bikeLocationPublicSchema.safeParse(row)
    return parsed.success ? [parsed.data] : []
  })
}
