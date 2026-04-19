'use client'

import { useBookingFlow, type BookingContext, type BookingFlowAdapter, themeToStyle, formatMoney, formatDate, mapLocale, nightsBetween } from '../../core'
import { BkButton, BkInput, BkLabel, BkBadge, BkSpinKeyframes } from '../../core/ui'

export interface MobileTemplateProps {
  context: BookingContext
  adapter: BookingFlowAdapter
  initialCheckIn?: string
  initialCheckOut?: string
  initialGuests?: number
}

export function MobileTemplate(props: MobileTemplateProps) {
  const locale = mapLocale(props.context.property.default_language)
  const currency = props.context.property.default_currency
  const flow = useBookingFlow({
    context: props.context,
    adapter: props.adapter,
    initialCheckIn: props.initialCheckIn,
    initialCheckOut: props.initialCheckOut,
    initialGuests: props.initialGuests,
  })
  const rootStyle = { ...themeToStyle(props.context.theme), minHeight: '100vh', paddingBottom: 100 }

  return (
    <div style={rootStyle}>
      <BkSpinKeyframes />
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px' }}>
        <TopBar property={props.context.property} theme={props.context.theme} />
        {flow.step === 'search' && <SearchStep flow={flow} locale={locale} />}
        {flow.step === 'results' && <ResultsStep flow={flow} context={props.context} locale={locale} currency={currency} />}
        {flow.step === 'extras' && <ExtrasStep flow={flow} context={props.context} locale={locale} currency={currency} />}
        {flow.step === 'form' && <FormStep flow={flow} context={props.context} locale={locale} currency={currency} />}
        {flow.step === 'confirmation' && <ConfirmationStep flow={flow} locale={locale} currency={currency} />}
      </div>

      {flow.step !== 'search' && flow.step !== 'confirmation' && flow.selectedAvailability && (
        <StickyFooter flow={flow} context={props.context} locale={locale} currency={currency} />
      )}

      {props.context.theme.show_powered_by && flow.step === 'confirmation' && (
        <div style={{ textAlign: 'center', padding: 20, fontSize: 11, color: 'var(--bk-muted)' }}>
          Powered by <strong>TouraCore</strong>
        </div>
      )}
    </div>
  )
}

function TopBar({ property, theme }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      {theme.logo_url && <img src={theme.logo_url} alt={property.name} style={{ height: 32 }} />}
      <div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{property.name}</div>
        {property.short_description && <div style={{ fontSize: 12, color: 'var(--bk-muted)' }}>{property.short_description}</div>}
      </div>
    </div>
  )
}

function SearchStep({ flow, locale }: any) {
  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 700, margin: '8px 0 20px', lineHeight: 1.2 }}>
        Quando vuoi<br />soggiornare?
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <BkLabel>Check-in</BkLabel>
          <BkInput type="date" value={flow.selection.checkIn} onChange={(e) => flow.updateSelection({ checkIn: e.target.value })} min={new Date().toISOString().split('T')[0]} style={{ fontSize: 17 }} />
        </div>
        <div>
          <BkLabel>Check-out</BkLabel>
          <BkInput type="date" value={flow.selection.checkOut} onChange={(e) => flow.updateSelection({ checkOut: e.target.value })} min={flow.selection.checkIn} style={{ fontSize: 17 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <BkLabel>Adulti</BkLabel>
            <BkInput type="number" min={1} value={flow.selection.adults} onChange={(e) => flow.updateSelection({ adults: parseInt(e.target.value) || 1 })} style={{ fontSize: 17 }} />
          </div>
          <div>
            <BkLabel>Bambini</BkLabel>
            <BkInput type="number" min={0} value={flow.selection.children} onChange={(e) => flow.updateSelection({ children: parseInt(e.target.value) || 0 })} style={{ fontSize: 17 }} />
          </div>
        </div>
      </div>
      {flow.searchError && <p style={{ color: '#dc2626', fontSize: 14, marginTop: 12 }}>{flow.searchError}</p>}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: 16, background: 'var(--bk-bg)', borderTop: '1px solid #e5e7eb', zIndex: 20 }}>
        <BkButton variant="primary" size="lg" onClick={flow.search} loading={flow.searching} style={{ width: '100%' }}>
          Cerca camere →
        </BkButton>
      </div>
    </div>
  )
}

function ResultsStep({ flow, context, locale, currency }: any) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--bk-muted)', marginBottom: 16 }}>
        <button onClick={() => flow.setStep('search')} style={{ background: 'none', border: 'none', color: 'var(--bk-accent)', cursor: 'pointer', padding: 0 }}>← Modifica</button>
        <span>·</span>
        <span>{nightsBetween(flow.selection.checkIn, flow.selection.checkOut)} notti · {flow.selection.adults + flow.selection.children} ospiti</span>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 12px' }}>Scegli la camera</h2>

      {flow.availability.map((item: any) => {
        const isSelected = flow.selection.roomTypeId === item.roomTypeId
        return (
          <button
            key={item.roomTypeId}
            onClick={() => flow.updateSelection({ roomTypeId: item.roomTypeId })}
            disabled={item.availableRooms < 1}
            style={{
              width: '100%',
              textAlign: 'left',
              background: '#fff',
              borderRadius: 'var(--bk-radius)',
              border: isSelected ? '2px solid var(--bk-accent)' : '1px solid #e5e7eb',
              padding: 0,
              overflow: 'hidden',
              marginBottom: 12,
              cursor: item.availableRooms < 1 ? 'not-allowed' : 'pointer',
              opacity: item.availableRooms < 1 ? 0.5 : 1,
              fontFamily: 'inherit',
            }}
          >
            {item.photos[0] && (
              <img src={item.photos[0]} alt={item.roomTypeName} style={{ width: '100%', height: 180, objectFit: 'cover' }} />
            )}
            <div style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--bk-text)' }}>{item.roomTypeName}</div>
                  <div style={{ fontSize: 12, color: 'var(--bk-muted)', marginTop: 2 }}>Max {item.maxOccupancy} · {item.sizeSqm ? `${item.sizeSqm}m²` : ''}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--bk-accent)' }}>
                    {formatMoney(item.totalPrice, currency, locale)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--bk-muted)' }}>totale</div>
                </div>
              </div>
              {item.availableRooms <= 2 && item.availableRooms > 0 && (
                <div style={{ marginTop: 8 }}><BkBadge tone="warning">Solo {item.availableRooms} rimaste</BkBadge></div>
              )}
            </div>
          </button>
        )
      })}

      {flow.availability.length === 0 && (
        <p style={{ color: 'var(--bk-muted)', textAlign: 'center', padding: 40 }}>Nessuna camera disponibile.</p>
      )}
    </div>
  )
}

function ExtrasStep({ flow, context, locale, currency }: any) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--bk-muted)', marginBottom: 16 }}>
        <button onClick={() => flow.setStep('results')} style={{ background: 'none', border: 'none', color: 'var(--bk-accent)', cursor: 'pointer', padding: 0 }}>← Camera</button>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>Vuoi aggiungere qualcosa?</h2>
      <p style={{ fontSize: 13, color: 'var(--bk-muted)', margin: '0 0 16px' }}>Opzionale. Puoi sempre saltare.</p>

      {context.upsells.map((offer: any) => {
        const qty = flow.selection.upsells[offer.id] ?? 0
        return (
          <div
            key={offer.id}
            style={{
              background: '#fff',
              borderRadius: 'var(--bk-radius)',
              border: qty > 0 ? '2px solid var(--bk-accent)' : '1px solid #e5e7eb',
              padding: 12,
              marginBottom: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{offer.name}</div>
              {offer.description && <div style={{ fontSize: 12, color: 'var(--bk-muted)', marginTop: 2 }}>{offer.description}</div>}
              <div style={{ fontSize: 13, marginTop: 4 }}><strong>{formatMoney(offer.price, currency, locale)}</strong> <span style={{ color: 'var(--bk-muted)', fontSize: 11 }}>/ {pricingLabel(offer.pricing_mode)}</span></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <BkButton size="sm" variant="outline" onClick={() => flow.toggleUpsell(offer.id, Math.max(0, qty - 1))} style={{ minWidth: 34, padding: 6 }}>−</BkButton>
              <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 700 }}>{qty}</span>
              <BkButton size="sm" variant="outline" onClick={() => flow.toggleUpsell(offer.id, qty + 1)} style={{ minWidth: 34, padding: 6 }}>+</BkButton>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function FormStep({ flow, context, locale, currency }: any) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--bk-muted)', marginBottom: 16 }}>
        <button onClick={() => flow.setStep(context.upsells.length > 0 ? 'extras' : 'results')} style={{ background: 'none', border: 'none', color: 'var(--bk-accent)', cursor: 'pointer', padding: 0 }}>← Indietro</button>
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 16px' }}>I tuoi dati</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div><BkLabel>Nome</BkLabel><BkInput value={flow.guest.firstName} onChange={(e) => flow.updateGuest({ firstName: e.target.value })} style={{ fontSize: 17 }} /></div>
        <div><BkLabel>Cognome</BkLabel><BkInput value={flow.guest.lastName} onChange={(e) => flow.updateGuest({ lastName: e.target.value })} style={{ fontSize: 17 }} /></div>
        <div><BkLabel>Email</BkLabel><BkInput type="email" inputMode="email" value={flow.guest.email} onChange={(e) => flow.updateGuest({ email: e.target.value })} style={{ fontSize: 17 }} /></div>
        <div><BkLabel>Telefono</BkLabel><BkInput type="tel" inputMode="tel" value={flow.guest.phone} onChange={(e) => flow.updateGuest({ phone: e.target.value })} style={{ fontSize: 17 }} /></div>
      </div>
      {context.touristTax?.enabled && context.touristTax.paymentPolicy !== 'onsite_only' && (
        <TaxOptionBlock flow={flow} context={context} currency={currency} locale={locale} />
      )}
      <div style={{ marginTop: 14, fontSize: 13 }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'start' }}>
          <input type="checkbox" checked={flow.guest.privacyConsent} onChange={(e) => flow.updateGuest({ privacyConsent: e.target.checked })} style={{ marginTop: 3 }} />
          <span>Accetto privacy policy e termini</span>
        </label>
      </div>
      {flow.submitError && <p style={{ color: '#dc2626', fontSize: 13, marginTop: 10 }}>{flow.submitError}</p>}
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
    <div style={{ marginTop: 16, padding: 12, background: '#fffbeb', borderRadius: 'var(--bk-radius)', border: '1px solid #fde68a' }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#78350f' }}>
        Tassa di soggiorno · {formatMoney(estimatedTax, currency, locale)}
      </p>
      {forceOnline ? (
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#92400e' }}>
          Inclusa obbligatoria nel pagamento online.
        </p>
      ) : (
        <label style={{ display: 'flex', alignItems: 'start', gap: 8, marginTop: 8, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={payOnline}
            onChange={(e) => flow.updateGuest({ payTouristTaxOnline: e.target.checked })}
            style={{ marginTop: 3 }}
          />
          <span>Paga la tassa adesso</span>
        </label>
      )}
    </div>
  )
}

function ConfirmationStep({ flow, locale, currency }: any) {
  if (!flow.confirmation) return null
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 64, color: 'var(--bk-accent)' }}>✓</div>
      <h2 style={{ fontSize: 24, margin: '12px 0 4px' }}>Prenotato!</h2>
      <p style={{ color: 'var(--bk-muted)', fontSize: 13, margin: 0 }}>Codice</p>
      <p style={{ fontSize: 18, fontWeight: 700 }}>{flow.confirmation.reservationCode}</p>
      <div style={{ marginTop: 20, padding: 16, background: '#f9fafb', borderRadius: 'var(--bk-radius)', fontSize: 14 }}>
        {formatDate(flow.confirmation.checkIn, locale)} → {formatDate(flow.confirmation.checkOut, locale)}
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--bk-accent)', marginTop: 8 }}>
          {formatMoney(flow.confirmation.totalAmount, currency, locale)}
        </div>
      </div>
    </div>
  )
}

function StickyFooter({ flow, context, locale, currency }: any) {
  const onNext = () => {
    if (flow.step === 'results') flow.setStep('extras')
    else if (flow.step === 'extras') flow.setStep('form')
    else if (flow.step === 'form') flow.submit({ requestPayment: true })
  }
  const label = flow.step === 'form' ? 'Prenota e paga' : flow.step === 'extras' ? 'Continua →' : 'Continua →'
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 14,
        background: 'var(--bk-bg)',
        borderTop: '1px solid #e5e7eb',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontSize: 11, color: 'var(--bk-muted)' }}>Totale</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--bk-accent)' }}>
          {(() => {
            const tax = computeTouristTax(flow, context)
            const policy = context?.touristTax?.paymentPolicy
            const payOnline = policy === 'online_only' || flow.guest.payTouristTaxOnline
            return formatMoney(flow.pricing.total + (payOnline ? tax : 0), currency, locale)
          })()}
        </div>
      </div>
      <BkButton variant="primary" size="lg" onClick={onNext} loading={flow.submitting} disabled={flow.step === 'results' && !flow.selection.roomTypeId}>
        {label}
      </BkButton>
    </div>
  )
}

function pricingLabel(mode: string): string {
  return { per_stay: 'soggiorno', per_night: 'notte', per_guest: 'ospite', per_item: 'pezzo', per_hour: 'ora', per_day: 'giorno' }[mode] ?? mode
}
