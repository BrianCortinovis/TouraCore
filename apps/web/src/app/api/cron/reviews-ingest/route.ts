import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function authorize(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  if (request.headers.get('x-vercel-cron')) return true
  return request.headers.get('authorization') === `Bearer ${cronSecret}`
}

interface ReviewProviderAdapter {
  name: string
  fetchReviews(config: Record<string, unknown>): Promise<Array<{
    externalId: string
    reviewerName: string
    rating: number
    body: string
    title?: string
    publishedAt: string
    language?: string
  }>>
}

const googleAdapter: ReviewProviderAdapter = {
  name: 'google',
  async fetchReviews(_config) { return [] },
}

const bookingAdapter: ReviewProviderAdapter = {
  name: 'booking',
  async fetchReviews(_config) { return [] },
}

const airbnbAdapter: ReviewProviderAdapter = {
  name: 'airbnb',
  async fetchReviews(_config) { return [] },
}

const tripadvisorAdapter: ReviewProviderAdapter = {
  name: 'tripadvisor',
  async fetchReviews(_config) { return [] },
}

const adapters: Record<string, ReviewProviderAdapter> = {
  google: googleAdapter,
  booking: bookingAdapter,
  airbnb: airbnbAdapter,
  tripadvisor: tripadvisorAdapter,
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServiceRoleClient()

  const { data: connections } = await supabase
    .from('integrations')
    .select('id, tenant_id, entity_id, provider, settings, credentials')
    .in('provider', Object.keys(adapters))
    .eq('is_active', true)

  // Esegui adapter in parallelo: provider diversi sono indipendenti.
  // Bulk upsert per provider invece di loop sequenziale (riduce latenza Supabase ~Nx).
  const results = await Promise.all(
    (connections ?? []).map(async (conn) => {
      const adapter = adapters[conn.provider]
      if (!adapter) return null
      try {
        const reviews = await adapter.fetchReviews({ ...conn.credentials, ...conn.settings })
        if (reviews.length === 0) {
          return { entityId: conn.entity_id, provider: adapter.name, imported: 0 }
        }
        const rows = reviews.map((r) => ({
          tenant_id: conn.tenant_id,
          entity_id: conn.entity_id,
          source: adapter.name,
          external_id: r.externalId,
          reviewer_name: r.reviewerName,
          rating: r.rating,
          title: r.title,
          body: r.body,
          language: r.language,
          published_at: r.publishedAt,
          sentiment: r.rating >= 7 ? 'positive' : r.rating >= 5 ? 'neutral' : 'negative',
        }))
        const { error } = await supabase
          .from('reviews')
          .upsert(rows, { onConflict: 'tenant_id,source,external_id' })
        if (error) {
          return { entityId: conn.entity_id, provider: adapter.name, imported: 0, error: error.message }
        }
        return { entityId: conn.entity_id, provider: adapter.name, imported: rows.length }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown'
        return { entityId: conn.entity_id, provider: adapter.name, imported: 0, error: msg }
      }
    })
  )

  const filtered = results.filter((r): r is NonNullable<typeof r> => r !== null)
  return NextResponse.json({ ok: true, processed: filtered.length, results: filtered })
}
