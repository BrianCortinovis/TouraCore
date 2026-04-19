'use client'

import { useEffect, useState, useTransition } from 'react'
import type { RestaurantContext } from '@/app/api/public/restaurant/_shared'

interface Props {
  context: RestaurantContext
  template: 'minimal' | 'luxury' | 'mobile'
  isEmbed: boolean
  previewStep?: 'slot' | 'guest' | 'deposit' | 'success'
}

type Step = 'slot' | 'guest' | 'deposit' | 'success'

export function BookTableClient({ context, template, isEmbed, previewStep }: Props) {
  const [step, setStep] = useState<Step>(previewStep ?? 'slot')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [party, setParty] = useState(2)
  const [slots, setSlots] = useState<string[]>([])
  const [depositAmount, setDepositAmount] = useState(0)
  const [depositRequired, setDepositRequired] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pending, startTransition] = useTransition()
  const [reservationId, setReservationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guest, setGuest] = useState({
    name: '',
    email: '',
    phone: '',
    allergies: '',
    occasion: '',
    requests: '',
  })

  useEffect(() => {
    void loadAvailability()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, party])

  // Preview mode: popola dati mock per step avanzati
  useEffect(() => {
    if (!previewStep) return
    if (previewStep !== 'slot' && !selectedSlot) setSelectedSlot('19:30')
    if (previewStep === 'deposit' && depositAmount === 0) {
      setDepositAmount(10)
      setDepositRequired(true)
    }
    if (previewStep === 'success' && !reservationId) setReservationId('PREVIEW-001')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewStep])

  async function loadAvailability() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/public/restaurant/availability?slug=${context.slug}&date=${date}&party=${party}`,
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Errore')
      setSlots(data.slots ?? [])
      setDepositRequired(data.depositRequired ?? false)
      setDepositAmount(data.depositAmount ?? 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore')
    } finally {
      setLoading(false)
    }
  }

  function handlePickSlot(slot: string) {
    setSelectedSlot(slot)
    setStep('guest')
  }

  function handleSubmitGuest(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSlot) return
    setError(null)
    startTransition(async () => {
      try {
        const idemp = `widget_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
        const res = await fetch('/api/public/restaurant/reserve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idemp },
          body: JSON.stringify({
            slug: context.slug,
            guestName: guest.name,
            guestEmail: guest.email,
            guestPhone: guest.phone,
            partySize: party,
            slotDate: date,
            slotTime: selectedSlot,
            allergies: guest.allergies.split(',').map((a) => a.trim()).filter(Boolean),
            occasion: guest.occasion || undefined,
            specialRequests: guest.requests || undefined,
            source: 'widget',
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Errore')
        setReservationId(data.reservationId)

        if (data.depositRequired) {
          // Create checkout session
          const checkout = await fetch('/api/public/restaurant/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reservationId: data.reservationId,
              successUrl: `${window.location.origin}${window.location.pathname}?success=1&id=${data.reservationId}`,
              cancelUrl: window.location.href,
            }),
          })
          const checkoutData = await checkout.json()
          if (!checkout.ok) throw new Error(checkoutData.error ?? 'Errore checkout')
          window.location.href = checkoutData.checkoutUrl
        } else {
          setStep('success')
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Errore')
      }
    })
  }

  const layoutClass = {
    minimal: 'mx-auto max-w-2xl bg-white',
    luxury: 'mx-auto max-w-3xl bg-stone-50',
    mobile: 'mx-auto max-w-md bg-white',
  }[template]

  const accentClass = {
    minimal: 'bg-blue-600 hover:bg-blue-700',
    luxury: 'bg-amber-700 hover:bg-amber-800',
    mobile: 'bg-emerald-600 hover:bg-emerald-700',
  }[template]

  const headingClass = {
    minimal: 'font-sans',
    luxury: 'font-serif tracking-wide',
    mobile: 'font-sans text-base',
  }[template]

  if (step === 'success') {
    return (
      <div className={`${isEmbed ? '' : 'min-h-screen'} ${layoutClass} p-6 ${headingClass}`}>
        <div className="rounded-lg border border-green-300 bg-green-50 p-8 text-center">
          <div className="text-3xl">✓</div>
          <h1 className="mt-3 text-2xl font-bold text-green-900">Prenotazione confermata</h1>
          <p className="mt-2 text-green-700">
            Ti aspettiamo {date} alle {selectedSlot} — {party} coperti
          </p>
          <p className="mt-4 text-xs text-green-600">ID: {reservationId}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${isEmbed ? '' : 'min-h-screen'} ${layoutClass} p-6 ${headingClass}`}>
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{context.name}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {context.cuisine_type.join(' · ')} {context.price_range && '· ' + '€'.repeat(context.price_range)}
        </p>
      </header>

      <ol className="mb-6 flex items-center gap-2 text-xs text-gray-500">
        <li className={step === 'slot' ? 'font-bold text-gray-900' : ''}>1. Scegli slot</li>
        <li>›</li>
        <li className={step === 'guest' ? 'font-bold text-gray-900' : ''}>2. Dati ospite</li>
        {depositRequired && (
          <>
            <li>›</li>
            <li className={step === 'deposit' ? 'font-bold text-gray-900' : ''}>3. Deposito</li>
          </>
        )}
      </ol>

      {step === 'slot' && (
        <div className="space-y-4 rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700">Data</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Coperti</label>
              <input
                type="number"
                min={1}
                max={20}
                value={party}
                onChange={(e) => setParty(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {depositRequired && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
              ℹ Deposito richiesto: € {depositAmount.toFixed(2)} ({party} coperti)
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700">Slot disponibili</label>
            {loading ? (
              <p className="mt-2 text-sm text-gray-500">Caricamento…</p>
            ) : slots.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">Nessuno slot disponibile per questa data.</p>
            ) : (
              <div className="mt-2 grid grid-cols-4 gap-2">
                {slots.map((s) => (
                  <button
                    key={s}
                    onClick={() => handlePickSlot(s)}
                    className={`rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:border-blue-400 hover:text-blue-600`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {step === 'guest' && (
        <form onSubmit={handleSubmitGuest} className="space-y-3 rounded-lg border border-gray-200 p-6">
          <p className="text-xs text-gray-500">
            Slot: <span className="font-bold text-gray-900">{date} {selectedSlot}</span> · {party} coperti
            {depositRequired && <> · Deposito € {depositAmount.toFixed(2)}</>}
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="col-span-2">
              <label className="text-xs text-gray-700">Nome completo</label>
              <input
                required
                value={guest.name}
                onChange={(e) => setGuest({ ...guest, name: e.target.value })}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5"
              />
            </div>
            <div>
              <label className="text-xs text-gray-700">Email</label>
              <input
                required
                type="email"
                value={guest.email}
                onChange={(e) => setGuest({ ...guest, email: e.target.value })}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5"
              />
            </div>
            <div>
              <label className="text-xs text-gray-700">Telefono</label>
              <input
                required
                value={guest.phone}
                onChange={(e) => setGuest({ ...guest, phone: e.target.value })}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5"
              />
            </div>
            <div>
              <label className="text-xs text-gray-700">Allergie</label>
              <input
                value={guest.allergies}
                onChange={(e) => setGuest({ ...guest, allergies: e.target.value })}
                placeholder="glutine, latticini"
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5"
              />
            </div>
            <div>
              <label className="text-xs text-gray-700">Occasione</label>
              <input
                value={guest.occasion}
                onChange={(e) => setGuest({ ...guest, occasion: e.target.value })}
                placeholder="compleanno"
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-700">Richieste speciali</label>
              <textarea
                rows={2}
                value={guest.requests}
                onChange={(e) => setGuest({ ...guest, requests: e.target.value })}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-between border-t border-gray-200 pt-3">
            <button
              type="button"
              onClick={() => setStep('slot')}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm"
            >
              Indietro
            </button>
            <button
              type="submit"
              disabled={pending}
              className={`rounded px-4 py-1.5 text-sm font-medium text-white ${accentClass} disabled:opacity-50`}
            >
              {pending
                ? 'Invio…'
                : depositRequired
                  ? `Conferma e paga deposito €${depositAmount.toFixed(2)}`
                  : 'Conferma prenotazione'}
            </button>
          </div>
        </form>
      )}

      {!isEmbed && (
        <footer className="mt-6 text-center text-xs text-gray-400">
          Powered by TouraCore
        </footer>
      )}
    </div>
  )
}
