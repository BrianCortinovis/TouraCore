'use client'

import { useMemo, useState, useTransition } from 'react'
import { Bike, CalendarClock, MapPin, Check, Loader2 } from 'lucide-react'
import { createBookingAction } from './actions'

interface TypeOption {
  id: string
  typeKey: string
  displayName: string
  description: string | null
  icon: string
  hourlyRate: number | null
  halfDayRate: number | null
  dailyRate: number | null
  weeklyRate: number | null
  depositAmount: number
  ageMin: number | null
  heightMin: number | null
  heightMax: number | null
}

interface AddonOption {
  key: string
  label: string
  description: string | null
  category: string | null
  pricingMode: string
  unitPrice: number
  mandatoryFor: string[]
}

interface LocationOption {
  id: string
  name: string
  city: string | null
  isPickup: boolean
  isReturn: boolean
}

interface Props {
  entityId: string
  entityName: string
  types: TypeOption[]
  addons: AddonOption[]
  locations: LocationOption[]
  oneWayEnabled: boolean
  deliveryEnabled: boolean
}

export function BikeBookingClient({
  entityId,
  entityName,
  types,
  addons,
  locations,
  oneWayEnabled,
  deliveryEnabled,
}: Props) {
  const today = new Date()
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  const defStart = `${tomorrow.toISOString().slice(0, 10)}T09:00`
  const defEnd = `${tomorrow.toISOString().slice(0, 10)}T13:00`

  const [rentalStart, setRentalStart] = useState(defStart)
  const [rentalEnd, setRentalEnd] = useState(defEnd)
  const [cart, setCart] = useState<Record<string, number>>({})
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({})
  const [insuranceTier, setInsuranceTier] = useState<'none' | 'basic' | 'standard' | 'premium'>('none')
  const [pickupLocationId, setPickupLocationId] = useState<string>(locations[0]?.id ?? '')
  const [returnLocationId, setReturnLocationId] = useState<string>(locations[0]?.id ?? '')
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ success: boolean; referenceCode?: string; total?: number; error?: string } | null>(null)

  const totalBikes = Object.values(cart).reduce((a, b) => a + b, 0)
  const durationHours = useMemo(() => {
    try {
      const ms = new Date(rentalEnd).getTime() - new Date(rentalStart).getTime()
      return Math.max(0, Math.round((ms / 3_600_000) * 10) / 10)
    } catch {
      return 0
    }
  }, [rentalStart, rentalEnd])

  const isOneWay = oneWayEnabled && pickupLocationId !== returnLocationId

  const addToCart = (typeId: string, delta: number) => {
    setCart((c) => {
      const next = { ...c }
      const n = Math.max(0, (next[typeId] ?? 0) + delta)
      if (n === 0) delete next[typeId]
      else next[typeId] = n
      return next
    })
  }

  const toggleAddon = (key: string) => {
    setSelectedAddons((s) => {
      const next = { ...s }
      if (next[key]) delete next[key]
      else next[key] = 1
      return next
    })
  }

  const canSubmit =
    totalBikes > 0 &&
    durationHours > 0 &&
    guestName.trim() !== '' &&
    guestEmail.trim() !== '' &&
    !isPending

  const handleSubmit = () => {
    if (!canSubmit) return
    setResult(null)
    startTransition(async () => {
      const r = await createBookingAction({
        bikeRentalId: entityId,
        rentalStart: new Date(rentalStart).toISOString(),
        rentalEnd: new Date(rentalEnd).toISOString(),
        items: Object.entries(cart).map(([typeId, qty]) => ({
          bikeTypeId: typeId,
          bikeTypeKey: types.find((t) => t.id === typeId)?.typeKey ?? '',
          quantity: qty,
        })),
        addons: Object.entries(selectedAddons).map(([key, qty]) => ({ addonKey: key, quantity: qty })),
        insuranceTier,
        pickupLocationId,
        returnLocationId,
        guest: { name: guestName, email: guestEmail, phone: guestPhone },
      })
      setResult(r)
    })
  }

  if (result?.success) {
    return (
      <div className="rounded-lg border border-green-200 bg-white p-8 text-center shadow-sm">
        <Check className="mx-auto h-14 w-14 text-green-500" />
        <h2 className="mt-4 text-2xl font-bold text-gray-900">Prenotazione confermata</h2>
        <p className="mt-2 text-sm text-gray-600">
          Riferimento: <span className="font-mono font-semibold">{result.referenceCode}</span>
        </p>
        {result.total !== undefined && (
          <p className="mt-1 text-lg font-semibold">Totale: €{result.total.toFixed(2)}</p>
        )}
        <p className="mt-4 text-xs text-gray-500">
          Riceverai conferma via email con i dettagli e le istruzioni per il pickup.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Date/time */}
      <Section icon={CalendarClock} title="Quando vuoi noleggiare?">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-gray-600">Ritiro</span>
            <input
              type="datetime-local"
              value={rentalStart}
              onChange={(e) => setRentalStart(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="text-gray-600">Restituzione</span>
            <input
              type="datetime-local"
              value={rentalEnd}
              onChange={(e) => setRentalEnd(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-gray-500">Durata: {durationHours} ore</p>
      </Section>

      {/* Step 2: Locations */}
      {locations.length > 0 && (
        <Section icon={MapPin} title="Deposito">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-gray-600">Ritiro</span>
              <select
                value={pickupLocationId}
                onChange={(e) => setPickupLocationId(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              >
                {locations
                  .filter((l) => l.isPickup)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} {l.city ? `(${l.city})` : ''}
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-gray-600">Restituzione</span>
              <select
                value={returnLocationId}
                onChange={(e) => setReturnLocationId(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              >
                {locations
                  .filter((l) => l.isReturn)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} {l.city ? `(${l.city})` : ''}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          {isOneWay && (
            <p className="mt-2 text-xs text-amber-700">Noleggio one-way: supplemento applicato</p>
          )}
        </Section>
      )}

      {/* Step 3: Bike types */}
      <Section icon={Bike} title="Scegli le bici">
        <div className="space-y-2">
          {types.map((t) => {
            const qty = cart[t.id] ?? 0
            const rate = t.hourlyRate ? `€${t.hourlyRate.toFixed(2)}/h` : t.dailyRate ? `€${t.dailyRate.toFixed(2)}/giorno` : '—'
            return (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-3"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {t.icon} {t.displayName}
                  </p>
                  {t.description && <p className="text-xs text-gray-500">{t.description}</p>}
                  <p className="mt-1 text-xs text-gray-700">
                    {rate} · deposito €{t.depositAmount}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => addToCart(t.id, -1)}
                    disabled={qty === 0}
                    className="h-8 w-8 rounded-md border text-lg font-semibold disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-semibold">{qty}</span>
                  <button
                    onClick={() => addToCart(t.id, 1)}
                    className="h-8 w-8 rounded-md border text-lg font-semibold"
                  >
                    +
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      {/* Step 4: Addons */}
      {addons.length > 0 && (
        <Section title="Extra & Assicurazione">
          <div className="grid gap-2 sm:grid-cols-2">
            {addons
              .filter((a) => !a.key.startsWith('insurance_'))
              .map((a) => (
                <label
                  key={a.key}
                  className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm ${
                    selectedAddons[a.key] ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(selectedAddons[a.key])}
                    onChange={() => toggleAddon(a.key)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{a.label}</p>
                    <p className="text-xs text-gray-500">
                      €{a.unitPrice.toFixed(2)} · {a.pricingMode.replace('_', ' ')}
                    </p>
                  </div>
                </label>
              ))}
          </div>

          <div className="mt-4">
            <p className="text-xs font-medium text-gray-600">Assicurazione</p>
            <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(['none', 'basic', 'standard', 'premium'] as const).map((tier) => (
                <button
                  key={tier}
                  onClick={() => setInsuranceTier(tier)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                    insuranceTier === tier ? 'border-blue-500 bg-blue-600 text-white' : 'border-gray-200 bg-white'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* Step 5: Guest */}
      <Section title="I tuoi dati">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            placeholder="Nome e cognome *"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="email"
            placeholder="Email *"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="tel"
            placeholder="Telefono"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm sm:col-span-2"
          />
        </div>
      </Section>

      {/* Submit */}
      <div className="sticky bottom-4 z-10 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <p className="text-gray-600">
              {totalBikes} bici · {durationHours}h
              {deliveryEnabled ? ' · delivery disponibile' : ''}
            </p>
            <p className="text-xs text-gray-500">Totale calcolato alla conferma</p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Conferma prenotazione
          </button>
        </div>
        {result?.error && (
          <p className="mt-2 text-xs text-red-600">Errore: {result.error}</p>
        )}
      </div>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500">
        {Icon && <Icon className="h-4 w-4" />}
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </div>
  )
}
