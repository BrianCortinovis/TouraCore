'use client'

import { useState, useTransition } from 'react'
import { Button, Input, Select } from '@touracore/ui'
import { saveTenantSettingsBatchAction } from '../actions'

interface CheckinTabProps {
  settings: Record<string, unknown>
}

const CANCELLATION_OPTIONS = [
  { value: 'free', label: 'Cancellazione libera' },
  { value: '7_days', label: 'Fino a 7 giorni prima' },
  { value: '14_days', label: 'Fino a 14 giorni prima' },
  { value: '30_days', label: 'Fino a 30 giorni prima' },
  { value: 'non_refundable', label: 'Non rimborsabile' },
]

export function CheckinTab({ settings }: CheckinTabProps) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [checkinStart, setCheckinStart] = useState((settings['checkin.time_start'] as string) ?? '14:00')
  const [checkinEnd, setCheckinEnd] = useState((settings['checkin.time_end'] as string) ?? '20:00')
  const [checkoutStart, setCheckoutStart] = useState((settings['checkout.time_start'] as string) ?? '07:00')
  const [checkoutEnd, setCheckoutEnd] = useState((settings['checkout.time_end'] as string) ?? '10:00')
  const [cancellationPolicy, setCancellationPolicy] = useState(
    (settings['policy.cancellation_default'] as string) ?? 'free'
  )
  const [minAge, setMinAge] = useState((settings['policy.min_age'] as string) ?? '18')
  const [petsAllowed, setPetsAllowed] = useState((settings['policy.pets_allowed'] as boolean) ?? false)
  const [smokingAllowed, setSmokingAllowed] = useState((settings['policy.smoking_allowed'] as boolean) ?? false)
  const [childrenAllowed, setChildrenAllowed] = useState((settings['policy.children_allowed'] as boolean) ?? true)
  const [partiesAllowed, setPartiesAllowed] = useState((settings['policy.parties_allowed'] as boolean) ?? false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    startTransition(async () => {
      const result = await saveTenantSettingsBatchAction({
        'checkin.time_start': checkinStart,
        'checkin.time_end': checkinEnd,
        'checkout.time_start': checkoutStart,
        'checkout.time_end': checkoutEnd,
        'policy.cancellation_default': cancellationPolicy,
        'policy.min_age': minAge,
        'policy.pets_allowed': petsAllowed,
        'policy.smoking_allowed': smokingAllowed,
        'policy.children_allowed': childrenAllowed,
        'policy.parties_allowed': partiesAllowed,
      })
      if (result.success) {
        setMessage({ type: 'success', text: 'Regole salvate con successo.' })
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Errore durante il salvataggio.' })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-4">Orari check-in</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="checkin-start"
            label="Check-in dalle"
            type="time"
            value={checkinStart}
            onChange={(e) => setCheckinStart(e.target.value)}
          />
          <Input
            id="checkin-end"
            label="Check-in fino alle"
            type="time"
            value={checkinEnd}
            onChange={(e) => setCheckinEnd(e.target.value)}
          />
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-4">Orari check-out</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="checkout-start"
            label="Check-out dalle"
            type="time"
            value={checkoutStart}
            onChange={(e) => setCheckoutStart(e.target.value)}
          />
          <Input
            id="checkout-end"
            label="Check-out fino alle"
            type="time"
            value={checkoutEnd}
            onChange={(e) => setCheckoutEnd(e.target.value)}
          />
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-4">Politica di cancellazione</h3>
        <div className="max-w-sm">
          <Select
            id="cancellation-policy"
            label="Politica di cancellazione predefinita"
            value={cancellationPolicy}
            onChange={(e) => setCancellationPolicy(e.target.value)}
            options={CANCELLATION_OPTIONS}
          />
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-4">Regole della struttura</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="min-age"
            label="Età minima per il check-in"
            type="number"
            value={minAge}
            onChange={(e) => setMinAge(e.target.value)}
            placeholder="18"
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {[
            { key: 'pets', label: 'Animali ammessi', value: petsAllowed, setter: setPetsAllowed },
            { key: 'smoking', label: 'Fumo ammesso', value: smokingAllowed, setter: setSmokingAllowed },
            { key: 'children', label: 'Bambini ammessi', value: childrenAllowed, setter: setChildrenAllowed },
            { key: 'parties', label: 'Feste / eventi ammessi', value: partiesAllowed, setter: setPartiesAllowed },
          ].map(({ key, label, value, setter }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => setter(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </section>

      {message && (
        <p className={message.type === 'success' ? 'text-sm text-green-600' : 'text-sm text-red-600'}>
          {message.text}
        </p>
      )}

      <div className="flex justify-end pt-4 border-t border-gray-200">
        <Button type="submit" disabled={isPending} isLoading={isPending}>
          {isPending ? 'Salvataggio...' : 'Salva modifiche'}
        </Button>
      </div>
    </form>
  )
}
