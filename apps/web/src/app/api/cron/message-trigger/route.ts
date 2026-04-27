import { NextResponse, type NextRequest } from 'next/server'
import { verifyCronSecret } from "@/lib/cron-auth"
import { createServiceRoleClient } from '@touracore/db/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

function authorize(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  if (request.headers.get('x-vercel-cron')) return true
  return verifyCronSecret(request)
}

/**
 * Message automation trigger: matches eventi (check_in_24h, check_in_today, check_out_today, post_stay_24h)
 * Crea entries in message_queue per ogni reservation+automation match.
 */
export async function GET(request: NextRequest) {
  if (!authorize(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createServiceRoleClient()
  const today = new Date()
  const tomorrow = new Date(today.getTime() + 24 * 3600_000)
  const yesterday = new Date(today.getTime() - 24 * 3600_000)

  const todayStr = today.toISOString().slice(0, 10)
  const tomorrowStr = tomorrow.toISOString().slice(0, 10)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  // Trigger: check_in_24h (reservations check_in tomorrow)
  const { data: checkIn24h } = await admin
    .from('reservations')
    .select('id, entity_id, guest_id, check_in, guests(email, first_name, last_name)')
    .eq('check_in', tomorrowStr)
    .in('status', ['confirmed'])

  // Trigger: check_in_today
  const { data: checkInToday } = await admin
    .from('reservations')
    .select('id, entity_id, guest_id, guests(email, first_name, last_name)')
    .eq('check_in', todayStr)
    .in('status', ['confirmed'])

  // Trigger: check_out_today
  const { data: checkOutToday } = await admin
    .from('reservations')
    .select('id, entity_id, guest_id, guests(email, first_name, last_name)')
    .eq('check_out', todayStr)
    .in('status', ['checked_in'])

  // Trigger: post_stay_24h
  const { data: postStay } = await admin
    .from('reservations')
    .select('id, entity_id, guest_id, guests(email, first_name, last_name)')
    .eq('check_out', yesterdayStr)
    .in('status', ['checked_out'])

  const triggers: Array<{ event: string; rows: Array<{ id: string; entity_id: string; guest_id: string; guests: { email?: string; first_name?: string; last_name?: string } | { email?: string }[] | null }> }> = [
    { event: 'check_in_24h', rows: (checkIn24h ?? []) as never },
    { event: 'check_in_today', rows: (checkInToday ?? []) as never },
    { event: 'check_out_today', rows: (checkOutToday ?? []) as never },
    { event: 'post_stay_24h', rows: (postStay ?? []) as never },
  ]

  let queued = 0
  for (const t of triggers) {
    const { data: automations } = await admin
      .from('message_automations')
      .select('id, entity_id, channel, template_subject, template_body, delay_minutes')
      .eq('trigger_event', t.event)
      .eq('active', true)
    if (!automations || automations.length === 0) continue

    for (const r of t.rows) {
      const automation = automations.find((a) => a.entity_id === r.entity_id)
      if (!automation) continue
      const guest = Array.isArray(r.guests) ? r.guests[0] : r.guests
      const guestObj = guest as { email?: string; first_name?: string; last_name?: string } | null
      const recipient = guestObj?.email
      if (!recipient) continue

      const scheduledFor = new Date(Date.now() + (automation.delay_minutes as number) * 60_000).toISOString()
      const guestName = `${guestObj?.first_name ?? ''} ${guestObj?.last_name ?? ''}`.trim()
      const body = ((automation.template_body as string) ?? 'Ciao {{name}}, conferma {{event}}')
        .replace(/{{name}}/g, guestName || 'ospite')
        .replace(/{{event}}/g, t.event)

      // Idempotency: skip se già queued per stesso reservation+event
      const { data: existing } = await admin
        .from('message_queue')
        .select('id')
        .eq('reservation_id', r.id)
        .eq('subject', (automation.template_subject as string) ?? t.event)
        .maybeSingle()
      if (existing) continue

      await admin.from('message_queue').insert({
        entity_id: r.entity_id,
        reservation_id: r.id,
        guest_id: r.guest_id,
        channel: automation.channel,
        recipient,
        subject: (automation.template_subject as string) ?? t.event,
        body,
        scheduled_for: scheduledFor,
        status: 'pending',
      })
      queued++
    }
  }

  return NextResponse.json({ ok: true, queued })
}
