'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, Users, MapPin, Check, ChevronRight, AlertCircle } from 'lucide-react'
import { createExperienceReservationAction } from './actions'

interface Product {
  id: string
  slug: string
  name: string
  description_md: string | null
  booking_mode: 'timeslot_capacity' | 'timeslot_private' | 'asset_rental'
  duration_minutes: number
  capacity_default: number | null
  age_min: number | null
  height_min_cm: number | null
  difficulty: string | null
  price_base_cents: number
  currency: string
  highlights: string[]
  includes: string[]
  excludes: string[]
  requirements: string | null
  meeting_point: string | null
  waiver_required: boolean
  deposit_required_cents: number
  cutoff_minutes: number
  images: string[]
}

interface Variant {
  id: string
  product_id: string
  code: string
  label: string
  kind: string
  price_cents: number
  price_diff_cents: number
  min_qty: number
  max_qty: number | null
  includes_capacity: number
  display_order: number
}

interface Addon {
  id: string
  product_id: string
  code: string
  name: string
  description: string | null
  kind: string
  price_cents: number
  price_per: 'booking' | 'guest' | 'hour' | 'unit'
}

interface Timeslot {
  id: string
  product_id: string
  start_at: string
  end_at: string
  capacity_total: number
  capacity_booked: number
  capacity_held: number
  status: string
  price_override_cents: number | null
}

interface Zone {
  id: string
  name: string
  radius_km: number | null
  surcharge_cents: number
}

interface Props {
  entity: { id: string; slug: string; name: string; tenantId: string }
  products: Product[]
  variants: Variant[]
  addons: Addon[]
  timeslots: Timeslot[]
  zones: Zone[]
  selectedProductSlug?: string
  partnerRef?: string
  previewStep?: number
}

export function ExperienceBookingClient({ entity, products, variants, addons, timeslots, zones, selectedProductSlug, partnerRef, previewStep }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(previewStep ?? 0)
  const [productId, setProductId] = useState<string | null>(() => {
    if (selectedProductSlug) return products.find((p) => p.slug === selectedProductSlug)?.id ?? null
    return products[0]?.id ?? null
  })
  const product = useMemo(() => products.find((p) => p.id === productId) ?? null, [products, productId])
  const [timeslotId, setTimeslotId] = useState<string | null>(null)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [addonQty, setAddonQty] = useState<Record<string, number>>({})
  const [zoneId, setZoneId] = useState<string | null>(null)
  const [pickupAddress, setPickupAddress] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [waiverAccepted, setWaiverAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const productVariants = useMemo(
    () => variants.filter((v) => v.product_id === productId).sort((a, b) => a.display_order - b.display_order),
    [variants, productId]
  )
  const productAddons = useMemo(() => addons.filter((a) => a.product_id === productId), [addons, productId])
  const productTimeslots = useMemo(() => timeslots.filter((t) => t.product_id === productId), [timeslots, productId])
  const selectedTimeslot = productTimeslots.find((t) => t.id === timeslotId) ?? null
  const selectedZone = zones.find((z) => z.id === zoneId) ?? null

  const quote = useMemo(() => {
    if (!product) return null
    const basePrice = selectedTimeslot?.price_override_cents ?? product.price_base_cents
    let subtotal = 0
    let guestsCount = 0
    const breakdown: Array<{ label: string; quantity: number; line: number }> = []
    for (const v of productVariants) {
      const q = quantities[v.id] ?? 0
      if (q <= 0) continue
      const unit = basePrice + v.price_diff_cents
      const line = unit * q
      subtotal += line
      guestsCount += q * v.includes_capacity
      breakdown.push({ label: `${v.label} × ${q}`, quantity: q, line })
    }
    let addonsCents = 0
    const durationHours = product.duration_minutes / 60
    for (const a of productAddons) {
      const q = addonQty[a.id] ?? 0
      if (q <= 0) continue
      let line = 0
      switch (a.price_per) {
        case 'booking': line = a.price_cents * q; break
        case 'guest': line = a.price_cents * q * guestsCount; break
        case 'hour': line = a.price_cents * q * Math.ceil(durationHours); break
        case 'unit': line = a.price_cents * q; break
      }
      addonsCents += line
      breakdown.push({ label: `${a.name} × ${q}`, quantity: q, line })
    }
    const pickupCents = selectedZone?.surcharge_cents ?? 0
    const total = subtotal + addonsCents + pickupCents
    return { subtotal, addonsCents, pickupCents, total, guestsCount, breakdown }
  }, [product, productVariants, productAddons, quantities, addonQty, selectedTimeslot, selectedZone])

  if (!product) return <div className="rounded-lg border bg-white p-6 text-center text-sm text-gray-500">Nessun prodotto disponibile</div>

  async function submit() {
    if (!product || !quote) return
    setSubmitting(true)
    setError(null)
    try {
      const guests: Array<{ variantId: string; firstName: string; lastName: string }> = []
      for (const v of productVariants) {
        const q = quantities[v.id] ?? 0
        for (let i = 0; i < q; i++) guests.push({ variantId: v.id, firstName: customerName.split(' ')[0] ?? customerName, lastName: customerName.split(' ').slice(1).join(' ') || 'Guest' })
      }
      const selectedAddons = Object.entries(addonQty)
        .filter(([, q]) => q > 0)
        .map(([id, q]) => {
          const a = productAddons.find((x) => x.id === id)!
          return { addonId: id, quantity: q, unitPriceCents: a.price_cents }
        })
      const startAt = selectedTimeslot?.start_at ?? new Date().toISOString()
      const endAt = selectedTimeslot?.end_at ?? new Date(new Date(startAt).getTime() + product.duration_minutes * 60 * 1000).toISOString()
      // SECURITY: action re-compute totali server-side + valida tenantId da entity_id trusted
      const result = await createExperienceReservationAction({
        entityId: entity.id,
        productId: product.id,
        timeslotId: product.booking_mode === 'timeslot_capacity' ? selectedTimeslot?.id ?? null : null,
        customerName,
        customerEmail,
        customerPhone,
        startAt,
        endAt,
        guests,
        addons: selectedAddons,
        depositCents: product.deposit_required_cents,
        currency: product.currency,
        partnerRef,
        pickupZoneId: zoneId ?? undefined,
        pickupAddress: pickupAddress || undefined,
      })
      router.push(`/book/experience/${entity.slug}/confirm/${result.reference_code}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore durante la prenotazione')
      setSubmitting(false)
    }
  }

  const steps = ['Prodotto', 'Data/slot', 'Partecipanti', 'Extra', 'Dati', 'Pagamento']

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 overflow-x-auto text-xs">
        {steps.map((s, i) => (
          <div key={s} className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 ${i === step ? 'bg-blue-600 text-white' : i < step ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {i < step ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
            <span>{s}</span>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        {step === 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold">Scegli prodotto</h2>
            {products.map((p) => (
              <button key={p.id} onClick={() => setProductId(p.id)} className={`w-full rounded-lg border p-4 text-left transition ${productId === p.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{p.name}</p>
                    <p className="mt-1 text-xs text-gray-500">{p.duration_minutes}min · {p.capacity_default ? `max ${p.capacity_default} posti` : 'privato'}</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">€{(p.price_base_cents / 100).toFixed(2)}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" />Scegli data e ora</h2>
            {productTimeslots.length === 0 ? (
              <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-700">Nessuno slot disponibili nei prossimi 30 giorni. Contatta direttamente.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {productTimeslots.map((t) => {
                  const avail = t.capacity_total - t.capacity_booked - t.capacity_held
                  const d = new Date(t.start_at)
                  return (
                    <button key={t.id} disabled={avail <= 0} onClick={() => setTimeslotId(t.id)} className={`rounded-md border p-3 text-left text-xs transition ${timeslotId === t.id ? 'border-blue-500 bg-blue-50' : avail <= 0 ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400' : 'border-gray-200 hover:border-gray-300'}`}>
                      <p className="font-semibold">{d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                      <p className="mt-0.5 text-gray-500">{d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</p>
                      <p className="mt-1 text-[10px] text-gray-500">{avail} posti liberi</p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold flex items-center gap-2"><Users className="h-4 w-4" />Partecipanti</h2>
            {productVariants.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-md border border-gray-200 p-3">
                <div>
                  <p className="text-sm font-medium">{v.label}</p>
                  <p className="text-xs text-gray-500">€{((product.price_base_cents + v.price_diff_cents) / 100).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQuantities((q) => ({ ...q, [v.id]: Math.max(v.min_qty, (q[v.id] ?? 0) - 1) }))} className="rounded-md border border-gray-200 px-2 py-1 text-sm">−</button>
                  <span className="w-8 text-center text-sm font-medium">{quantities[v.id] ?? 0}</span>
                  <button onClick={() => setQuantities((q) => ({ ...q, [v.id]: Math.min(v.max_qty ?? 99, (q[v.id] ?? 0) + 1) }))} className="rounded-md border border-gray-200 px-2 py-1 text-sm">+</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold">Extra (opzionale)</h2>
            {productAddons.length === 0 ? (
              <p className="text-sm text-gray-500">Nessun extra disponibili.</p>
            ) : productAddons.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-md border border-gray-200 p-3">
                <div>
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-gray-500">€{(a.price_cents / 100).toFixed(2)} / {a.price_per}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setAddonQty((q) => ({ ...q, [a.id]: Math.max(0, (q[a.id] ?? 0) - 1) }))} className="rounded-md border border-gray-200 px-2 py-1 text-sm">−</button>
                  <span className="w-8 text-center text-sm font-medium">{addonQty[a.id] ?? 0}</span>
                  <button onClick={() => setAddonQty((q) => ({ ...q, [a.id]: (q[a.id] ?? 0) + 1 }))} className="rounded-md border border-gray-200 px-2 py-1 text-sm">+</button>
                </div>
              </div>
            ))}
            {zones.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2"><MapPin className="h-4 w-4" />Pickup hotel (opzionale)</p>
                <select value={zoneId ?? ''} onChange={(e) => setZoneId(e.target.value || null)} className="w-full rounded-md border border-gray-300 p-2 text-sm">
                  <option value="">Nessuno (vieni direttamente)</option>
                  {zones.map((z) => (<option key={z.id} value={z.id}>{z.name} (+€{(z.surcharge_cents / 100).toFixed(2)})</option>))}
                </select>
                {zoneId && <input value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} placeholder="Indirizzo pickup" className="w-full rounded-md border border-gray-300 p-2 text-sm" />}
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold">Dati contatto</h2>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nome e cognome" className="w-full rounded-md border border-gray-300 p-2 text-sm" />
            <input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} type="email" placeholder="Email" className="w-full rounded-md border border-gray-300 p-2 text-sm" />
            <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Telefono" className="w-full rounded-md border border-gray-300 p-2 text-sm" />
            {product.waiver_required && (
              <label className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm">
                <input type="checkbox" checked={waiverAccepted} onChange={(e) => setWaiverAccepted(e.target.checked)} className="mt-0.5" />
                <span className="text-amber-800">Accetto le condizioni di partecipazione e manleva digitale per l'attività.</span>
              </label>
            )}
          </div>
        )}

        {step === 5 && quote && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold">Riepilogo</h2>
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
              {quote.breakdown.map((b, i) => (
                <div key={i} className="flex justify-between py-0.5"><span>{b.label}</span><span>€{(b.line / 100).toFixed(2)}</span></div>
              ))}
              <div className="mt-2 border-t pt-2 flex justify-between font-bold"><span>Totale</span><span>€{(quote.total / 100).toFixed(2)}</span></div>
              {product.deposit_required_cents > 0 && <p className="mt-1 text-[11px] text-gray-500">Acconto richiesto al momento: €{(product.deposit_required_cents / 100).toFixed(2)}</p>}
            </div>
            {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</p>}
            <button onClick={submit} disabled={submitting || (product.waiver_required && !waiverAccepted) || !customerName || !customerEmail} className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {submitting ? 'Invio in corso…' : 'Conferma prenotazione'}
            </button>
          </div>
        )}
      </div>

      {step < 5 && (
        <div className="flex items-center justify-between">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="rounded-md border border-gray-200 px-4 py-2 text-sm disabled:opacity-50">Indietro</button>
          <button onClick={() => setStep((s) => s + 1)} className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">Avanti <ChevronRight className="h-4 w-4" /></button>
        </div>
      )}

      {quote && quote.total > 0 && step < 5 && (
        <div className="sticky bottom-4 rounded-lg border border-gray-200 bg-white p-3 shadow-lg flex items-center justify-between text-sm">
          <span className="text-gray-500 flex items-center gap-1"><Clock className="h-4 w-4" />{product.duration_minutes}min · {quote.guestsCount || 0} partecipanti</span>
          <span className="font-bold text-gray-900">€{(quote.total / 100).toFixed(2)}</span>
        </div>
      )}
    </div>
  )
}
