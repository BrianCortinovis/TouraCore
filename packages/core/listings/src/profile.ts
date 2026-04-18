import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'

export const BOOKING_MODES = ['multi', 'singles', 'mixed'] as const
export type BookingMode = (typeof BOOKING_MODES)[number]

export const platformProfileSchema = z.object({
  profile_id: z.string(),
  username: z.string(),
  display_name: z.string(),
  intro_headline: z.string().nullable(),
  intro_description: z.string().nullable(),
  default_booking_mode: z.enum(BOOKING_MODES),
  avatar_media_id: z.string().nullable(),
  avatar_url: z.string().nullable(),
  social_links: z.record(z.string(), z.string()).nullable(),
  tenant_id: z.string().nullable(),
  tenant_slug: z.string().nullable(),
  tenant_name: z.string().nullable(),
  updated_at: z.string(),
})
export type PlatformProfile = z.infer<typeof platformProfileSchema>

export const profileListingSchema = z.object({
  pivot_id: z.string(),
  profile_id: z.string(),
  sort_order: z.number(),
  custom_label: z.string().nullable(),
  listing_id: z.string(),
  entity_id: z.string(),
  entity_kind: z.string(),
  tenant_slug: z.string(),
  slug: z.string(),
  entity_name: z.string(),
  tagline: z.string().nullable(),
  hero_url: z.string().nullable(),
  updated_at: z.string(),
})
export type ProfileListing = z.infer<typeof profileListingSchema>

/** Fetch profile by username (anon-safe, public view) */
export async function getPlatformProfile(
  supabase: SupabaseClient,
  username: string
): Promise<PlatformProfile | null> {
  const { data } = await supabase
    .from('public_platform_profile_view')
    .select('*')
    .eq('username', username)
    .maybeSingle()
  if (!data) return null
  const parsed = platformProfileSchema.safeParse(data)
  return parsed.success ? parsed.data : null
}

export async function getProfileListings(
  supabase: SupabaseClient,
  profileId: string
): Promise<ProfileListing[]> {
  const { data } = await supabase
    .from('public_profile_listings_view')
    .select('*')
    .eq('profile_id', profileId)
    .order('sort_order', { ascending: true })
  if (!data) return []
  return data
    .map((r) => profileListingSchema.safeParse(r))
    .filter((p): p is { success: true; data: ProfileListing } => p.success)
    .map((p) => p.data)
}
