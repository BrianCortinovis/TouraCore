import { type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@touracore/db/server'
import { assertUserOwnsRestaurant, RestaurantAccessError } from '@/lib/restaurant-guard'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * SSE stream KDS items: invia eventi quando order_items status cambia.
 * Polling DB ogni 3s + diff-detection (no realtime DB sub Supabase = simpler).
 * Ideale: Supabase realtime channel; pragmatic: poll-based SSE per ora.
 */
export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get('restaurantId')
  const station = req.nextUrl.searchParams.get('station')
  if (!restaurantId) return new Response('restaurantId required', { status: 400 })

  try {
    await assertUserOwnsRestaurant(restaurantId)
  } catch (e) {
    if (e instanceof RestaurantAccessError) return new Response(e.message, { status: 403 })
    throw e
  }

  const supabase = await createServerSupabaseClient()
  let lastSnapshot = ''
  let alive = true

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      // Heartbeat ogni 25s per evitare timeout proxy
      const heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(`: heartbeat\n\n`)) } catch { /* closed */ }
      }, 25_000)

      async function poll() {
        if (!alive) return
        try {
          let query = supabase
            .from('order_items')
            .select(`
              id, order_id, item_name, qty, notes, status, course_number, station_code, fired_at,
              restaurant_orders!inner(restaurant_id, party_size, table_id)
            `)
            .in('status', ['sent', 'preparing', 'ready'])
            .eq('restaurant_orders.restaurant_id', restaurantId)
            .order('fired_at')

          if (station) query = query.eq('station_code', station)

          const { data: items } = await query
          const snapshot = JSON.stringify(items ?? [])

          if (snapshot !== lastSnapshot) {
            send('items', items ?? [])
            lastSnapshot = snapshot
          }
        } catch (e) {
          send('error', { message: e instanceof Error ? e.message : 'poll error' })
        }

        if (alive) setTimeout(poll, 3000)
      }

      send('connected', { ts: Date.now() })
      void poll()

      // Cleanup
      req.signal.addEventListener('abort', () => {
        alive = false
        clearInterval(heartbeat)
        try { controller.close() } catch { /* already closed */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
