'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Select } from '@touracore/ui'
import { createFirstPropertyAction, type Step3Input } from '../actions'

const PROPERTY_TYPE_OPTIONS = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'b_and_b', label: 'B&B' },
  { value: 'apartment', label: 'Appartamento' },
  { value: 'agriturismo', label: 'Agriturismo' },
  { value: 'residence', label: 'Residence' },
  { value: 'affittacamere', label: 'Affittacamere' },
  { value: 'mixed', label: 'Struttura mista' },
]

export default function Step3Form() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [skip, setSkip] = useState(false)

  const [name, setName] = useState('')
  const [type, setType] = useState('hotel')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [shortDescription, setShortDescription] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (skip) {
      router.push('/account/overview')
      return
    }

    if (!name.trim()) {
      setError('Il nome della struttura è obbligatorio.')
      return
    }

    setIsLoading(true)
    setError('')

    const input: Step3Input = {
      name: name.trim(),
      type: type as Step3Input['type'],
      address: address || undefined,
      city: city || undefined,
      province: province || undefined,
      short_description: shortDescription || undefined,
    }

    const result = await createFirstPropertyAction(input)
    if (result.success && result.entitySlug && result.tenantSlug) {
      router.push(`/${result.tenantSlug}/stays/${result.entitySlug}`)
    } else {
      setError(result.error ?? 'Errore durante la creazione.')
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Pannello branding */}
      <div className="hidden w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-12">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
            <span className="text-3xl font-bold text-white">T</span>
          </div>
          <h1 className="text-4xl font-bold text-white">TouraCore</h1>
          <p className="mt-3 text-lg text-blue-100">La tua prima struttura</p>
          <div className="mt-8 space-y-3 text-left text-sm text-blue-200">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-300" />
              Configurazione iniziale
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-300" />
              Dati della tua attività
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-300" />
              La tua prima struttura
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex w-full items-start justify-center overflow-y-auto p-8 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
              <span className="text-xl font-bold text-white">T</span>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-xs font-medium uppercase text-gray-400">Passo 3 di 3</p>
            <h2 className="mt-1 text-2xl font-bold text-gray-900">La tua prima struttura</h2>
            <p className="mt-2 text-sm text-gray-500">
              Puoi creare la tua prima struttura ora o farlo dopo.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Toggle salta */}
          <label className="mb-6 flex items-center gap-2 rounded-lg border border-gray-200 p-3">
            <input
              type="checkbox"
              checked={skip}
              onChange={(e) => setSkip(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm text-gray-700">Salta per ora, creo le strutture dopo</span>
          </label>

          {skip ? (
            <Button
              className="w-full"
              size="lg"
              onClick={() => router.push('/account/overview')}
            >
              Vai alla panoramica
            </Button>
          ) : (
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
                onChange={(e) => setType(e.target.value)}
                options={PROPERTY_TYPE_OPTIONS}
              />

              <Input
                label="Indirizzo"
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Via Roma, 1"
              />

              <div className="grid grid-cols-2 gap-3">
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
                <label htmlFor="short_desc" className="block text-sm font-medium text-gray-700">
                  Descrizione breve
                </label>
                <textarea
                  id="short_desc"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="Breve presentazione (max 200 caratteri)"
                  maxLength={200}
                  rows={2}
                  className="mt-1 flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                Crea struttura e inizia
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
