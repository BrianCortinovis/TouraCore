'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { getVisibilityContext, hasPermission } from '@touracore/auth/visibility'
import { enqueueNotification } from '@touracore/notifications'
import { logAgencyAction } from '@touracore/audit'

export interface BroadcastInput {
  agencySlug: string
  subject: string
  body: string
  channel: 'email' | 'sms' | 'whatsapp'
  filter: {
    billingMode?: 'client_direct' | 'agency_covered' | null
    module?: string | null
    onlyActive?: boolean
  }
}

export async function sendBroadcastAction(input: BroadcastInput): Promise<{ ok: boolean; error?: string; recipients?: number }> {
  const ctx = await getVisibilityContext()
  if (!ctx.user) return { ok: false, error: 'unauthenticated' }
  if (!hasPermission(ctx, 'tenant.write')) return { ok: false, error: 'forbidden' }

  const supabase = await createServiceRoleClient()
  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name, branding')
    .eq('slug', input.agencySlug)
    .maybeSingle()
  if (!agency) return { ok: false, error: 'agency_not_found' }
  if (agency.id !== ctx.agencyId && !ctx.isPlatformAdmin) return { ok: false, error: 'forbidden' }

  // Lista tenant collegati + billing filter
  const linksQuery = supabase
    .from('agency_tenant_links')
    .select('tenant_id, billing_mode, status')
    .eq('agency_id', agency.id)
    .eq('status', 'active')

  const { data: links } = await linksQuery
  const filtered = (links ?? []).filter((l) => {
    if (input.filter.billingMode && l.billing_mode !== input.filter.billingMode) return false
    return true
  })

  const tenantIds = filtered.map((l) => l.tenant_id as string)
  if (tenantIds.length === 0) return { ok: false, error: 'no_recipients' }

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, billing_email, modules, is_active')
    .in('id', tenantIds)

  const recipients = (tenants ?? []).filter((t) => {
    if (input.filter.onlyActive && !t.is_active) return false
    if (input.filter.module) {
      const modules = (t.modules ?? {}) as Record<string, { active?: boolean }>
      if (!modules[input.filter.module]?.active) return false
    }
    return Boolean(t.billing_email)
  })

  if (recipients.length === 0) return { ok: false, error: 'no_recipients_after_filter' }

  // Crea record broadcast
  const { data: broadcast, error: brErr } = await supabase
    .from('agency_broadcasts')
    .insert({
      agency_id: agency.id,
      subject: input.subject,
      body_html: input.body,
      body_text: input.body.replace(/<[^>]+>/g, ''),
      channel: input.channel,
      segment_filter: input.filter,
      recipients_count: recipients.length,
      status: 'sending',
      sent_by: ctx.user.id,
      sent_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (brErr || !broadcast) return { ok: false, error: brErr?.message ?? 'broadcast_insert_failed' }

  // Enqueue per ogni recipient
  let sentCount = 0
  let failedCount = 0
  const brand = (agency.branding ?? {}) as { color?: string }

  for (const t of recipients) {
    try {
      await enqueueNotification({
        eventKey: 'agency.broadcast',
        templateKey: 'agency.broadcast',
        channel: input.channel,
        scope: 'agency',
        agencyId: agency.id,
        tenantId: t.id,
        recipientEmail: t.billing_email ?? undefined,
        variables: {
          agency: { name: agency.name },
          broadcast: { subject: input.subject, body_html: input.body, body_text: input.body.replace(/<[^>]+>/g, '') },
          brand: { color: brand.color ?? '#4f46e5' },
          tenant: { name: t.name },
        },
        idempotencyKey: `broadcast.${broadcast.id}.${t.id}`,
      })
      sentCount++
    } catch (e) {
      console.warn('[sendBroadcastAction] enqueue failed:', e instanceof Error ? e.message : e)
      failedCount++
    }
  }

  await supabase
    .from('agency_broadcasts')
    .update({
      status: failedCount === recipients.length ? 'failed' : 'sent',
      sent_count: sentCount,
      failed_count: failedCount,
    })
    .eq('id', broadcast.id)

  await logAgencyAction({
    action: 'agency.broadcast_sent',
    actorUserId: ctx.user.id,
    actorEmail: ctx.user.email,
    actorRole: ctx.agencyRole ?? 'agency_member',
    agencyId: agency.id,
    targetType: 'broadcast',
    targetId: broadcast.id,
    metadata: { recipients: recipients.length, channel: input.channel, subject: input.subject },
  })

  revalidatePath(`/a/${input.agencySlug}/broadcast`)
  return { ok: true, recipients: sentCount }
}
