'use client'

import { useState } from 'react'
import type { GiftCardDesignRow } from '@touracore/vouchers'

interface Props {
  tenantId: string
  tenantSlug: string
  tenantName: string
  designs: GiftCardDesignRow[]
  activeVerticals: string[]
}

const PRESET_AMOUNTS = [25, 50, 100, 200]
const VERTICAL_LABEL: Record<string, string> = {
  hospitality: 'Strutture',
  restaurant: 'Ristoranti',
  bike_rental: 'Noleggio Bici',
  experiences: 'Esperienze',
  wellness: 'Wellness',
}

export function GiftCardBuyClient({
  tenantId,
  tenantSlug,
  tenantName,
  designs,
  activeVerticals,
}: Props) {
  const [amount, setAmount] = useState<number>(50)
  const [customAmount, setCustomAmount] = useState<string>('')
  const [recipient, setRecipient] = useState({ email: '', name: '' })
  const [sender, setSender] = useState({ email: '', name: '' })
  const [message, setMessage] = useState('')
  const [designId, setDesignId] = useState<string>(
    designs.find((d) => d.is_system && d.theme_preset === 'elegant')?.id ?? designs[0]?.id ?? '',
  )
  const [verticalScope, setVerticalScope] = useState<string[]>([])
  const [deliverySchedule, setDeliverySchedule] = useState<'now' | 'schedule'>('now')
  const [scheduledAt, setScheduledAt] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const finalAmount = customAmount ? Number(customAmount) : amount
  const selectedDesign = designs.find((d) => d.id === designId)

  const canSubmit =
    finalAmount >= 10 &&
    finalAmount <= 5000 &&
    recipient.email.includes('@') &&
    recipient.name.trim().length > 0 &&
    sender.email.includes('@') &&
    sender.name.trim().length > 0 &&
    acceptTerms &&
    (deliverySchedule === 'now' || scheduledAt !== '') &&
    !submitting

  const submit = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const res = await fetch('/api/public/gift-card/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          amount: finalAmount,
          currency: 'EUR',
          recipientEmail: recipient.email.trim().toLowerCase(),
          recipientName: recipient.name.trim(),
          senderEmail: sender.email.trim().toLowerCase(),
          senderName: sender.name.trim(),
          personalMessage: message.trim() || undefined,
          designId: designId || undefined,
          verticalScope,
          deliveryScheduledAt:
            deliverySchedule === 'schedule' && scheduledAt
              ? new Date(scheduledAt).toISOString()
              : undefined,
          successUrl: `${origin}/gift-card/thanks/{CHECKOUT_SESSION_ID}?tenant=${tenantSlug}`,
          cancelUrl: `${origin}/gift-card/buy/${tenantSlug}`,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Errore durante il checkout')
        setSubmitting(false)
        return
      }
      window.location.assign(data.url)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSubmitting(false)
    }
  }

  const primary = selectedDesign?.primary_color ?? '#0f172a'
  const bg = selectedDesign?.background_value ?? primary
  const emoji = selectedDesign?.accent_emoji ?? '🎁'

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Preview card */}
      <div
        style={{
          background: bg,
          borderRadius: 12,
          padding: 32,
          textAlign: 'center',
          color: '#fff',
          minHeight: 180,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ fontSize: 40 }}>{emoji}</div>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, marginTop: 8 }}>
          Gift Card · {tenantName}
        </div>
        <div style={{ fontSize: 36, fontWeight: 700, marginTop: 6 }}>
          €{finalAmount.toFixed(2)}
        </div>
      </div>

      {/* Amount selector */}
      <Section title="1. Importo">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PRESET_AMOUNTS.map((a) => (
            <button
              key={a}
              onClick={() => {
                setAmount(a)
                setCustomAmount('')
              }}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: amount === a && !customAmount ? '2px solid #2563eb' : '1px solid #d1d5db',
                background: amount === a && !customAmount ? '#eff6ff' : '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              €{a}
            </button>
          ))}
          <input
            type="number"
            min={10}
            max={5000}
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="Altro importo"
            style={{
              padding: 10,
              border: '1px solid #d1d5db',
              borderRadius: 8,
              width: 130,
              fontSize: 14,
            }}
          />
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6b7280' }}>
          Min €10 · Max €5000 · Valida 1 anno dall’acquisto
        </p>
      </Section>

      {/* Design selector */}
      {designs.length > 0 && (
        <Section title="2. Design">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
            {designs.map((d) => {
              const sel = designId === d.id
              return (
                <button
                  key={d.id}
                  onClick={() => setDesignId(d.id)}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    border: sel ? '2px solid #2563eb' : '1px solid #d1d5db',
                    background: d.background_value ?? d.primary_color ?? '#fff',
                    color: '#fff',
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontWeight: 600,
                  }}
                >
                  <div style={{ fontSize: 24 }}>{d.accent_emoji ?? '🎁'}</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>{d.name}</div>
                </button>
              )
            })}
          </div>
        </Section>
      )}

      {/* Scope selector */}
      {activeVerticals.length > 1 && (
        <Section title="3. Dove potrà spenderla (opzionale)">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {activeVerticals.map((v) => {
              const sel = verticalScope.includes(v)
              return (
                <button
                  key={v}
                  onClick={() =>
                    setVerticalScope(
                      sel ? verticalScope.filter((x) => x !== v) : [...verticalScope, v],
                    )
                  }
                  style={{
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: sel ? '1px solid #2563eb' : '1px solid #d1d5db',
                    background: sel ? '#eff6ff' : '#fff',
                    color: sel ? '#2563eb' : '#374151',
                    fontWeight: 500,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {VERTICAL_LABEL[v] ?? v}
                </button>
              )
            })}
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 11, color: '#6b7280' }}>
            Vuoto = utilizzabile per tutti i servizi del tenant
          </p>
        </Section>
      )}

      {/* Recipient */}
      <Section title={`${activeVerticals.length > 1 ? '4' : '3'}. Destinatario`}>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
          <input
            placeholder="Nome *"
            value={recipient.name}
            onChange={(e) => setRecipient({ ...recipient, name: e.target.value })}
            style={inputStyle}
          />
          <input
            type="email"
            placeholder="Email *"
            value={recipient.email}
            onChange={(e) => setRecipient({ ...recipient, email: e.target.value })}
            style={inputStyle}
          />
        </div>
        <textarea
          placeholder="Messaggio personale (opzionale)"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ ...inputStyle, marginTop: 8, width: '100%' }}
        />
      </Section>

      {/* Delivery scheduling */}
      <Section title={`${activeVerticals.length > 1 ? '5' : '4'}. Consegna`}>
        <div style={{ display: 'flex', gap: 16 }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="radio"
              checked={deliverySchedule === 'now'}
              onChange={() => setDeliverySchedule('now')}
            />
            <span>Subito dopo l’acquisto</span>
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="radio"
              checked={deliverySchedule === 'schedule'}
              onChange={() => setDeliverySchedule('schedule')}
            />
            <span>Pianifica (compleanno, anniversario…)</span>
          </label>
        </div>
        {deliverySchedule === 'schedule' && (
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            style={{ ...inputStyle, marginTop: 10 }}
          />
        )}
      </Section>

      {/* Sender */}
      <Section title={`${activeVerticals.length > 1 ? '6' : '5'}. I tuoi dati`}>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
          <input
            placeholder="Il tuo nome *"
            value={sender.name}
            onChange={(e) => setSender({ ...sender, name: e.target.value })}
            style={inputStyle}
          />
          <input
            type="email"
            placeholder="La tua email * (riceverai la ricevuta)"
            value={sender.email}
            onChange={(e) => setSender({ ...sender, email: e.target.value })}
            style={inputStyle}
          />
        </div>
      </Section>

      <label style={{ display: 'flex', gap: 8, fontSize: 13, color: '#4b5563' }}>
        <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
        <span>
          Accetto i termini di utilizzo della gift card. La gift card non è rimborsabile una volta emessa. Scadenza 1 anno
          dalla data di acquisto.
        </span>
      </label>

      {error && (
        <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: 13 }}>
          {error}
        </div>
      )}

      <button
        onClick={submit}
        disabled={!canSubmit}
        style={{
          background: canSubmit ? primary : '#9ca3af',
          color: '#fff',
          border: 'none',
          padding: '14px 24px',
          borderRadius: 10,
          fontSize: 16,
          fontWeight: 700,
          cursor: canSubmit ? 'pointer' : 'not-allowed',
          boxShadow: canSubmit ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
        }}
      >
        {submitting ? 'Reindirizzamento a Stripe…' : `Acquista €${finalAmount.toFixed(2)}`}
      </button>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: 16, background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb' }}>
      <p style={{ margin: '0 0 12px', fontSize: 11, color: '#6b7280', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600 }}>
        {title}
      </p>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: 10,
  border: '1px solid #d1d5db',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'inherit',
}
