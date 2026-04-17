import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

function authorize(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  if (req.headers.get('x-vercel-cron')) return true
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

/**
 * Cron daily 2AM: ricalcola tier guest_loyalty basato su points_balance.
 * Aggiunge punti earn dai checkout reservations completate ieri.
 */
export async function GET(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createServiceRoleClient()
  const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10)

  // Step 1: Earn points per reservations checked_out yesterday
  const { data: programs } = await admin
    .from('loyalty_programs')
    .select('id, tenant_id, points_per_eur')
    .eq('active', true)

  let earnedTotal = 0
  for (const prog of programs ?? []) {
    const { data: tenantEntities } = await admin
      .from('entities')
      .select('id')
      .eq('tenant_id', prog.tenant_id)

    const entityIds = (tenantEntities ?? []).map((e) => e.id as string)
    if (entityIds.length === 0) continue

    const { data: reservations } = await admin
      .from('reservations')
      .select('id, guest_id, total_amount')
      .in('entity_id', entityIds)
      .eq('status', 'checked_out')
      .eq('actual_check_out::date', yesterday)

    for (const r of reservations ?? []) {
      const pointsEarned = Math.round(Number(r.total_amount) * Number(prog.points_per_eur))
      if (pointsEarned <= 0) continue

      // Get or create guest_loyalty
      const { data: gl } = await admin
        .from('guest_loyalty')
        .select('id, points_balance, points_earned_total')
        .eq('guest_id', r.guest_id)
        .eq('program_id', prog.id)
        .maybeSingle()

      let glId: string
      if (gl) {
        glId = gl.id as string
        await admin.from('guest_loyalty').update({
          points_balance: Number(gl.points_balance) + pointsEarned,
          points_earned_total: Number(gl.points_earned_total) + pointsEarned,
          last_activity_at: new Date().toISOString(),
        }).eq('id', glId)
      } else {
        const { data: newGl } = await admin.from('guest_loyalty').insert({
          guest_id: r.guest_id,
          program_id: prog.id,
          points_balance: pointsEarned,
          points_earned_total: pointsEarned,
          last_activity_at: new Date().toISOString(),
        }).select('id').single()
        if (!newGl) continue
        glId = newGl.id as string
      }

      // Idempotency: skip se già earned per stessa reservation
      const { data: existing } = await admin
        .from('loyalty_transactions')
        .select('id')
        .eq('guest_loyalty_id', glId)
        .eq('source_type', 'reservation')
        .eq('source_id', r.id)
        .maybeSingle()
      if (existing) continue

      await admin.from('loyalty_transactions').insert({
        guest_loyalty_id: glId,
        transaction_type: 'earn',
        points: pointsEarned,
        source_type: 'reservation',
        source_id: r.id,
        notes: `Reservation ${r.id} earn`,
      })
      earnedTotal += pointsEarned
    }
  }

  // Step 2: Tier recalc per all guest_loyalty
  const { data: allGl } = await admin
    .from('guest_loyalty')
    .select('id, program_id, points_balance, current_tier_id')

  let tiersUpdated = 0
  for (const gl of allGl ?? []) {
    const { data: tiers } = await admin
      .from('loyalty_tiers')
      .select('id, min_points')
      .eq('program_id', gl.program_id)
      .lte('min_points', Number(gl.points_balance))
      .order('min_points', { ascending: false })
      .limit(1)

    const newTierId = tiers?.[0]?.id as string | undefined
    if (newTierId && newTierId !== gl.current_tier_id) {
      await admin.from('guest_loyalty').update({ current_tier_id: newTierId }).eq('id', gl.id)
      tiersUpdated++
    }
  }

  return NextResponse.json({ ok: true, earned: earnedTotal, tiersUpdated })
}
