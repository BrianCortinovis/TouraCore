import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'

export const listingPhotoSchema = z.object({
  id: z.string(),
  listing_id: z.string(),
  entity_id: z.string(),
  tenant_id: z.string(),
  sort_order: z.number().default(0),
  is_hero: z.boolean().default(false),
  caption: z.string().nullable(),
  media_kind: z.enum(['photo', 'video']).default('photo'),
  url: z.string(),
  alt_text: z.string().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  video_platform: z.enum(['youtube', 'vimeo']).nullable().default(null),
  video_id: z.string().nullable().default(null),
  video_thumbnail_url: z.string().nullable().default(null),
  video_title: z.string().nullable().default(null),
})

export type ListingPhoto = z.infer<typeof listingPhotoSchema>

/** Fetch ordered media gallery (photo + video) for a listing via anon-safe view */
export async function getListingPhotos(
  supabase: SupabaseClient,
  listingId: string
): Promise<ListingPhoto[]> {
  const { data, error } = await supabase
    .from('public_listing_photos_view')
    .select(
      'id, listing_id, entity_id, tenant_id, sort_order, is_hero, caption, media_kind, url, alt_text, width, height, video_platform, video_id, video_thumbnail_url, video_title'
    )
    .eq('listing_id', listingId)
    .order('sort_order', { ascending: true })

  if (error || !data) return []
  return data
    .map((r) => listingPhotoSchema.safeParse(r))
    .filter((p): p is { success: true; data: ListingPhoto } => p.success)
    .map((p) => p.data)
}
