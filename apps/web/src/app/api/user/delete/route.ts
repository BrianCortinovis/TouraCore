import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'
import { verifyCsrf } from '@touracore/security/csrf-server'

export const runtime = 'nodejs'

const SOFT_DELETE_GRACE_DAYS = 30

export async function POST(req: NextRequest) {
  if (!(await verifyCsrf())) {
    return NextResponse.json({ error: 'csrf_invalid' }, { status: 403 })
  }
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = await createServerSupabaseClient()
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const ua = req.headers.get('user-agent') ?? null

  const scheduledHardDelete = new Date(
    Date.now() + SOFT_DELETE_GRACE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()

  // Upsert deletion request (idempotent — 2nd call extends nothing)
  const { error: delErr } = await supabase
    .from('user_deletion_requests')
    .upsert(
      {
        user_id: user.id,
        scheduled_hard_delete_at: scheduledHardDelete,
        ip_address: ip,
        user_agent: ua,
        canceled_at: null,
      },
      { onConflict: 'user_id' }
    )

  if (delErr) {
    return NextResponse.json(
      { error: 'deletion_schedule_failed', detail: delErr.message },
      { status: 500 }
    )
  }

  // Audit DSAR
  await supabase.from('dsar_requests').insert({
    user_id: user.id,
    request_type: 'delete',
    status: 'processing',
    ip_address: ip,
    user_agent: ua,
    request_payload: {
      soft_delete_grace_days: SOFT_DELETE_GRACE_DAYS,
      scheduled_hard_delete_at: scheduledHardDelete,
    },
  })

  return NextResponse.json({
    ok: true,
    scheduled_hard_delete_at: scheduledHardDelete,
    grace_period_days: SOFT_DELETE_GRACE_DAYS,
    message:
      'Il tuo account sarà cancellato definitivamente tra 30 giorni. Effettua il login in questo periodo per annullare la richiesta.',
  })
}

// Cancel pending deletion
export async function DELETE() {
  if (!(await verifyCsrf())) {
    return NextResponse.json({ error: 'csrf_invalid' }, { status: 403 })
  }
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('user_deletion_requests')
    .update({ canceled_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('hard_deleted_at', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase.from('dsar_requests').insert({
    user_id: user.id,
    request_type: 'revoke_consent',
    status: 'completed',
    completed_at: new Date().toISOString(),
    request_payload: { action: 'cancel_deletion' },
  })

  return NextResponse.json({ ok: true })
}
