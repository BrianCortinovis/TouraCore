import { createServerSupabaseClient } from '@touracore/db/server'
import { Star } from 'lucide-react'
import { ReviewsTable } from './reviews-table'

export const dynamic = 'force-dynamic'

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ source?: string; flagged?: string; q?: string }> }) {
  const params = await searchParams
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('reviews')
    .select('id, tenant_id, entity_id, source, reviewer_name, rating, rating_scale, title, body, language, published_at, sentiment, sentiment_score, response_body, response_published_at, is_flagged, flagged, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (params.source) query = query.eq('source', params.source)
  if (params.flagged === 'true') query = query.or('is_flagged.eq.true,flagged.eq.true')
  if (params.q) query = query.or(`title.ilike.%${params.q}%,body.ilike.%${params.q}%,reviewer_name.ilike.%${params.q}%`)

  const [{ data: reviews }, statsRes, sourcesRes] = await Promise.all([
    query,
    supabase.from('reviews').select('rating, source, is_flagged, sentiment', { count: 'exact' }),
    supabase.from('reviews').select('source'),
  ])

  const allSources = [...new Set((sourcesRes.data ?? []).map((r) => r.source))].sort()

  const total = statsRes.count ?? 0
  const stats = statsRes.data ?? []
  const avgRating = stats.length > 0 ? (stats.reduce((s, r) => s + Number(r.rating || 0), 0) / stats.length).toFixed(1) : '—'
  const flaggedCount = stats.filter((r) => r.is_flagged).length
  const positiveCount = stats.filter((r) => r.sentiment === 'positive').length
  const negativeCount = stats.filter((r) => r.sentiment === 'negative').length

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Star className="h-6 w-6 text-amber-500" />
          Recensioni
        </h1>
        <p className="mt-1 text-sm text-gray-500">Recensioni cross-tenant aggregate da tutte le fonti</p>
      </header>

      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card label="Totali" value={total.toLocaleString('it-IT')} />
          <Card label="Rating medio" value={avgRating} />
          <Card label="Positive" value={String(positiveCount)} hint={total > 0 ? `${Math.round(positiveCount / total * 100)}%` : '—'} tone="green" />
          <Card label="Negative / flagged" value={`${negativeCount} / ${flaggedCount}`} tone={flaggedCount > 0 ? 'red' : 'gray'} />
        </div>
      </section>

      <ReviewsTable initial={reviews ?? []} sources={allSources} />
    </div>
  )
}

function Card({ label, value, hint, tone = 'gray' }: { label: string; value: string; hint?: string; tone?: 'gray' | 'green' | 'red' }) {
  const cls = tone === 'green' ? 'border-green-200 bg-green-50' : tone === 'red' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
  return (
    <div className={`rounded-lg border p-4 ${cls}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}
