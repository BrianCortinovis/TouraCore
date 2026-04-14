'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Select } from '@touracore/ui'
import { createPropertyAction } from '../../../../(dashboard)/properties/actions'

const PROPERTY_TYPE_OPTIONS = [
  { value: 'apartment', label: 'Casa vacanze' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'b_and_b', label: 'Bed & Breakfast' },
  { value: 'agriturismo', label: 'Agriturismo' },
  { value: 'residence', label: 'Residence' },
  { value: 'affittacamere', label: 'Affittacamere' },
  { value: 'mixed', label: 'Struttura mista' },
]

interface NewStayFormProps {
  tenantSlug: string
  defaultCountry: string
}

export function NewStayForm({ tenantSlug, defaultCountry }: NewStayFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [type, setType] = useState('hotel')
  const [slug, setSlug] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [zip, setZip] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Il nome della struttura è obbligatorio')
      return
    }

    setIsLoading(true)

    const result = await createPropertyAction({
      name,
      type: type as 'hotel' | 'b_and_b' | 'apartment' | 'agriturismo' | 'residence' | 'affittacamere' | 'mixed',
      slug: slug || undefined,
      city: city || undefined,
      address: address || undefined,
      zip: zip || undefined,
      country: defaultCountry,
      is_active: true,
    })

    if (!result.success) {
      setError(result.error ?? 'Errore durante la creazione')
      setIsLoading(false)
      return
    }

    // Redirect alla lista strutture
    router.push(`/${tenantSlug}/stays`)
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
        label="Nome struttura *"
        id="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Es: Villa Irabo, Hotel Sole, Casa del Mare"
        required
      />

      <Select
        label="Tipo struttura *"
        id="type"
        value={type}
        onChange={(e) => setType(e.target.value)}
        options={PROPERTY_TYPE_OPTIONS}
      />

      <div>
        <Input
          label="Slug (opzionale)"
          id="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="villa-irabo"
        />
        <p className="mt-1 text-xs text-gray-500">
          Usato negli URL pubblici. Se vuoto, viene generato dal nome.
        </p>
      </div>

      <Input
        label="Indirizzo"
        id="address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Via Roma 12"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Città"
          id="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Milano"
        />
        <Input
          label="CAP"
          id="zip"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          placeholder="20100"
        />
      </div>

      <div className="flex items-center gap-3 pt-4">
        <Button type="submit" isLoading={isLoading}>
          Crea struttura
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push(`/${tenantSlug}/stays`)}
        >
          Annulla
        </Button>
      </div>
    </form>
  )
}
