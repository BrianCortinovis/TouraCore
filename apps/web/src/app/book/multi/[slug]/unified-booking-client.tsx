'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Building2, UtensilsCrossed, Compass, Bike, Heart, ShoppingCart, X, Plus, Minus, CreditCard, AlertCircle } from 'lucide-react'

type Vertical = 'hospitality' | 'restaurant' | 'experiences' | 'bike_rental' | 'wellness'

interface EntityRef {
  id: string
  slug: string
  name: string
  kind: string
  legal_entity_id: string | null
}

interface CartItem {
  id: string  // client-side UUID
  itemType: 'hospitality' | 'restaurant' | 'experience' | 'bike_rental' | 'wellness'
  entityId: string
  entityName: string
  description: string
  config: Record<string, unknown>
  quantity: number
  unitPriceCents: number
  vatRate: number
  totalCents: number
}

interface Props {
  tenantId: string
  tenantSlug: string
  tenantName: string
  activeVerticals: Vertical[]
  hospitalityEntities: EntityRef[]
  restaurantEntities: EntityRef[]
  experienceEntities: EntityRef[]
}

const VERTICAL_META: Record<Vertical, { label: string; icon: typeof Building2; color: string }> = {
  hospitality: { label: 'Dormire', icon: Building2, color: 'blue' },
  restaurant: { label: 'Mangiare', icon: UtensilsCrossed, color: 'amber' },
  experiences: { label: 'Esperienze', icon: Compass, color: 'green' },
  bike_rental: { label: 'Bike', icon: Bike, color: 'teal' },
  wellness: { label: 'Benessere', icon: Heart, color: 'pink' },
}

export function UnifiedBookingClient({
  tenantId: _tenantId,
  tenantSlug,
  activeVerticals,
  hospitalityEntities,
  restaurantEntities,
  experienceEntities,
}: Props) {
  const [activeTab, setActiveTab] = useState<Vertical>(activeVerticals[0] ?? 'hospitality')
  const [cart, setCart] = useState<CartItem[]>([])
  const [step, setStep] = useState<'browse' | 'guest' | 'payment' | 'success'>('browse')
  const [guestInfo, setGuestInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    fiscalCode: '',
    vatNumber: '',
    isBusiness: false,
    companyName: '',
    sdiCode: '',
    consentPrivacy: false,
    consentMarketing: false,
  })
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bundleId, setBundleId] = useState<string | null>(null)

  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.totalCents, 0), [cart])
  const cartCount = cart.length

  const addToCart = (item: Omit<CartItem, 'id'>) => {
    setCart((c) => [...c, { ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}` }])
  }
  const removeFromCart = (id: string) => setCart((c) => c.filter((i) => i.id !== id))
  const updateQty = (id: string, delta: number) => {
    setCart((c) => c.map((i) => {
      if (i.id !== id) return i
      const newQty = Math.max(1, i.quantity + delta)
      return { ...i, quantity: newQty, totalCents: i.unitPriceCents * newQty }
    }))
  }

  const handleCheckout = async () => {
    setError(null)
    if (!guestInfo.fullName || !guestInfo.email || !guestInfo.consentPrivacy) {
      setError('Nome, email e consenso privacy obbligatori.')
      return
    }
    setProcessing(true)
    try {
      const res = await fetch('/api/v1/bundles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSlug,
          guest: guestInfo,
          items: cart.map((i) => ({
            itemType: i.itemType,
            entityId: i.entityId,
            description: i.description,
            config: i.config,
            quantity: i.quantity,
            unitPriceCents: i.unitPriceCents,
            vatRate: i.vatRate,
          })),
          locale: 'it',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Errore creazione prenotazione')

      setBundleId(data.bundleId)
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        setStep('success')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setProcessing(false)
    }
  }

  if (step === 'success') {
    return (
      <div className="mx-auto max-w-md rounded-lg bg-white p-8 text-center shadow">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <CreditCard className="h-6 w-6 text-green-600" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-gray-900">Prenotazione ricevuta</h2>
        <p className="mt-2 text-sm text-gray-500">
          ID: <span className="font-mono">{bundleId}</span>
        </p>
        <p className="mt-3 text-sm text-gray-600">Riceverai email di conferma + documenti fiscali separati per ogni servizio.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
      {/* Main area */}
      <div>
        {step === 'browse' && (
          <>
            {/* Vertical tabs */}
            <div className="mb-4 flex gap-2 overflow-x-auto border-b border-gray-200">
              {activeVerticals.map((v) => {
                const meta = VERTICAL_META[v]
                const Icon = meta.icon
                const isActive = activeTab === v
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setActiveTab(v)}
                    className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                      isActive ? `border-${meta.color}-500 text-${meta.color}-700` : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {meta.label}
                  </button>
                )
              })}
            </div>

            {/* Tab content (placeholder forms — integrate real availability/pricing per vertical) */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              {activeTab === 'hospitality' && (
                <HospitalityTab entities={hospitalityEntities} onAdd={addToCart} />
              )}
              {activeTab === 'restaurant' && (
                <RestaurantTab entities={restaurantEntities} onAdd={addToCart} />
              )}
              {activeTab === 'experiences' && (
                <ExperienceTab entities={experienceEntities} onAdd={addToCart} />
              )}
              {(activeTab === 'bike_rental' || activeTab === 'wellness') && (
                <p className="text-sm text-gray-500">Modulo {VERTICAL_META[activeTab].label} in arrivo.</p>
              )}
            </div>
          </>
        )}

        {step === 'guest' && (
          <GuestForm guestInfo={guestInfo} setGuestInfo={setGuestInfo} onBack={() => setStep('browse')} onNext={() => setStep('payment')} />
        )}

        {step === 'payment' && (
          <PaymentStep
            cart={cart}
            guestInfo={guestInfo}
            cartTotal={cartTotal}
            onBack={() => setStep('guest')}
            onSubmit={handleCheckout}
            processing={processing}
            error={error}
          />
        )}
      </div>

      {/* Sticky cart */}
      <aside className="lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-gray-500" />
              <h3 className="font-semibold text-gray-900">Carrello ({cartCount})</h3>
            </div>
          </div>

          {cart.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">Carrello vuoto. Aggiungi servizi dalle tab.</p>
          ) : (
            <>
              <ul className="divide-y divide-gray-100">
                {cart.map((item) => {
                  const Icon = VERTICAL_META[item.itemType === 'experience' ? 'experiences' : item.itemType]?.icon ?? Building2
                  return (
                    <li key={item.id} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <Icon className="mt-0.5 h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.entityName}</p>
                            <p className="text-xs text-gray-500">{item.description}</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-600">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => updateQty(item.id, -1)} className="rounded border border-gray-200 p-1 hover:bg-gray-50">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-sm">{item.quantity}</span>
                          <button type="button" onClick={() => updateQty(item.id, 1)} className="rounded border border-gray-200 p-1 hover:bg-gray-50">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">€{(item.totalCents / 100).toFixed(2)}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>

              <div className="border-t border-gray-100 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Totale</span>
                  <span className="text-lg font-bold text-gray-900">€{(cartTotal / 100).toFixed(2)}</span>
                </div>
                {step === 'browse' && (
                  <button
                    type="button"
                    onClick={() => setStep('guest')}
                    className="mt-3 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Procedi al checkout
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

// ============================================================================
// Tab components (simplified — integrate real availability/pricing per vertical)
// ============================================================================

function HospitalityTab({ entities, onAdd }: { entities: EntityRef[]; onAdd: (i: Omit<CartItem, 'id'>) => void }) {
  const [selected, setSelected] = useState<EntityRef | null>(entities[0] ?? null)
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(2)

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0
    const d1 = new Date(checkIn)
    const d2 = new Date(checkOut)
    return Math.max(0, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)))
  }, [checkIn, checkOut])

  const handleAdd = () => {
    if (!selected || nights === 0) return
    const unitPriceCents = 12000  // TODO: fetch real rate via /api pricing
    onAdd({
      itemType: 'hospitality',
      entityId: selected.id,
      entityName: selected.name,
      description: `${nights} ${nights === 1 ? 'notte' : 'notti'} · ${guests} ospiti`,
      config: { checkIn, checkOut, guests, nights },
      quantity: nights,
      unitPriceCents,
      vatRate: 10,
      totalCents: unitPriceCents * nights,
    })
  }

  if (entities.length === 0) return <p className="text-sm text-gray-500">Nessuna struttura disponibile.</p>

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Prenota soggiorno</h3>
      <select value={selected?.id ?? ''} onChange={(e) => setSelected(entities.find((x) => x.id === e.target.value) ?? null)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm">
        {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Check-in
          <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          Check-out
          <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5" />
        </label>
      </div>
      <label className="block text-sm">
        Ospiti
        <input type="number" min={1} max={20} value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5" />
      </label>
      <button type="button" onClick={handleAdd} disabled={!selected || nights === 0} className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
        Aggiungi al carrello {nights > 0 && `— €${(120 * nights).toFixed(0)}`}
      </button>
    </div>
  )
}

function RestaurantTab({ entities, onAdd }: { entities: EntityRef[]; onAdd: (i: Omit<CartItem, 'id'>) => void }) {
  const [selected, setSelected] = useState<EntityRef | null>(entities[0] ?? null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('20:00')
  const [covers, setCovers] = useState(2)

  const handleAdd = () => {
    if (!selected || !date) return
    const unitPriceCents = 0  // reservation gratuita; solo prelievo coperto opzionale
    onAdd({
      itemType: 'restaurant',
      entityId: selected.id,
      entityName: selected.name,
      description: `${date} · ${time} · ${covers} coperti`,
      config: { date, time, covers },
      quantity: 1,
      unitPriceCents,
      vatRate: 10,
      totalCents: 0,
    })
  }

  if (entities.length === 0) return <p className="text-sm text-gray-500">Nessun ristorante disponibile.</p>

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Prenota tavolo</h3>
      <select value={selected?.id ?? ''} onChange={(e) => setSelected(entities.find((x) => x.id === e.target.value) ?? null)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm">
        {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
      <div className="grid grid-cols-3 gap-3">
        <label className="text-sm">
          Data
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          Ora
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          Coperti
          <input type="number" min={1} max={20} value={covers} onChange={(e) => setCovers(Number(e.target.value))} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5" />
        </label>
      </div>
      <button type="button" onClick={handleAdd} disabled={!selected || !date} className="w-full rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
        Prenota tavolo (gratuito)
      </button>
    </div>
  )
}

function ExperienceTab({ entities, onAdd }: { entities: EntityRef[]; onAdd: (i: Omit<CartItem, 'id'>) => void }) {
  const [selected, setSelected] = useState<EntityRef | null>(entities[0] ?? null)
  const [date, setDate] = useState('')
  const [participants, setParticipants] = useState(2)

  const handleAdd = () => {
    if (!selected || !date) return
    const unitPriceCents = 4500  // TODO: fetch real price
    onAdd({
      itemType: 'experience',
      entityId: selected.id,
      entityName: selected.name,
      description: `${date} · ${participants} partecipanti`,
      config: { date, participants },
      quantity: participants,
      unitPriceCents,
      vatRate: 22,
      totalCents: unitPriceCents * participants,
    })
  }

  if (entities.length === 0) return <p className="text-sm text-gray-500">Nessuna esperienza disponibile.</p>

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Prenota esperienza</h3>
      <select value={selected?.id ?? ''} onChange={(e) => setSelected(entities.find((x) => x.id === e.target.value) ?? null)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm">
        {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Data
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          Partecipanti
          <input type="number" min={1} max={30} value={participants} onChange={(e) => setParticipants(Number(e.target.value))} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5" />
        </label>
      </div>
      <button type="button" onClick={handleAdd} disabled={!selected || !date} className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
        Aggiungi — €{(45 * participants).toFixed(0)}
      </button>
    </div>
  )
}

function GuestForm({
  guestInfo,
  setGuestInfo,
  onBack,
  onNext,
}: {
  guestInfo: {
    fullName: string; email: string; phone: string; fiscalCode: string; vatNumber: string; isBusiness: boolean; companyName: string; sdiCode: string; consentPrivacy: boolean; consentMarketing: boolean
  }
  setGuestInfo: (v: typeof guestInfo) => void
  onBack: () => void
  onNext: () => void
}) {
  const canNext = guestInfo.fullName && guestInfo.email && guestInfo.consentPrivacy

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-bold text-gray-900">I tuoi dati</h2>
      <p className="mt-1 text-sm text-gray-500">Inseriti una volta per tutti i servizi prenotati.</p>

      <div className="mt-4 space-y-3">
        <label className="block text-sm">
          Nome e cognome *
          <input value={guestInfo.fullName} onChange={(e) => setGuestInfo({ ...guestInfo, fullName: e.target.value })} required className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            Email *
            <input type="email" value={guestInfo.email} onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })} required className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
          </label>
          <label className="text-sm">
            Telefono
            <input type="tel" value={guestInfo.phone} onChange={(e) => setGuestInfo({ ...guestInfo, phone: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
          </label>
        </div>
        <label className="block text-sm">
          Codice fiscale (opzionale, per fattura)
          <input value={guestInfo.fiscalCode} onChange={(e) => setGuestInfo({ ...guestInfo, fiscalCode: e.target.value.toUpperCase() })} maxLength={16} pattern="[A-Z0-9]{16}" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-mono uppercase" />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={guestInfo.isBusiness} onChange={(e) => setGuestInfo({ ...guestInfo, isBusiness: e.target.checked })} />
          Sono un'azienda / P.IVA (fattura B2B)
        </label>

        {guestInfo.isBusiness && (
          <div className="space-y-3 rounded border border-gray-200 bg-gray-50 p-3">
            <label className="block text-sm">
              Ragione sociale
              <input value={guestInfo.companyName} onChange={(e) => setGuestInfo({ ...guestInfo, companyName: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                P.IVA
                <input value={guestInfo.vatNumber} onChange={(e) => setGuestInfo({ ...guestInfo, vatNumber: e.target.value })} pattern="[0-9]{11}" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-mono" />
              </label>
              <label className="text-sm">
                Cod. destinatario SDI
                <input value={guestInfo.sdiCode} onChange={(e) => setGuestInfo({ ...guestInfo, sdiCode: e.target.value.toUpperCase() })} maxLength={7} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-mono uppercase" />
              </label>
            </div>
          </div>
        )}

        <div className="space-y-2 rounded border border-gray-200 p-3">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={guestInfo.consentPrivacy} onChange={(e) => setGuestInfo({ ...guestInfo, consentPrivacy: e.target.checked })} required className="mt-0.5" />
            <span>Ho letto e accetto l&apos;<Link href="/privacy" className="text-blue-600 hover:underline">informativa privacy</Link> (obbligatorio).</span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={guestInfo.consentMarketing} onChange={(e) => setGuestInfo({ ...guestInfo, consentMarketing: e.target.checked })} className="mt-0.5" />
            <span>Acconsento a ricevere comunicazioni promozionali.</span>
          </label>
        </div>
      </div>

      <div className="mt-5 flex justify-between border-t border-gray-200 pt-4">
        <button type="button" onClick={onBack} className="rounded border border-gray-300 px-4 py-2 text-sm">Indietro</button>
        <button type="button" onClick={onNext} disabled={!canNext} className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          Continua →
        </button>
      </div>
    </div>
  )
}

function PaymentStep({
  cart,
  guestInfo,
  cartTotal,
  onBack,
  onSubmit,
  processing,
  error,
}: {
  cart: CartItem[]
  guestInfo: { fullName: string; email: string; fiscalCode: string; vatNumber: string; isBusiness: boolean; companyName: string }
  cartTotal: number
  onBack: () => void
  onSubmit: () => void
  processing: boolean
  error: string | null
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-bold text-gray-900">Riepilogo e pagamento</h2>
      <p className="mt-1 text-sm text-gray-500">Ogni servizio genera documento fiscale dedicato dell'emittente corretto.</p>

      <div className="mt-4 space-y-3">
        <div className="rounded border border-gray-200 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ospite</h3>
          <p className="mt-1 text-sm text-gray-900">
            {guestInfo.fullName} · {guestInfo.email}
          </p>
          {guestInfo.isBusiness && (
            <p className="text-xs text-gray-500">
              {guestInfo.companyName} · P.IVA {guestInfo.vatNumber}
            </p>
          )}
        </div>

        <ul className="divide-y divide-gray-100 rounded border border-gray-200">
          {cart.map((i) => (
            <li key={i.id} className="p-3">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{i.entityName}</p>
                  <p className="text-xs text-gray-500">{i.description}</p>
                  <p className="mt-1 text-[10px] text-gray-400">
                    IVA {i.vatRate}% · emittente determinato all'emissione doc
                  </p>
                </div>
                <span className="text-sm font-semibold">€{(i.totalCents / 100).toFixed(2)}</span>
              </div>
            </li>
          ))}
        </ul>

        <div className="rounded-lg bg-blue-50 p-4">
          <div className="flex justify-between">
            <span className="text-sm font-medium text-blue-900">Totale da pagare</span>
            <span className="text-xl font-bold text-blue-900">€{(cartTotal / 100).toFixed(2)}</span>
          </div>
          <p className="mt-1 text-xs text-blue-700">Un unico pagamento carta. Soldi distribuiti automaticamente ai soggetti fiscali giusti.</p>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>{error}</div>
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-between border-t border-gray-200 pt-4">
        <button type="button" onClick={onBack} disabled={processing} className="rounded border border-gray-300 px-4 py-2 text-sm">Indietro</button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={processing || cart.length === 0}
          className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <CreditCard className="h-4 w-4" />
          {processing ? 'Elaboro...' : `Paga €${(cartTotal / 100).toFixed(2)}`}
        </button>
      </div>
    </div>
  )
}
