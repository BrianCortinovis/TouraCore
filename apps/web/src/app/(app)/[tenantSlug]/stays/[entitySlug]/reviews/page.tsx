import { createServerSupabaseClient } from '@touracore/db/server'
import { ReviewsView } from './reviews-view'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
  searchParams: Promise<{ filter?: string }>
}

export default async function ReviewsPage({ params, searchParams }: Props) {
  const { tenantSlug, entitySlug } = await params
  const { filter } = await searchParams
  const supabase = await createServerSupabaseClient()

  const { data: entity } = await supabase.from('entities').select('id, name').eq('slug', entitySlug).single()
  if (!entity) return null

  let query = supabase
    .from('reviews')
    .select('id, source, external_id, rating, title, body, language, reviewer_name, reviewer_country, reply_body, reply_at, sentiment, topics, flagged, created_at')
    .eq('entity_id', entity.id)
    .eq('visible', true)
    .order('created_at', { ascending: false })
    .limit(100)

  if (filter === 'unreplied') query = query.is('reply_at', null)
  if (filter === 'negative') query = query.lte('rating', 3)
  if (filter === 'flagged') query = query.eq('flagged', true)

  const { data: reviews } = await query

  const { data: all } = await supabase.from('reviews').select('rating, source').eq('entity_id', entity.id).eq('visible', true)
  const total = (all ?? []).length
  const avg = total > 0 ? (all ?? []).reduce((s, r) => s + Number(r.rating), 0) / total : 0
  const sourceMap = new Map<string, number>()
  for (const r of all ?? []) sourceMap.set(r.source as string, (sourceMap.get(r.source as string) ?? 0) + 1)
  const stats = { total, avg, sources: Array.from(sourceMap.entries()) }

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Recensioni</h1>
        <p className="text-sm text-gray-500">Aggregator Google · Booking · Airbnb · TheFork · TripAdvisor</p>
      </header>
      <ReviewsView
        tenantSlug={tenantSlug}
        entitySlug={entitySlug}
        currentFilter={filter ?? 'all'}
        stats={stats}
        reviews={(reviews ?? []).map((r) => ({
          id: r.id as string,
          source: r.source as string,
          externalId: r.external_id as string | null,
          rating: r.rating as number,
          title: r.title as string | null,
          body: r.body as string | null,
          language: r.language as string | null,
          reviewerName: r.reviewer_name as string | null,
          reviewerCountry: r.reviewer_country as string | null,
          replyBody: r.reply_body as string | null,
          replyAt: r.reply_at as string | null,
          sentiment: r.sentiment as string | null,
          topics: (r.topics as string[]) ?? [],
          flagged: r.flagged as boolean,
          createdAt: r.created_at as string,
        }))}
      />
    </div>
  )
}
