import { createServiceRoleClient } from '@touracore/db/server'
import { decryptJson, signUnsubscribeToken } from './crypto'
import { renderEmail, renderTemplate } from './render'
import {
  resendSend,
  mailgunSend,
  twilioSmsSend,
  twilioWhatsAppSend,
  metaWhatsAppSend,
  slackSend,
  webPushSend,
  type AdapterResult,
  type Channel,
} from './adapters'

export type NotificationScope = 'platform' | 'agency' | 'tenant' | 'system'

export interface EnqueueInput {
  eventKey: string
  templateKey: string
  channel: Channel
  locale?: string
  scope?: NotificationScope
  agencyId?: string | null
  tenantId?: string | null
  recipientUserId?: string | null
  recipientEmail?: string | null
  recipientPhone?: string | null
  recipientPushToken?: string | null
  recipientSlackWebhook?: string | null
  variables?: Record<string, unknown>
  priority?: number
  scheduledAt?: string
  idempotencyKey?: string
}

export interface EnqueueResult {
  ok: boolean
  queueId?: string
  skipped?: boolean
  reason?: string
  error?: string
}

async function isSubscribed(
  userId: string | null | undefined,
  guestEmail: string | null | undefined,
  eventKey: string,
  channel: Channel,
  tenantId?: string | null,
  agencyId?: string | null,
): Promise<boolean> {
  const supabase = await createServiceRoleClient()
  let q = supabase
    .from('notification_preferences')
    .select('enabled, unsubscribed_at')
    .eq('event_key', eventKey)
    .eq('channel', channel)
  if (userId) q = q.eq('user_id', userId)
  else if (guestEmail) q = q.eq('guest_email', guestEmail)
  else return true
  if (tenantId) q = q.eq('tenant_id', tenantId)
  if (agencyId) q = q.eq('agency_id', agencyId)
  const { data } = await q.maybeSingle()
  if (!data) return true // default opt-in
  if (data.unsubscribed_at) return false
  return data.enabled
}

export async function enqueueNotification(input: EnqueueInput): Promise<EnqueueResult> {
  const supabase = await createServiceRoleClient()

  const subscribed = await isSubscribed(
    input.recipientUserId,
    input.recipientEmail,
    input.eventKey,
    input.channel,
    input.tenantId,
    input.agencyId,
  )
  if (!subscribed) {
    return { ok: true, skipped: true, reason: 'unsubscribed' }
  }

  const row = {
    template_key: input.templateKey,
    channel: input.channel,
    locale: input.locale ?? 'it',
    recipient_user_id: input.recipientUserId ?? null,
    recipient_email: input.recipientEmail ?? null,
    recipient_phone: input.recipientPhone ?? null,
    recipient_push_token: input.recipientPushToken ?? null,
    recipient_slack_webhook: input.recipientSlackWebhook ?? null,
    tenant_id: input.tenantId ?? null,
    agency_id: input.agencyId ?? null,
    scope: input.scope ?? 'system',
    event_key: input.eventKey,
    variables: input.variables ?? {},
    priority: input.priority ?? 5,
    scheduled_at: input.scheduledAt ?? new Date().toISOString(),
    status: 'pending',
    idempotency_key: input.idempotencyKey ?? null,
  }

  const { data, error } = await supabase
    .from('notifications_queue')
    .insert(row)
    .select('id')
    .single()

  if (error) {
    // Idempotency: if UNIQUE violation, fetch existing
    if (error.code === '23505' && input.idempotencyKey) {
      const { data: existing } = await supabase
        .from('notifications_queue')
        .select('id')
        .eq('idempotency_key', input.idempotencyKey)
        .maybeSingle()
      if (existing) return { ok: true, queueId: existing.id, skipped: true, reason: 'duplicate' }
    }
    return { ok: false, error: error.message }
  }

  return { ok: true, queueId: data.id }
}

async function resolveTemplate(
  templateKey: string,
  channel: Channel,
  locale: string,
  scope: NotificationScope,
  scopeId: string | null,
): Promise<{ subject: string | null; body_html: string | null; body_text: string | null } | null> {
  const supabase = await createServiceRoleClient()
  // Priority: exact scope > platform fallback
  const candidates: Array<{ scope: string; scope_id: string | null }> = []
  if (scope !== 'system' && scope !== 'platform' && scopeId) {
    candidates.push({ scope, scope_id: scopeId })
  }
  candidates.push({ scope: 'platform', scope_id: null })

  for (const c of candidates) {
    let q = supabase
      .from('notification_templates')
      .select('subject, body_html, body_text, body_mjml, is_active')
      .eq('key', templateKey)
      .eq('channel', channel)
      .eq('locale', locale)
      .eq('scope', c.scope)
      .eq('is_active', true)
    if (c.scope_id) q = q.eq('scope_id', c.scope_id)
    else q = q.is('scope_id', null)
    const { data } = await q.maybeSingle()
    if (data) return data
  }
  // locale fallback: try 'en' if not found
  if (locale !== 'en') {
    return resolveTemplate(templateKey, channel, 'en', scope, scopeId)
  }
  return null
}

async function resolveProvider(
  channel: Channel,
  scope: NotificationScope,
  scopeId: string | null,
): Promise<{ provider: string; config: Record<string, unknown>; from_email?: string; from_name?: string; from_phone?: string; reply_to?: string } | null> {
  const supabase = await createServiceRoleClient()
  const lookups: Array<{ scope: string; scope_id: string | null }> = []
  if (scope !== 'system' && scope !== 'platform' && scopeId) {
    lookups.push({ scope, scope_id: scopeId })
  }
  lookups.push({ scope: 'platform', scope_id: null })

  for (const l of lookups) {
    let q = supabase
      .from('notification_providers')
      .select('provider, config_encrypted, from_email, from_name, from_phone, reply_to')
      .eq('channel', channel)
      .eq('is_active', true)
      .eq('scope', l.scope)
      .order('is_default', { ascending: false })
    if (l.scope_id) q = q.eq('scope_id', l.scope_id)
    else q = q.is('scope_id', null)
    const { data } = await q.limit(1).maybeSingle()
    if (data) {
      try {
        const config = decryptJson<Record<string, unknown>>(data.config_encrypted)
        return {
          provider: data.provider,
          config,
          from_email: data.from_email ?? undefined,
          from_name: data.from_name ?? undefined,
          from_phone: data.from_phone ?? undefined,
          reply_to: data.reply_to ?? undefined,
        }
      } catch (e) {
        console.error('[notifications] provider decrypt failed:', e instanceof Error ? e.message : e)
      }
    }
  }
  return null
}

export async function dispatchQueueItem(queueId: string): Promise<AdapterResult> {
  const supabase = await createServiceRoleClient()
  const { data: item, error: qErr } = await supabase
    .from('notifications_queue')
    .select('*')
    .eq('id', queueId)
    .maybeSingle()
  if (qErr || !item) return { ok: false, provider: 'none', error: 'queue_item_not_found' }

  await supabase
    .from('notifications_queue')
    .update({ status: 'sending', attempts: (item.attempts ?? 0) + 1, updated_at: new Date().toISOString() })
    .eq('id', queueId)

  // In-app: write inbox row
  if (item.channel === 'in_app' && item.recipient_user_id) {
    const title = String(item.variables?.title ?? item.event_key ?? 'Notifica')
    const body = String(item.variables?.body ?? '')
    await supabase.from('notifications_inbox').insert({
      user_id: item.recipient_user_id,
      tenant_id: item.tenant_id,
      agency_id: item.agency_id,
      scope: item.agency_id ? 'agency' : item.tenant_id ? 'tenant' : 'platform',
      category: item.event_key?.split('.')[0] ?? 'system',
      title,
      body,
      action_url: (item.variables?.action_url as string) ?? null,
      metadata: item.variables ?? {},
    })
    await supabase
      .from('notifications_queue')
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .eq('id', queueId)
    await supabase.from('notifications_log').insert({
      queue_id: queueId,
      template_key: item.template_key,
      channel: 'in_app',
      recipient_user_id: item.recipient_user_id,
      tenant_id: item.tenant_id,
      agency_id: item.agency_id,
      provider: 'in_app',
      status: 'sent',
    })
    return { ok: true, provider: 'in_app' }
  }

  const scopeId = item.agency_id ?? item.tenant_id ?? null
  const scope: NotificationScope =
    item.agency_id ? 'agency' : item.tenant_id ? 'tenant' : 'platform'

  const tpl = await resolveTemplate(item.template_key, item.channel, item.locale ?? 'it', scope, scopeId)
  if (!tpl) {
    await supabase
      .from('notifications_queue')
      .update({ status: 'failed', last_error: 'template_not_found', updated_at: new Date().toISOString() })
      .eq('id', queueId)
    return { ok: false, provider: 'none', error: 'template_not_found' }
  }

  const vars = (item.variables ?? {}) as Record<string, unknown>

  // Add unsubscribe link in email vars
  if (item.channel === 'email' && item.recipient_email) {
    const tok = signUnsubscribeToken(item.recipient_email, item.event_key ?? item.template_key)
    vars.unsubscribe_url = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://touracore.vercel.app'}/u/${tok}?e=${encodeURIComponent(item.recipient_email)}&k=${encodeURIComponent(item.event_key ?? item.template_key)}`
  }

  // Resolve provider
  const providerCfg = await resolveProvider(item.channel, scope, scopeId)
  let result: AdapterResult = { ok: false, provider: 'none', error: 'provider_not_configured' }

  if (!providerCfg) {
    // Fallback env: email via Resend, SMS via Twilio, etc.
    if (item.channel === 'email' && process.env.RESEND_API_KEY && item.recipient_email) {
      const rendered = renderEmail(tpl, vars)
      result = await resendSend(
        { apiKey: process.env.RESEND_API_KEY, defaultFrom: process.env.EMAIL_FROM },
        { to: item.recipient_email, subject: rendered.subject, html: rendered.html, text: rendered.text },
      )
    } else {
      await supabase
        .from('notifications_queue')
        .update({ status: 'failed', last_error: 'no_provider', updated_at: new Date().toISOString() })
        .eq('id', queueId)
      return result
    }
  } else {
    switch (item.channel) {
      case 'email': {
        if (!item.recipient_email) { result = { ok: false, provider: providerCfg.provider, error: 'no_recipient_email' }; break }
        const rendered = renderEmail(tpl, vars)
        if (providerCfg.provider === 'resend') {
          result = await resendSend(providerCfg.config as { apiKey: string; defaultFrom?: string }, {
            to: item.recipient_email,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
            from: providerCfg.from_email,
            fromName: providerCfg.from_name,
            replyTo: providerCfg.reply_to,
          })
        } else if (providerCfg.provider === 'mailgun') {
          result = await mailgunSend(providerCfg.config as { apiKey: string; domain: string; region?: 'us' | 'eu' }, {
            to: item.recipient_email,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
            from: providerCfg.from_email,
          })
        }
        break
      }
      case 'sms': {
        if (!item.recipient_phone) { result = { ok: false, provider: providerCfg.provider, error: 'no_phone' }; break }
        const body = renderTemplate(tpl.body_text ?? tpl.body_html ?? '', vars)
        result = await twilioSmsSend(providerCfg.config as { accountSid: string; authToken: string; fromNumber: string }, {
          to: item.recipient_phone,
          body,
          from: providerCfg.from_phone,
        })
        break
      }
      case 'whatsapp': {
        if (!item.recipient_phone) { result = { ok: false, provider: providerCfg.provider, error: 'no_phone' }; break }
        const body = renderTemplate(tpl.body_text ?? '', vars)
        if (providerCfg.provider === 'twilio_wa') {
          result = await twilioWhatsAppSend(providerCfg.config as { accountSid: string; authToken: string; fromNumber: string }, {
            to: item.recipient_phone,
            body,
          })
        } else if (providerCfg.provider === 'meta_wa') {
          result = await metaWhatsAppSend(providerCfg.config as { phoneNumberId: string; accessToken: string; defaultTemplate?: string; defaultLang?: string }, {
            to: item.recipient_phone,
            body,
          })
        }
        break
      }
      case 'push': {
        if (!item.recipient_push_token) { result = { ok: false, provider: providerCfg.provider, error: 'no_push_token' }; break }
        result = await webPushSend(providerCfg.config as { vapidPublicKey: string; vapidPrivateKey: string; subject: string }, {
          token: item.recipient_push_token,
          title: renderTemplate(tpl.subject ?? '', vars),
          body: renderTemplate(tpl.body_text ?? '', vars),
        })
        break
      }
      case 'slack': {
        if (!item.recipient_slack_webhook) { result = { ok: false, provider: 'slack', error: 'no_webhook' }; break }
        result = await slackSend({}, {
          webhookUrl: item.recipient_slack_webhook,
          text: renderTemplate(tpl.body_text ?? '', vars),
        })
        break
      }
    }
  }

  // Update queue + log
  await supabase
    .from('notifications_queue')
    .update({
      status: result.ok ? 'sent' : (item.attempts >= 4 ? 'failed' : 'pending'),
      last_error: result.error ?? null,
      updated_at: new Date().toISOString(),
      scheduled_at: result.ok ? undefined : new Date(Date.now() + Math.pow(2, item.attempts) * 60_000).toISOString(),
    })
    .eq('id', queueId)

  await supabase.from('notifications_log').insert({
    queue_id: queueId,
    template_key: item.template_key,
    channel: item.channel,
    recipient_user_id: item.recipient_user_id,
    recipient_email: item.recipient_email,
    recipient_phone: item.recipient_phone,
    tenant_id: item.tenant_id,
    agency_id: item.agency_id,
    provider: result.provider,
    provider_message_id: result.providerMessageId ?? null,
    status: result.ok ? 'sent' : 'failed',
    error_message: result.error ?? null,
  })

  return result
}

export async function dispatchPending(limit = 25): Promise<{ processed: number; ok: number; failed: number }> {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase
    .from('notifications_queue')
    .select('id')
    .in('status', ['pending'])
    .lte('scheduled_at', new Date().toISOString())
    .lt('attempts', 5)
    .order('priority', { ascending: false })
    .order('scheduled_at', { ascending: true })
    .limit(limit)

  let ok = 0
  let failed = 0
  for (const row of data ?? []) {
    const r = await dispatchQueueItem(row.id)
    if (r.ok) ok++
    else failed++
  }
  return { processed: (data ?? []).length, ok, failed }
}
