'use client'

import { useBookingFlow, type BookingContext, type BookingFlowAdapter, themeToStyle, formatMoney, formatDate, mapLocale, nightsBetween } from '../../core'
import { BkButton, BkCard, BkInput, BkLabel, BkBadge, BkSpinKeyframes } from '../../core/ui'

export interface MinimalTemplateProps {
  context: BookingContext
  adapter: BookingFlowAdapter
  initialCheckIn?: string
  initialCheckOut?: string
  initialGuests?: number
  compact?: boolean
}

export function MinimalTemplate(props: MinimalTemplateProps) {
  const locale = mapLocale(props.context.property.default_language)
  const currency = props.context.property.default_currency
  const flow = useBookingFlow({
    context: props.context,
    adapter: props.adapter,
    initialCheckIn: props.initialCheckIn,
    initialCheckOut: props.initialCheckOut,
    initialGuests: props.initialGuests,
  })

  const rootStyle = themeToStyle(props.context.theme)

  return (
    <div style={{ ...rootStyle, minHeight: props.compact ? 'auto' : '100vh' }}>
      <BkSpinKeyframes />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
        <Header property={props.context.property} theme={props.context.theme} />

        {flow.step === 'search' && <SearchStep flow={flow} locale={locale} />}
        {flow.step === 'results' && <ResultsStep flow={flow} context={props.context} locale={locale} currency={currency} />}
        {flow.step === 'extras' && <ExtrasStep flow={flow} context={props.context} locale={locale} currency={currency} />}
        {flow.step === 'form' && <FormStep flow={flow} context={props.context} locale={locale} currency={currency} />}
        {flow.step === 'confirmation' && <ConfirmationStep flow={flow} locale={locale} currency={currency} />}

        {props.context.theme.show_powered_by && (
          <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 12, color: 'var(--bk-muted)' }}>
            Powered by <strong>TouraCore</strong>
          </div>
        )}
      </div>
    </div>
  )
}

function Header({ property, theme }: { property: BookingContext['property']; theme: BookingContext['theme'] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
      {theme.logo_url && <img src={theme.logo_url} alt={property.name} style={{ height: 40 }} />}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--bk-text)' }}>{property.name}</h1>
        {property.short_description && (
          <p style={{ fontSize: 14, color: 'var(--bk-muted)', margin: '2px 0 0' }}>{property.short_description}</p>
        )}
      </div>
    </div>
  )
}

function SearchStep({ flow, locale }: any) {
  return (
    <BkCard>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>Trova la tua camera</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <div>
          <BkLabel>Check-in</BkLabel>
          <BkInput type="date" value={flow.selection.checkIn} onChange={(e) => flow.updateSelection({ checkIn: e.target.value })} min={new Date().toISOString().split('T')[0]} />
        </div>
        <div>
          <BkLabel>Check-out</BkLabel>
          <BkInput type="date" value={flow.selection.checkOut} onChange={(e) => flow.updateSelection({ checkOut: e.target.value })} min={flow.selection.checkIn} />
        </div>
        <div>
          <BkLabel>Adulti</BkLabel>
          <BkInput type="number" min={1} max={12} value={flow.selection.adults} onChange={(e) => flow.updateSelection({ adults: parseInt(e.target.value) || 1 })} />
        </div>
        <div>
          <BkLabel>Bambini</BkLabel>
          <BkInput type="number" min={0} max={8} value={flow.selection.children} onChange={(e) => flow.updateSelection({ children: parseInt(e.target.value) || 0 })} />
        </div>
      </div>
      {flow.searchError && <p style={{ color: '#dc2626', fontSize: 14, marginTop: 12 }}>{flow.searchError}</p>}
      <div style={{ marginTop: 16 }}>
        <BkButton variant="primary" size="lg" onClick={flow.search} loading={flow.searching} type="button">
          Cerca disponibilità
        </BkButton>
      </div>
    </BkCard>
  )
}

function ResultsStep({ flow, context, locale, currency }: any) {
  const nights = nightsBetween(flow.selection.checkIn, flow.selection.checkOut)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 14, color: 'var(--bk-muted)' }}>
          {formatDate(flow.selection.checkIn, locale)} → {formatDate(flow.selection.checkOut, locale)} · {nights} notti · {flow.selection.adults} adulti
          {flow.selection.children > 0 && ` + ${flow.selection.children} bambini`}
          <button onClick={() => flow.setStep('search')} style={{ marginLeft: 12, fontSize: 13, color: 'var(--bk-accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Modifica</button>
        </div>

        {flow.availability.length === 0 && (
          <BkCard>
            <p style={{ margin: 0, color: 'var(--bk-muted)' }}>Nessuna camera disponibile per le date selezionate.</p>
          </BkCard>
        )}

        {flow.availability.map((item: any) => {
          const isSelected = flow.selection.roomTypeId === item.roomTypeId
          const isLow = item.availableRooms <= 2 && item.availableRooms > 0
          return (
            <BkCard key={item.roomTypeId} style={{ border: isSelected ? '2px solid var(--bk-accent)' : '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', gap: 16 }}>
                {item.photos[0] && (
                  <img src={item.photos[0]} alt={item.roomTypeName} style={{ width: 160, height: 120, objectFit: 'cover', borderRadius: 'var(--bk-radius)' }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{item.roomTypeName}</h3>
                      {item.description && <p style={{ fontSize: 13, color: 'var(--bk-muted)', margin: '4px 0' }}>{item.description}</p>}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                        {item.maxOccupancy && <BkBadge>Max {item.maxOccupancy} pers</BkBadge>}
                        {item.sizeSqm && <BkBadge>{item.sizeSqm} m²</BkBadge>}
                        {isLow && <BkBadge tone="warning">Solo {item.availableRooms} rimaste</BkBadge>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--bk-accent)' }}>
                        {formatMoney(item.totalPrice, currency, locale)}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--bk-muted)' }}>{formatMoney(item.pricePerNight, currency, locale)}/notte · {nights} notti</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <BkButton
                      variant={isSelected ? 'primary' : 'outline'}
                      onClick={() => { flow.updateSelection({ roomTypeId: item.roomTypeId }); flow.setStep(context.upsells.length > 0 ? 'extras' : 'form') }}
                      disabled={item.availableRooms < 1}
                    >
                      {isSelected ? 'Selezionata' : 'Scegli questa camera'}
                    </BkButton>
                  </div>
                </div>
              </div>
            </BkCard>
          )
        })}
      </div>

      <Summary flow={flow} context={context} locale={locale} currency={currency} />
    </div>
  )
}

function ExtrasStep({ flow, context, locale, currency }: any) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>Aggiungi servizi extra</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {context.upsells.map((offer: any) => {
            const qty = flow.selection.upsells[offer.id] ?? 0
            return (
              <BkCard key={offer.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{offer.name}</h4>
                    {offer.description && <p style={{ fontSize: 13, color: 'var(--bk-muted)', margin: '4px 0' }}>{offer.description}</p>}
                    <div style={{ fontSize: 13, marginTop: 4 }}>
                      <strong>{formatMoney(offer.price, currency, locale)}</strong>
                      <span style={{ color: 'var(--bk-muted)' }}> / {pricingLabel(offer.pricing_mode)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BkButton size="sm" variant="outline" onClick={() => flow.toggleUpsell(offer.id, Math.max(0, qty - 1))}>−</BkButton>
                    <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 700 }}>{qty}</span>
                    <BkButton size="sm" variant="outline" onClick={() => flow.toggleUpsell(offer.id, qty + 1)}>+</BkButton>
                  </div>
                </div>
              </BkCard>
            )
          })}
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <BkButton variant="ghost" onClick={() => flow.setStep('results')}>← Indietro</BkButton>
          <BkButton variant="primary" onClick={() => flow.setStep('form')}>Continua</BkButton>
        </div>
      </div>
      <Summary flow={flow} context={context} locale={locale} currency={currency} />
    </div>
  )
}

function FormStep({ flow, context, locale, currency }: any) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
      <BkCard>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>I tuoi dati</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <BkLabel>Nome</BkLabel>
            <BkInput value={flow.guest.firstName} onChange={(e) => flow.updateGuest({ firstName: e.target.value })} required />
          </div>
          <div>
            <BkLabel>Cognome</BkLabel>
            <BkInput value={flow.guest.lastName} onChange={(e) => flow.updateGuest({ lastName: e.target.value })} required />
          </div>
          <div>
            <BkLabel>Email</BkLabel>
            <BkInput type="email" value={flow.guest.email} onChange={(e) => flow.updateGuest({ email: e.target.value })} required />
          </div>
          <div>
            <BkLabel>Telefono</BkLabel>
            <BkInput type="tel" value={flow.guest.phone} onChange={(e) => flow.updateGuest({ phone: e.target.value })} required />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <BkLabel>Richieste speciali (opzionale)</BkLabel>
            <BkInput value={flow.guest.specialRequests ?? ''} onChange={(e) => flow.updateGuest({ specialRequests: e.target.value })} />
          </div>
        </div>
        <div style={{ marginTop: 16, fontSize: 13 }}>
          <label style={{ display: 'flex', alignItems: 'start', gap: 8 }}>
            <input type="checkbox" checked={flow.guest.privacyConsent} onChange={(e) => flow.updateGuest({ privacyConsent: e.target.checked })} />
            <span>Accetto <a href="#" style={{ color: 'var(--bk-accent)' }}>privacy policy</a> e <a href="#" style={{ color: 'var(--bk-accent)' }}>termini di prenotazione</a>.</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'start', gap: 8, marginTop: 8 }}>
            <input type="checkbox" checked={flow.guest.marketingConsent} onChange={(e) => flow.updateGuest({ marketingConsent: e.target.checked })} />
            <span>Voglio ricevere offerte via email (opzionale)</span>
          </label>
        </div>
        {flow.submitError && <p style={{ color: '#dc2626', fontSize: 14, marginTop: 12 }}>{flow.submitError}</p>}
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <BkButton variant="ghost" onClick={() => flow.setStep(context.upsells.length > 0 ? 'extras' : 'results')}>← Indietro</BkButton>
          <BkButton variant="primary" size="lg" onClick={() => flow.submit({ requestPayment: true })} loading={flow.submitting}>
            Prenota e paga — {formatMoney(flow.pricing.total, currency, locale)}
          </BkButton>
        </div>
      </BkCard>
      <Summary flow={flow} context={context} locale={locale} currency={currency} />
    </div>
  )
}

function ConfirmationStep({ flow, locale, currency }: any) {
  if (!flow.confirmation) return null
  return (
    <BkCard style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
      <h2 style={{ margin: 0 }}>Prenotazione confermata</h2>
      <p style={{ fontSize: 14, color: 'var(--bk-muted)', margin: '8px 0 16px' }}>
        Codice: <strong style={{ color: 'var(--bk-text)' }}>{flow.confirmation.reservationCode}</strong>
      </p>
      <p>
        {formatDate(flow.confirmation.checkIn, locale)} → {formatDate(flow.confirmation.checkOut, locale)}
      </p>
      <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--bk-accent)' }}>
        {formatMoney(flow.confirmation.totalAmount, currency, locale)}
      </p>
      <p style={{ fontSize: 13, color: 'var(--bk-muted)', marginTop: 16 }}>
        Riceverai un'email di conferma a breve.
      </p>
    </BkCard>
  )
}

function Summary({ flow, context, locale, currency }: any) {
  if (!flow.selectedAvailability) {
    return (
      <BkCard>
        <h3 style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--bk-muted)' }}>Il tuo riepilogo</h3>
        <p style={{ fontSize: 13, color: 'var(--bk-muted)' }}>Seleziona una camera per vedere il totale</p>
      </BkCard>
    )
  }
  return (
    <BkCard style={{ position: 'sticky', top: 16 }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>Riepilogo</h3>
      <div style={{ fontSize: 13, color: 'var(--bk-muted)', marginBottom: 12 }}>
        {formatDate(flow.selection.checkIn, locale)} → {formatDate(flow.selection.checkOut, locale)}<br />
        {flow.pricing.nights} notti · {flow.selection.adults} adulti {flow.selection.children > 0 ? `+ ${flow.selection.children} bambini` : ''}
      </div>
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
        <Row label={flow.selectedAvailability.roomTypeName} value={formatMoney(flow.pricing.roomSubtotal, currency, locale)} />
        {flow.pricing.upsellSubtotal > 0 && <Row label="Extra" value={formatMoney(flow.pricing.upsellSubtotal, currency, locale)} />}
        {flow.pricing.petSupplement > 0 && <Row label="Supplemento animali" value={formatMoney(flow.pricing.petSupplement, currency, locale)} />}
      </div>
      <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 18 }}>
        <span>Totale</span>
        <span style={{ color: 'var(--bk-accent)' }}>{formatMoney(flow.pricing.total, currency, locale)}</span>
      </div>
    </BkCard>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: 'var(--bk-muted)' }}>{label}</span>
      <span style={{ color: 'var(--bk-text)', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

function pricingLabel(mode: string): string {
  return { per_stay: 'soggiorno', per_night: 'notte', per_guest: 'ospite', per_item: 'pezzo', per_hour: 'ora', per_day: 'giorno' }[mode] ?? mode
}
