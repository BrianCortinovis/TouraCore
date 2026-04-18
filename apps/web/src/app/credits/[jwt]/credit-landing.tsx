import Link from 'next/link'
import type { CreditInstrumentRow, GiftCardDesignRow } from '@touracore/vouchers'

interface Props {
  credit: CreditInstrumentRow
  design: GiftCardDesignRow | null
  tenantName: string
  tenantSlug: string
}

export function CreditLanding({ credit, design, tenantName, tenantSlug }: Props) {
  const primary = design?.primary_color ?? '#0f172a'
  const bg = design?.background_value ?? design?.primary_color ?? '#f3f4f6'
  const emoji = design?.accent_emoji ?? '🎁'
  const font = design?.font_family ?? 'Inter, system-ui, sans-serif'
  const amount = Number(credit.initial_amount).toFixed(2)
  const balance = Number(credit.current_balance).toFixed(2)
  const expires = credit.expires_at
    ? new Date(credit.expires_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
    : null
  const isStored = credit.kind !== 'promo_code'
  const textColor =
    primary === '#000000' || primary === '#0f172a' || primary === '#78350f' || primary === '#b91c1c' || primary === '#0891b2'
      ? '#ffffff'
      : '#111827'

  return (
    <div style={{ fontFamily: font, minHeight: '100vh', background: '#f3f4f6' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 16px' }}>
        <div
          style={{
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            background: '#fff',
          }}
        >
          {/* Hero card */}
          <div style={{ background: bg, padding: 48, textAlign: 'center', color: textColor }}>
            <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 12 }}>{emoji}</div>
            <p style={{ margin: 0, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.85 }}>
              {credit.kind === 'gift_card'
                ? 'Gift Card'
                : credit.kind === 'voucher'
                  ? 'Voucher'
                  : credit.kind === 'promo_code'
                    ? 'Promo Code'
                    : 'Store Credit'}
            </p>
            <h1 style={{ margin: '10px 0 0', fontSize: 40, fontWeight: 700, letterSpacing: -0.5 }}>
              {isStored ? `€${balance}` : `${credit.discount_value}${credit.discount_type === 'percent' ? '%' : '€'}`}
            </h1>
            {isStored && balance !== amount && (
              <p style={{ margin: '8px 0 0', fontSize: 12, opacity: 0.75 }}>
                Iniziale €{amount}
              </p>
            )}
            {expires && (
              <p style={{ margin: '16px 0 0', fontSize: 12, opacity: 0.75 }}>
                Valida fino al {expires}
              </p>
            )}
          </div>

          {/* Body */}
          <div style={{ padding: 32 }}>
            {credit.recipient_name && (
              <p style={{ margin: '0 0 12px', fontSize: 15, color: '#111827' }}>
                Per <strong>{credit.recipient_name}</strong>
                {credit.sender_name && <> da <strong>{credit.sender_name}</strong></>}
              </p>
            )}

            {credit.personal_message && (
              <blockquote
                style={{
                  margin: '16px 0',
                  padding: '12px 16px',
                  borderLeft: `3px solid ${primary}`,
                  background: '#f9fafb',
                  fontStyle: 'italic',
                  color: '#4b5563',
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                {credit.personal_message}
              </blockquote>
            )}

            <div
              style={{
                marginTop: 24,
                padding: 16,
                border: '1px dashed #d1d5db',
                borderRadius: 8,
                background: '#fafafa',
              }}
            >
              <p style={{ margin: 0, fontSize: 11, color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase' }}>
                Il tuo codice
              </p>
              <p style={{ margin: '6px 0 0', fontFamily: 'monospace', fontSize: 18, fontWeight: 700, letterSpacing: 4, color: '#111827' }}>
                ****-****-****-{credit.code_last4}
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 11, color: '#9ca3af' }}>
                Il codice completo ti è stato mostrato al momento dell'acquisto o inviato via email separata.
              </p>
            </div>

            <div style={{ marginTop: 28, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link
                href={tenantSlug ? `/book/multi/${tenantSlug}` : '#'}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  background: primary,
                  color: textColor,
                  textDecoration: 'none',
                  padding: '12px 24px',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                Usa su {tenantName}
              </Link>
            </div>

            <p style={{ margin: '24px 0 0', fontSize: 11, color: '#6b7280' }}>
              Utilizzabile per:{' '}
              <strong>
                {credit.vertical_scope.length === 0
                  ? 'tutti i servizi'
                  : credit.vertical_scope.map((v) => v.replace('_', ' ')).join(', ')}
              </strong>
            </p>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: 20,
              background: '#f9fafb',
              borderTop: '1px solid #e5e7eb',
              textAlign: 'center',
              fontSize: 11,
              color: '#6b7280',
            }}
          >
            {design?.footer_text ?? 'Emessa tramite TouraCore'}
          </div>
        </div>
      </div>
    </div>
  )
}
