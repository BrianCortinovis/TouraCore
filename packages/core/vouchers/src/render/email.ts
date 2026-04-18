import type { CreditInstrumentRow, GiftCardDesignRow } from '../types'

export interface GiftCardEmailContent {
  subject: string
  html: string
  text: string
}

interface RenderContext {
  credit: Pick<
    CreditInstrumentRow,
    | 'kind'
    | 'initial_amount'
    | 'currency'
    | 'code_last4'
    | 'recipient_name'
    | 'sender_name'
    | 'personal_message'
    | 'expires_at'
    | 'vertical_scope'
  >
  design: GiftCardDesignRow | null
  deliveryUrl: string
  tenantName: string
  tenantSupportEmail?: string
}

/**
 * Render branded HTML email for gift card recipient.
 * Applies design tokens (colors, fonts, layout) or falls back to neutral.
 * Plaintext code IS NOT in email — only deliveryUrl JWT link to landing page.
 */
export function renderGiftCardEmail(ctx: RenderContext): GiftCardEmailContent {
  const d = ctx.design
  const amount = `${Number(ctx.credit.initial_amount).toFixed(2)} ${ctx.credit.currency}`
  const primary = d?.primary_color ?? '#0f172a'
  const secondary = d?.secondary_color ?? '#f8fafc'
  const bg = d?.background_value ?? d?.primary_color ?? secondary
  const isGradient = d?.background_style === 'gradient'
  const font = d?.font_family ?? 'Inter, system-ui, sans-serif'
  const emoji = d?.accent_emoji ?? '🎁'
  const layout = d?.layout_variant ?? 'card'
  const recipientName = ctx.credit.recipient_name ?? 'Ciao'
  const senderName = ctx.credit.sender_name ?? ctx.tenantName
  const message = ctx.credit.personal_message ?? d?.default_message ?? 'Hai ricevuto una gift card'
  const expires = ctx.credit.expires_at
    ? new Date(ctx.credit.expires_at).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null
  const scopeLabel = ctx.credit.vertical_scope.length === 0
    ? 'tutti i servizi'
    : ctx.credit.vertical_scope.map((v) => v.replace('_', ' ')).join(', ')

  const subject = `${emoji} Hai ricevuto una gift card da ${senderName} — ${amount}`

  const heroBg = isGradient ? bg : bg
  const textColor = primary === '#000000' || primary === '#0f172a' || primary === '#78350f' || primary === '#b91c1c' || primary === '#0891b2' ? '#ffffff' : '#111827'

  const html = `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:${escapeAttr(font)};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" width="560" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">

          <!-- Hero -->
          <tr>
            <td style="background:${escapeAttr(heroBg)};padding:${layout === 'poster' ? '56px 32px' : '40px 32px'};text-align:center;color:${textColor};">
              <div style="font-size:${layout === 'poster' ? '56px' : '40px'};line-height:1;margin-bottom:12px;">${emoji}</div>
              <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:0.85;">Gift Card</p>
              <h1 style="margin:8px 0 0;font-size:${layout === 'poster' ? '36px' : '28px'};font-weight:700;letter-spacing:-0.5px;">${amount}</h1>
              ${expires ? `<p style="margin:12px 0 0;font-size:12px;opacity:0.75;">Valida fino al ${escapeHtml(expires)}</p>` : ''}
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;color:#111827;">Ciao <strong>${escapeHtml(recipientName)}</strong>,</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#374151;">
                <strong>${escapeHtml(senderName)}</strong> ti ha inviato una gift card da utilizzare su <strong>${escapeHtml(ctx.tenantName)}</strong>.
              </p>
              ${ctx.credit.personal_message ? `
              <blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid ${escapeAttr(primary)};background:#f9fafb;font-style:italic;color:#4b5563;font-size:14px;line-height:1.6;">
                ${escapeHtml(ctx.credit.personal_message)}
              </blockquote>
              ` : ''}
              <p style="margin:24px 0 16px;font-size:14px;color:#374151;">
                Clicca il bottone qui sotto per visualizzare la tua gift card e iniziare a usarla.
                Il codice è riservato e non compare in questa email per motivi di sicurezza.
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${escapeAttr(ctx.deliveryUrl)}" style="display:inline-block;background:${escapeAttr(primary)};color:${textColor};text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:600;font-size:15px;">Visualizza la mia gift card</a>
              </div>
              <p style="margin:16px 0 0;font-size:13px;color:#6b7280;">
                Utilizzabile per: <strong>${escapeHtml(scopeLabel)}</strong><br />
                Terminale utilizzo: <strong>****${escapeHtml(ctx.credit.code_last4)}</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:11px;color:#6b7280;">
                ${d?.footer_text ? escapeHtml(d.footer_text) : 'Se non riconosci questa gift card, ignora questa email.'}
              </p>
              ${ctx.tenantSupportEmail ? `<p style="margin:6px 0 0;font-size:11px;color:#9ca3af;">Supporto: <a href="mailto:${escapeAttr(ctx.tenantSupportEmail)}" style="color:#6b7280;">${escapeHtml(ctx.tenantSupportEmail)}</a></p>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `
${subject}

Ciao ${recipientName},

${senderName} ti ha inviato una gift card da ${amount} da utilizzare su ${ctx.tenantName}.

${ctx.credit.personal_message ? `Messaggio: ${ctx.credit.personal_message}\n` : ''}
Utilizzabile per: ${scopeLabel}
Terminale: ****${ctx.credit.code_last4}
${expires ? `Scadenza: ${expires}` : ''}

Visualizza la gift card e inizia a usarla:
${ctx.deliveryUrl}

Il codice è riservato e non compare in questa email.
  `.trim()

  return { subject, html, text }
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(s: string): string {
  return escapeHtml(s)
}
