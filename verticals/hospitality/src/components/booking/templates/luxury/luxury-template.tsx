'use client'

import { useState } from 'react'
import { useBookingFlow, type BookingContext, type BookingFlowAdapter, themeToStyle, formatMoney, formatDate, mapLocale, nightsBetween } from '../../core'
import { BkButton, BkInput, BkLabel, BkBadge, BkSpinKeyframes } from '../../core/ui'

export interface LuxuryTemplateProps {
  context: BookingContext
  adapter: BookingFlowAdapter
  initialCheckIn?: string
  initialCheckOut?: string
  initialGuests?: number
}

export function LuxuryTemplate(props: LuxuryTemplateProps) {
  const locale = mapLocale(props.context.property.default_language)
  const currency = props.context.property.default_currency
  const flow = useBookingFlow({
    context: props.context,
    adapter: props.adapter,
    initialCheckIn: props.initialCheckIn,
    initialCheckOut: props.initialCheckOut,
    initialGuests: props.initialGuests,
  })
  const [searchModal, setSearchModal] = useState(false)

  const rootStyle = { ...themeToStyle(props.context.theme), minHeight: '100vh' }
  const heroImg = props.context.theme.hero_image_url || props.context.property.hero_image_url

  return (
    <div style={rootStyle}>
      <BkSpinKeyframes />

      {flow.step === 'search' && (
        <section
          style={{
            position: 'relative',
            minHeight: 560,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: heroImg ? `url(${heroImg}) center/cover no-repeat` : 'linear-gradient(135deg, var(--bk-accent) 0%, var(--bk-text) 100%)',
          }}
        >
          {heroImg && (
            <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${props.context.theme.hero_overlay_opacity})` }} />
          )}
          <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', color: '#fff', maxWidth: 680, padding: '0 20px' }}>
            {props.context.theme.logo_url && (
              <img src={props.context.theme.logo_url} alt={props.context.property.name} style={{ height: 64, marginBottom: 24, filter: 'brightness(0) invert(1)' }} />
            )}
            <h1 style={{ fontSize: 48, fontWeight: 400, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {props.context.property.name}
            </h1>
            {props.context.property.short_description && (
              <p style={{ fontSize: 18, fontWeight: 300, margin: '16px auto 32px', opacity: 0.9 }}>
                {props.context.property.short_description}
              </p>
            )}
            <button
              onClick={() => setSearchModal(true)}
              style={{
                display: 'inline-block',
                padding: '14px 40px',
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                background: 'transparent',
                color: '#fff',
                border: '1.5px solid #fff',
                borderRadius: 'var(--bk-radius)',
                cursor: 'pointer',
                transition: 'all 200ms',
                fontFamily: 'inherit',
              }}
            >
              Check Availability
            </button>
          </div>
        </section>
      )}

      {searchModal && flow.step === 'search' && (
        <SearchModal flow={flow} locale={locale} onClose={() => setSearchModal(false)} />
      )}

      {flow.step === 'results' && <ResultsStep flow={flow} context={props.context} locale={locale} currency={currency} />}
      {flow.step === 'extras' && <ExtrasStep flow={flow} context={props.context} locale={locale} currency={currency} />}
      {flow.step === 'form' && <FormStep flow={flow} context={props.context} locale={locale} currency={currency} />}
      {flow.step === 'confirmation' && <ConfirmationStep flow={flow} locale={locale} currency={currency} />}

      {props.context.theme.show_powered_by && flow.step !== 'search' && (
        <div style={{ textAlign: 'center', padding: 24, fontSize: 12, color: 'var(--bk-muted)' }}>
          Powered by <strong>TouraCore</strong>
        </div>
      )}
    </div>
  )
}

function SearchModal({ flow, locale, onClose }: any) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          padding: 32,
          borderRadius: 'var(--bk-radius)',
          maxWidth: 480,
          width: '100%',
        }}
      >
        <h2 style={{ fontSize: 24, margin: '0 0 20px', fontWeight: 400 }}>Quando desideri soggiornare?</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <BkLabel>Check-in</BkLabel>
            <BkInput type="date" value={flow.selection.checkIn} onChange={(e) => flow.updateSelection({ checkIn: e.target.value })} min={new Date().toISOString().split('T')[0]} />
          </div>
          <div>
            <BkLabel>Check-out</BkLabel>
            <BkInput type="date" value={flow.selection.checkOut} onChange={(e) => flow.updateSelection({ checkOut: e.target.value })} min={flow.selection.checkIn} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <BkLabel>Adulti</BkLabel>
              <BkInput type="number" min={1} value={flow.selection.adults} onChange={(e) => flow.updateSelection({ adults: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <BkLabel>Bambini</BkLabel>
              <BkInput type="number" min={0} value={flow.selection.children} onChange={(e) => flow.updateSelection({ children: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
        </div>
        {flow.searchError && <p style={{ color: '#dc2626', fontSize: 14, marginTop: 12 }}>{flow.searchError}</p>}
        <div style={{ marginTop: 20 }}>
          <BkButton variant="primary" size="lg" onClick={flow.search} loading={flow.searching} style={{ width: '100%' }}>
            Esplora le Suite
          </BkButton>
        </div>
      </div>
    </div>
  )
}

function ResultsStep({ flow, context, locale, currency }: any) {
  const nights = nightsBetween(flow.selection.checkIn, flow.selection.checkOut)
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <p style={{ fontSize: 13, color: 'var(--bk-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
          {formatDate(flow.selection.checkIn, locale)} — {formatDate(flow.selection.checkOut, locale)} · {nights} notti
        </p>
        <h2 style={{ fontSize: 36, fontWeight: 300, margin: '12px 0 0' }}>Le nostre camere</h2>
        <button onClick={() => flow.setStep('search')} style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--bk-accent)', cursor: 'pointer', fontSize: 14, textDecoration: 'underline' }}>Modifica ricerca</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 32 }}>
        {flow.availability.map((item: any) => (
          <article
            key={item.roomTypeId}
            style={{
              background: '#fff',
              borderRadius: 'var(--bk-radius)',
              overflow: 'hidden',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              transition: 'transform 200ms, box-shadow 200ms',
            }}
          >
            <div style={{ aspectRatio: '4/3', background: `url(${item.photos[0] || ''}) center/cover no-repeat`, backgroundColor: '#f3f4f6' }} />
            <div style={{ padding: 24 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                {item.maxOccupancy && <BkBadge>Max {item.maxOccupancy} persone</BkBadge>}
                {item.sizeSqm && <BkBadge>{item.sizeSqm} m²</BkBadge>}
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 400, margin: '0 0 8px' }}>{item.roomTypeName}</h3>
              {item.description && <p style={{ fontSize: 14, color: 'var(--bk-muted)', lineHeight: 1.6, margin: '0 0 20px' }}>{item.description}</p>}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--bk-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>da</div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--bk-text)' }}>
                    {formatMoney(item.totalPrice, currency, locale)}
                  </div>
                </div>
                <BkButton
                  variant="outline"
                  onClick={() => { flow.updateSelection({ roomTypeId: item.roomTypeId }); flow.setStep(context.upsells.length > 0 ? 'extras' : 'form') }}
                  disabled={item.availableRooms < 1}
                >
                  {item.availableRooms < 1 ? 'Non disponibile' : 'Prenota'}
                </BkButton>
              </div>
            </div>
          </article>
        ))}
      </div>

      {flow.availability.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--bk-muted)' }}>Nessuna camera disponibile per le date selezionate.</p>
      )}
    </div>
  )
}

function ExtrasStep({ flow, context, locale, currency }: any) {
  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '60px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <p style={{ fontSize: 13, color: 'var(--bk-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>Esperienze curate</p>
        <h2 style={{ fontSize: 36, fontWeight: 300, margin: '12px 0 0' }}>Rendi il soggiorno unico</h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
        {context.upsells.map((offer: any) => {
          const qty = flow.selection.upsells[offer.id] ?? 0
          return (
            <div
              key={offer.id}
              style={{
                background: '#fff',
                borderRadius: 'var(--bk-radius)',
                overflow: 'hidden',
                boxShadow: qty > 0 ? '0 0 0 2px var(--bk-accent)' : '0 2px 8px rgba(0,0,0,0.05)',
                padding: 20,
                cursor: 'pointer',
              }}
              onClick={() => flow.toggleUpsell(offer.id, qty > 0 ? 0 : 1)}
            >
              <h4 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>{offer.name}</h4>
              {offer.description && <p style={{ fontSize: 13, color: 'var(--bk-muted)', lineHeight: 1.5, margin: '8px 0' }}>{offer.description}</p>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{formatMoney(offer.price, currency, locale)} <span style={{ fontSize: 11, color: 'var(--bk-muted)', fontWeight: 400 }}>/ {pricingLabel(offer.pricing_mode)}</span></span>
                <BkBadge tone={qty > 0 ? 'accent' : 'default'}>{qty > 0 ? 'Aggiunto' : 'Aggiungi'}</BkBadge>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
        <BkButton variant="ghost" onClick={() => flow.setStep('results')}>← Cambia camera</BkButton>
        <BkButton variant="primary" size="lg" onClick={() => flow.setStep('form')}>
          Continua — {formatMoney(flow.pricing.total, currency, locale)}
        </BkButton>
      </div>
    </div>
  )
}

function FormStep({ flow, context, locale, currency }: any) {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h2 style={{ fontSize: 32, fontWeight: 300, margin: 0 }}>Finalizza la prenotazione</h2>
      </div>

      <div style={{ background: '#fafafa', padding: 20, borderRadius: 'var(--bk-radius)', marginBottom: 24, fontSize: 14 }}>
        <div style={{ fontWeight: 600 }}>{flow.selectedAvailability?.roomTypeName}</div>
        <div style={{ color: 'var(--bk-muted)', marginTop: 4 }}>
          {formatDate(flow.selection.checkIn, locale)} → {formatDate(flow.selection.checkOut, locale)} · {flow.pricing.nights} notti
        </div>
        {(() => {
          const tax = computeTouristTax(flow, context)
          const policy = context.touristTax?.paymentPolicy
          const payOnline = policy === 'online_only' || flow.guest.payTouristTaxOnline
          if (tax > 0) {
            return (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--bk-muted)' }}>
                Tassa soggiorno: {formatMoney(tax, currency, locale)} · {payOnline ? 'inclusa online' : 'in struttura'}
              </div>
            )
          }
          return null
        })()}
        <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--bk-accent)', marginTop: 8 }}>
          {(() => {
            const tax = computeTouristTax(flow, context)
            const policy = context.touristTax?.paymentPolicy
            const payOnline = policy === 'online_only' || flow.guest.payTouristTaxOnline
            return formatMoney(flow.pricing.total + (payOnline ? tax : 0), currency, locale)
          })()}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div><BkLabel>Nome</BkLabel><BkInput value={flow.guest.firstName} onChange={(e) => flow.updateGuest({ firstName: e.target.value })} /></div>
        <div><BkLabel>Cognome</BkLabel><BkInput value={flow.guest.lastName} onChange={(e) => flow.updateGuest({ lastName: e.target.value })} /></div>
        <div><BkLabel>Email</BkLabel><BkInput type="email" value={flow.guest.email} onChange={(e) => flow.updateGuest({ email: e.target.value })} /></div>
        <div><BkLabel>Telefono</BkLabel><BkInput type="tel" value={flow.guest.phone} onChange={(e) => flow.updateGuest({ phone: e.target.value })} /></div>
      </div>

      {context.touristTax?.enabled && context.touristTax.paymentPolicy !== 'onsite_only' && (
        <TaxOptionBlock flow={flow} context={context} currency={currency} locale={locale} />
      )}

      <div style={{ marginTop: 20, fontSize: 13 }}>
        <label style={{ display: 'flex', alignItems: 'start', gap: 8 }}>
          <input type="checkbox" checked={flow.guest.privacyConsent} onChange={(e) => flow.updateGuest({ privacyConsent: e.target.checked })} />
          <span>Accetto privacy policy e termini</span>
        </label>
      </div>

      {flow.submitError && <p style={{ color: '#dc2626', fontSize: 14, marginTop: 12 }}>{flow.submitError}</p>}

      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <BkButton variant="ghost" onClick={() => flow.setStep(context.upsells.length > 0 ? 'extras' : 'results')}>← Indietro</BkButton>
        <BkButton variant="primary" size="lg" onClick={() => flow.submit({ requestPayment: true })} loading={flow.submitting}>
          Conferma e paga
        </BkButton>
      </div>
    </div>
  )
}

function computeTouristTax(flow: any, context: any): number {
  const tax = context.touristTax
  if (!tax?.enabled) return 0
  const adults = Number(flow.selection.adults ?? 0)
  const children = Number(flow.selection.children ?? 0)
  const maxNights = Number(tax.maxTaxableNights ?? 5)
  const nights = Math.min(Number(flow.pricing.nights ?? 0), maxNights)
  return (Number(tax.adultRatePerNight ?? 0) * adults + Number(tax.childRatePerNight ?? 0) * children) * nights
}

function TaxOptionBlock({ flow, context, currency, locale }: any) {
  const tax = context.touristTax
  const estimatedTax = computeTouristTax(flow, context)
  if (!tax || !tax.enabled || tax.paymentPolicy === 'onsite_only') return null

  const forceOnline = tax.paymentPolicy === 'online_only'
  const payOnline = forceOnline ? true : Boolean(flow.guest.payTouristTaxOnline)

  return (
    <div style={{ marginTop: 20, padding: 16, background: '#fffbeb', borderRadius: 'var(--bk-radius)', border: '1px solid #fde68a' }}>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#78350f', letterSpacing: '0.02em' }}>
        Tassa di soggiorno · {formatMoney(estimatedTax, currency, locale)}
      </p>
      {forceOnline ? (
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#92400e' }}>
          Inclusa nel pagamento online (obbligatoria).
        </p>
      ) : (
        <label style={{ display: 'flex', alignItems: 'start', gap: 10, marginTop: 10, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={payOnline}
            onChange={(e) => flow.updateGuest({ payTouristTaxOnline: e.target.checked })}
          />
          <span>
            Desidero saldare la tassa di soggiorno ora. Altrimenti sarà pagata in struttura al check-in.
          </span>
        </label>
      )}
    </div>
  )
}

function ConfirmationStep({ flow, locale, currency }: any) {
  if (!flow.confirmation) return null
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 64, fontWeight: 100, color: 'var(--bk-accent)' }}>✓</div>
      <h2 style={{ fontSize: 32, fontWeight: 300, margin: '16px 0 8px' }}>La sua prenotazione è confermata</h2>
      <p style={{ color: 'var(--bk-muted)', fontSize: 14 }}>Codice prenotazione</p>
      <p style={{ fontSize: 20, letterSpacing: '0.1em', fontWeight: 600 }}>{flow.confirmation.reservationCode}</p>
      <div style={{ marginTop: 32, padding: 24, background: '#fafafa', borderRadius: 'var(--bk-radius)' }}>
        <p style={{ margin: 0 }}>{formatDate(flow.confirmation.checkIn, locale)} → {formatDate(flow.confirmation.checkOut, locale)}</p>
        <p style={{ fontSize: 24, fontWeight: 600, color: 'var(--bk-accent)', margin: '12px 0 0' }}>
          {formatMoney(flow.confirmation.totalAmount, currency, locale)}
        </p>
      </div>
    </div>
  )
}

function pricingLabel(mode: string): string {
  return { per_stay: 'soggiorno', per_night: 'notte', per_guest: 'ospite', per_item: 'pezzo', per_hour: 'ora', per_day: 'giorno' }[mode] ?? mode
}
