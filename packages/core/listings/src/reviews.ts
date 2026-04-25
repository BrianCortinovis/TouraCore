import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'

export const reviewAggregateSchema = z.object({
  entity_id: z.string(),
  avg_rating: z.coerce.number(),
  review_count: z.coerce.number().int(),
})
export type ReviewAggregate = z.infer<typeof reviewAggregateSchema>

export const publicReviewSchema = z.object({
  id: z.string(),
  entity_id: z.string(),
  rating: z.number().int(),
  title: z.string().nullable(),
  body: z.string().nullable(),
  reviewer_name: z.string().nullable(),
  language: z.string().nullable(),
  created_at: z.string(),
})
export type PublicReview = z.infer<typeof publicReviewSchema>

/** Aggregate (avg + count) of visible reviews for an entity. Returns null if no reviews. */
export async function getReviewAggregate(
  supabase: SupabaseClient,
  entityId: string
): Promise<ReviewAggregate | null> {
  const { data, error } = await supabase
    .from('public_review_aggregate_view')
    .select('entity_id, avg_rating, review_count')
    .eq('entity_id', entityId)
    .maybeSingle()
  if (error || !data) return null
  const parsed = reviewAggregateSchema.safeParse(data)
  return parsed.success ? parsed.data : null
}

/** Most recent N visible reviews for an entity. */
export async function getRecentPublicReviews(
  supabase: SupabaseClient,
  entityId: string,
  limit = 5
): Promise<PublicReview[]> {
  const { data, error } = await supabase
    .from('public_review_view')
    .select('id, entity_id, rating, title, body, reviewer_name, language, created_at')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error || !data) return []
  return data
    .map((r) => publicReviewSchema.safeParse(r))
    .filter((p): p is { success: true; data: PublicReview } => p.success)
    .map((p) => p.data)
}
