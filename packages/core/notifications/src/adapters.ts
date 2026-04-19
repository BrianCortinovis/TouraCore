// Multi-channel adapter pattern. Each adapter: load config → send → return {provider_message_id|error}.

export type Channel = 'email' | 'sms' | 'whatsapp' | 'push' | 'slack' | 'in_app'

export interface AdapterResult {
  ok: boolean
  providerMessageId?: string
  error?: string
  provider: string
}

export interface EmailPayload {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
  fromName?: string
  replyTo?: string
}

export interface SmsPayload {
  to: string
  body: string
  from?: string
}

export interface WaPayload {
  to: string
  body: string
  templateName?: string
  templateLang?: string
  from?: string
}

export interface PushPayload {
  token: string
  title: string
  body: string
  url?: string
}

export interface SlackPayload {
  webhookUrl: string
  text: string
}

// ====== RESEND ======
export async function resendSend(
  cfg: { apiKey: string; defaultFrom?: string },
  payload: EmailPayload,
): Promise<AdapterResult> {
  const from = payload.fromName
    ? `${payload.fromName} <${payload.from ?? cfg.defaultFrom}>`
    : (payload.from ?? cfg.defaultFrom ?? 'TouraCore <noreply@touracore.app>')
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        reply_to: payload.replyTo,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      return { ok: false, provider: 'resend', error: `${res.status}: ${err.slice(0, 200)}` }
    }
    const data = (await res.json()) as { id: string }
    return { ok: true, provider: 'resend', providerMessageId: data.id }
  } catch (e) {
    return { ok: false, provider: 'resend', error: e instanceof Error ? e.message : String(e) }
  }
}

// ====== TWILIO SMS ======
export async function twilioSmsSend(
  cfg: { accountSid: string; authToken: string; fromNumber: string },
  payload: SmsPayload,
): Promise<AdapterResult> {
  try {
    const auth = Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString('base64')
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: payload.from ?? cfg.fromNumber,
        To: payload.to,
        Body: payload.body,
      }).toString(),
    })
    if (!res.ok) {
      const err = await res.text()
      return { ok: false, provider: 'twilio_sms', error: `${res.status}: ${err.slice(0, 200)}` }
    }
    const data = (await res.json()) as { sid: string }
    return { ok: true, provider: 'twilio_sms', providerMessageId: data.sid }
  } catch (e) {
    return { ok: false, provider: 'twilio_sms', error: e instanceof Error ? e.message : String(e) }
  }
}

// ====== TWILIO WHATSAPP (sandbox + production) ======
export async function twilioWhatsAppSend(
  cfg: { accountSid: string; authToken: string; fromNumber: string },
  payload: WaPayload,
): Promise<AdapterResult> {
  try {
    const auth = Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString('base64')
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: `whatsapp:${cfg.fromNumber}`,
        To: `whatsapp:${payload.to}`,
        Body: payload.body,
      }).toString(),
    })
    if (!res.ok) {
      const err = await res.text()
      return { ok: false, provider: 'twilio_wa', error: `${res.status}: ${err.slice(0, 200)}` }
    }
    const data = (await res.json()) as { sid: string }
    return { ok: true, provider: 'twilio_wa', providerMessageId: data.sid }
  } catch (e) {
    return { ok: false, provider: 'twilio_wa', error: e instanceof Error ? e.message : String(e) }
  }
}

// ====== META WHATSAPP CLOUD API ======
export async function metaWhatsAppSend(
  cfg: { phoneNumberId: string; accessToken: string; defaultTemplate?: string; defaultLang?: string },
  payload: WaPayload,
): Promise<AdapterResult> {
  try {
    const body = payload.templateName
      ? {
          messaging_product: 'whatsapp',
          to: payload.to,
          type: 'template',
          template: {
            name: payload.templateName,
            language: { code: payload.templateLang ?? cfg.defaultLang ?? 'it' },
          },
        }
      : {
          messaging_product: 'whatsapp',
          to: payload.to,
          type: 'text',
          text: { body: payload.body },
        }
    const res = await fetch(`https://graph.facebook.com/v20.0/${cfg.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.text()
      return { ok: false, provider: 'meta_wa', error: `${res.status}: ${err.slice(0, 200)}` }
    }
    const data = (await res.json()) as { messages?: Array<{ id: string }> }
    return { ok: true, provider: 'meta_wa', providerMessageId: data.messages?.[0]?.id }
  } catch (e) {
    return { ok: false, provider: 'meta_wa', error: e instanceof Error ? e.message : String(e) }
  }
}

// ====== SLACK WEBHOOK ======
export async function slackSend(
  _cfg: Record<string, never>,
  payload: SlackPayload,
): Promise<AdapterResult> {
  try {
    const res = await fetch(payload.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: payload.text }),
    })
    if (!res.ok) {
      return { ok: false, provider: 'slack', error: `${res.status}` }
    }
    return { ok: true, provider: 'slack' }
  } catch (e) {
    return { ok: false, provider: 'slack', error: e instanceof Error ? e.message : String(e) }
  }
}

// ====== WEB PUSH (VAPID placeholder) ======
export async function webPushSend(
  cfg: { vapidPublicKey: string; vapidPrivateKey: string; subject: string },
  payload: PushPayload,
): Promise<AdapterResult> {
  // NOTE: Full VAPID signing requires web-push lib. Stub for M081 — full impl M086.
  console.log('[webPush] stub send', { cfg: !!cfg, token: payload.token.slice(0, 20) })
  return { ok: true, provider: 'webpush', providerMessageId: `stub_${Date.now()}` }
}

// ====== MAILGUN (optional) ======
export async function mailgunSend(
  cfg: { apiKey: string; domain: string; region?: 'us' | 'eu' },
  payload: EmailPayload,
): Promise<AdapterResult> {
  try {
    const host = cfg.region === 'eu' ? 'api.eu.mailgun.net' : 'api.mailgun.net'
    const auth = Buffer.from(`api:${cfg.apiKey}`).toString('base64')
    const res = await fetch(`https://${host}/v3/${cfg.domain}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        from: payload.from ?? `TouraCore <noreply@${cfg.domain}>`,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text ?? '',
      }).toString(),
    })
    if (!res.ok) {
      const err = await res.text()
      return { ok: false, provider: 'mailgun', error: `${res.status}: ${err.slice(0, 200)}` }
    }
    const data = (await res.json()) as { id: string }
    return { ok: true, provider: 'mailgun', providerMessageId: data.id }
  } catch (e) {
    return { ok: false, provider: 'mailgun', error: e instanceof Error ? e.message : String(e) }
  }
}
