'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Select } from '@touracore/ui'
import { createPropertyAction } from '../../../../(dashboard)/properties/actions'
import type { PropertyType } from '@touracore/hospitality/src/types/database'

const PROPERTY_TYPE_OPTIONS = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'b_and_b', label: 'B&B' },
  { value: 'apartment', label: 'Appartamento' },
  { value: 'agriturismo', label: 'Agriturismo' },
  { value: 'residence', label: 'Residence' },
  { value: 'affittacamere', label: 'Affittacamere' },
  { value: 'mixed', label: 'Struttura mista' },
]

export default function NewPropertyPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [type, setType] = useState<PropertyType>('hotel')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [shortDescription, setShortDescription] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Il nome della struttura è obbligatorio.')
      return
    }

    setIsLoading(true)
    setError('')

    const result = await createPropertyAction({
      name: name.trim(),
      type,
      address: address || undefined,
      city: city || undefined,
      province: province || undefined,
      short_description: shortDescription || undefined,
    })

    if (result.success && result.data) {
      const data = result.data as { id: string; slug: string; tenantSlug: string }
      router.push(`/${data.tenantSlug}/stays/${data.slug}`)
    } else {
      setError(result.error ?? 'Errore durante la creazione.')
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Nuova struttura</h1>
        <p className="mt-1 text-sm text-gray-500">Inserisci i dati principali. Potrai completare il profilo dopo.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nome della struttura"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Es. Hotel Belvedere"
          required
        />

        <Select
          label="Tipo di struttura"
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value as PropertyType)}
          options={PROPERTY_TYPE_OPTIONS}
        />

        <Input
          label="Indirizzo"
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Via Roma, 1"
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Città"
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Trento"
          />
          <Input
            label="Provincia"
            id="province"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            placeholder="TN"
            maxLength={2}
          />
        </div>

        <div>
          <label htmlFor="short_description" className="block text-sm font-medium text-gray-700">
            Descrizione breve
          </label>
          <textarea
            id="short_description"
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            placeholder="Breve presentazione della struttura (max 200 caratteri)"
            maxLength={200}
            rows={2}
            className="mt-1 flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" isLoading={isLoading}>
            Crea struttura
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/account/properties')}
          >
            Annulla
          </Button>
        </div>
      </form>
    </div>
  )
}
