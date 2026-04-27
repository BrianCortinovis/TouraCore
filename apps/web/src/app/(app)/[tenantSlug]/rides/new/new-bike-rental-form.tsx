'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@touracore/ui'
import { createBikeRentalEntityAction } from '../../../../(auth)/onboarding/step-3/kind-actions'

const ALL_BIKE_TYPES: { key: string; label: string }[] = [
  { key: 'city', label: 'City' },
  { key: 'e_city', label: 'E-City' },
  { key: 'mtb', label: 'Mountain Bike' },
  { key: 'e_mtb', label: 'E-MTB' },
  { key: 'road', label: 'Road' },
  { key: 'gravel', label: 'Gravel' },
  { key: 'kids', label: 'Bici bambini' },
  { key: 'tandem', label: 'Tandem' },
]

interface NewBikeRentalFormProps {
  tenantSlug: string
}

export function NewBikeRentalForm({ tenantSlug }: NewBikeRentalFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [zip, setZip] = useState('')
  const [capacity, setCapacity] = useState('5')
  const [bikeTypes, setBikeTypes] = useState<string[]>(['city'])

  function toggleType(key: string) {
    setBikeTypes((prev) => (prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Il nome è obbligatorio')
      return
    }
    if (bikeTypes.length === 0) {
      setError('Seleziona almeno una tipologia di bici')
      return
    }

    setIsLoading(true)

    const result = await createBikeRentalEntityAction({
      name,
      address: address || undefined,
      city: city || undefined,
      zip: zip || undefined,
      bikeTypes,
      capacity: Number.parseInt(capacity, 10) || 0,
    })

    if (!result.success) {
      setError(result.error ?? 'Errore durante la creazione')
      setIsLoading(false)
      return
    }

    router.push(`/${tenantSlug}/rides/${result.entitySlug}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Input
        label="Nome punto noleggio *"
        id="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Es: GardaBike Gardone"
        required
      />

      <Input
        label="Indirizzo"
        id="address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Via del Garda 12"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Città"
          id="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Gardone Riviera"
        />
        <Input
          label="CAP"
          id="zip"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          placeholder="25083"
        />
      </div>

      <Input
        label="Numero bici totali"
        id="capacity"
        type="number"
        min="0"
        value={capacity}
        onChange={(e) => setCapacity(e.target.value)}
      />

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Tipologie disponibili *
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ALL_BIKE_TYPES.map((bt) => (
            <button
              key={bt.key}
              type="button"
              onClick={() => toggleType(bt.key)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                bikeTypes.includes(bt.key)
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {bt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-4">
        <Button type="submit" isLoading={isLoading}>
          Crea punto noleggio
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push(`/${tenantSlug}/rides`)}
        >
          Annulla
        </Button>
      </div>
    </form>
  )
}
