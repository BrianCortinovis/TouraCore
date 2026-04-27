import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from "@/lib/cron-auth"
import { createServiceRoleClient } from '@touracore/db/server'
import type { VEvent } from 'node-ical'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

interface IcalFeedRow {
  id: string
  entity_id: string
  room_id: string | null
  room_type_id: string | null
  url: string
  sync_interval_minutes: number
  last_synced_at: string | null
}

function authorize(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  if (request.headers.get('x-vercel-cron')) return true
  return verifyCronSecret(request)
}

function toDateOnly(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function minusOneDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - 1)
  return toDateOnly(d)
}

async function pickRoomId(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  feed: IcalFeedRow
): Promise<string | null> {
  if (feed.room_id) return feed.room_id
  if (feed.room_type_id) {
    const { data } = await supabase
      .from('rooms')
      .select('id')
      .eq('room_type_id', feed.room_type_id)
      .eq('is_active', true)
      .order('room_number', { ascending: true })
      .limit(1)
      .maybeSingle()
    return data?.id ?? null
  }
  const { data } = await supabase
    .from('rooms')
    .select('id')
    .eq('entity_id', feed.entity_id)
    .eq('is_active', true)
    .order('room_number', { ascending: true })
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
}

async function syncFeed(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  feed: IcalFeedRow
): Promise<{ imported: number; updated: number; skipped: number }> {
  const response = await fetch(feed.url, {
    headers: { 'User-Agent': 'TouraCore-iCal-Sync/1.0' },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${feed.url}`)
  }
  const text = await response.text()
  const { sync: icalSync } = await import('node-ical')
  const parsed = icalSync.parseICS(text)

  const roomId = await pickRoomId(supabase, feed)
  if (!roomId) {
    throw new Error('No room resolvable for feed (set room_id or ensure entity has rooms)')
  }

  let imported = 0
  let updated = 0
  let skipped = 0
  const seenUids = new Set<string>()

  for (const key of Object.keys(parsed)) {
    const event = parsed[key] as VEvent | undefined
    if (!event || event.type !== 'VEVENT') continue
    if (!event.uid || !event.start || !event.end) {
      skipped++
      continue
    }
    const uid = event.uid
    seenUids.add(uid)

    const dateFrom = toDateOnly(new Date(event.start))
    const dateToExclusive = toDateOnly(new Date(event.end))
    const dateTo = minusOneDay(dateToExclusive)

    if (dateTo < dateFrom) {
      skipped++
      continue
    }

    const summary = typeof event.summary === 'string' ? event.summary : ''
    const description = typeof event.description === 'string' ? event.description : null
    const isBlock = /block|unavailable|closed|not available|chiuso/i.test(summary)
    const blockType = isBlock ? 'other' : 'other'

    const { data: existing } = await supabase
      .from('room_blocks')
      .select('id, date_from, date_to, reason, notes')
      .eq('ical_feed_id', feed.id)
      .eq('ical_uid', uid)
      .maybeSingle()

    if (existing) {
      const changed =
        existing.date_from !== dateFrom ||
        existing.date_to !== dateTo ||
        existing.reason !== summary ||
        existing.notes !== description
      if (changed) {
        await supabase
          .from('room_blocks')
          .update({
            date_from: dateFrom,
            date_to: dateTo,
            reason: summary,
            notes: description,
          })
          .eq('id', existing.id)
        updated++
      }
    } else {
      const { error } = await supabase.from('room_blocks').insert({
        entity_id: feed.entity_id,
        room_id: roomId,
        block_type: blockType,
        date_from: dateFrom,
        date_to: dateTo,
        reason: summary || 'Imported from iCal',
        notes: description,
        ical_feed_id: feed.id,
        ical_uid: uid,
      })
      if (!error) imported++
      else skipped++
    }
  }

  if (seenUids.size > 0) {
    const { data: existingBlocks } = await supabase
      .from('room_blocks')
      .select('id, ical_uid')
      .eq('ical_feed_id', feed.id)
      .not('ical_uid', 'is', null)

    const stale = (existingBlocks ?? []).filter((b) => b.ical_uid && !seenUids.has(b.ical_uid))
    if (stale.length > 0) {
      await supabase
        .from('room_blocks')
        .delete()
        .in(
          'id',
          stale.map((b) => b.id)
        )
    }
  }

  return { imported, updated, skipped }
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceRoleClient()
  const nowIso = new Date().toISOString()

  const { data: feeds, error } = await supabase
    .from('ical_feeds')
    .select('id, entity_id, room_id, room_type_id, url, sync_interval_minutes, last_synced_at')
    .eq('direction', 'import')
    .eq('is_active', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const dueFeeds = (feeds ?? []).filter((f) => {
    if (!f.last_synced_at) return true
    const next = new Date(f.last_synced_at).getTime() + (f.sync_interval_minutes ?? 60) * 60_000
    return Date.now() >= next
  })

  const results: Array<{
    feedId: string
    status: 'success' | 'error'
    imported?: number
    updated?: number
    skipped?: number
    error?: string
  }> = []

  for (const feed of dueFeeds) {
    try {
      const stats = await syncFeed(supabase, feed)
      const total = stats.imported + stats.updated
      await supabase
        .from('ical_feeds')
        .update({
          last_synced_at: nowIso,
          last_sync_error: null,
          last_sync_count: total,
        })
        .eq('id', feed.id)

      await supabase.from('channel_sync_logs').insert({
        entity_id: feed.entity_id,
        sync_type: 'ical.import',
        direction: 'inbound',
        status: 'success',
        details: {
          feed_id: feed.id,
          imported: stats.imported,
          updated: stats.updated,
          skipped: stats.skipped,
        },
      })

      results.push({ feedId: feed.id, status: 'success', ...stats })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      await supabase
        .from('ical_feeds')
        .update({
          last_synced_at: nowIso,
          last_sync_error: message,
        })
        .eq('id', feed.id)

      await supabase.from('channel_sync_logs').insert({
        entity_id: feed.entity_id,
        sync_type: 'ical.import',
        direction: 'inbound',
        status: 'error',
        error_message: message,
        details: { feed_id: feed.id, url: feed.url },
      })

      results.push({ feedId: feed.id, status: 'error', error: message })
    }
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    total_active: feeds?.length ?? 0,
    results,
  })
}
