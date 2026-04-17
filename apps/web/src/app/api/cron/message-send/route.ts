import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

function authorize(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  if (request.headers.get('x-vercel-cron')) return true
  return request.headers.get('authorization') === `Bearer ${cronSecret}`
}

/**
 * Send pending messages from queue via Resend.
 */
export async function GET(request: NextRequest) {
  if (!authorize(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ ok: false, error: 'RESEND_API_KEY missing' }, { status: 500 })

  const admin = await createServiceRoleClient()

  const { data: messages } = await admin
    .from('message_queue')
    .select('id, channel, recipient, subject, body, attempts')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .lt('attempts', 3)
    .limit(50)

  if (!messages || messages.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  let sent = 0
  let failed = 0

  for (const m of messages) {
    if (m.channel !== 'email') {
      await admin.from('message_queue').update({ status: 'failed', last_error: `Channel ${m.channel} not implemented` }).eq('id', m.id)
      failed++
      continue
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL ?? 'noreply@touracore.com',
          to: m.recipient,
          subject: (m.subject as string) ?? 'Notifica',
          text: m.body,
        }),
      })

      if (res.ok) {
        await admin.from('message_queue').update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          attempts: (m.attempts as number) + 1,
        }).eq('id', m.id)
        sent++
      } else {
        const errText = await res.text().catch(() => res.statusText)
        await admin.from('message_queue').update({
          status: (m.attempts as number) + 1 >= 3 ? 'failed' : 'pending',
          attempts: (m.attempts as number) + 1,
          last_error: `HTTP ${res.status}: ${errText.slice(0, 200)}`,
        }).eq('id', m.id)
        failed++
      }
    } catch (e) {
      await admin.from('message_queue').update({
        attempts: (m.attempts as number) + 1,
        last_error: e instanceof Error ? e.message : 'Send error',
      }).eq('id', m.id)
      failed++
    }
  }

  return NextResponse.json({ ok: true, sent, failed })
}
