'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@touracore/auth/store'
import { Button, Input, Select } from '@touracore/ui'
import { AlertTriangle } from 'lucide-react'
import { getPropertyAction, updatePropertyAction } from '../../../../(dashboard)/properties/actions'
import { COUNTRY_DEFINITIONS, isCountryFullySupported } from '@touracore/legal'
import type { CountryCode } from '@touracore/legal'
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

const AMENITIES_LIST = [
  'Wi-Fi gratuito', 'Parcheggio gratuito', 'Parcheggio a pagamento', 'Piscina',
  'Spa e benessere', 'Palestra', 'Ristorante', 'Bar', 'Colazione inclusa',
  'Servizio in camera', 'Aria condizionata', 'Riscaldamento', 'Animali ammessi',
  'Accessibile disabili', 'Giardino', 'Terrazza', 'Vista mare', 'Vista montagna',
  'Centro città', 'Navetta aeroporto', 'Lavanderia', 'Reception 24/7',
  'Cassaforte', 'Ascensore', 'Family friendly', 'Business center',
]

interface PropertyData {
  name: string
  type: PropertyType
  short_description: string
  description: string
  slug: string
  is_active: boolean
  address: string
  city: string
  province: string
  region: string
  zip: string
  country: string
  latitude: string
  longitude: string
  email: string
  phone: string
  website: string
  default_check_in_time: string
  default_check_out_time: string
  amenities: string[]
}

export default function CmsPropertySettingsPage() {
  const params = useParams()
  const router = useRouter()
  const entityId = params.entityId as string
  useAuthStore()

  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [data, setData] = useState<PropertyData>({
    name: '', type: 'hotel', short_description: '', description: '',
    slug: '', is_active: true, address: '', city: '', province: '',
    region: '', zip: '', country: 'IT', latitude: '', longitude: '',
    email: '', phone: '', website: '',
    default_check_in_time: '14:00', default_check_out_time: '10:00',
    amenities: [],
  })

  useEffect(() => {
    async function load() {
      const result = await getPropertyAction(entityId)
      if (result.success && result.data) {
        const p = result.data as Record<string, unknown>
        setData({
          name: (p.name as string) ?? '',
          type: (p.type as PropertyType) ?? 'hotel',
          short_description: (p.short_description as string) ?? '',
          description: (p.description as string) ?? '',
          slug: (p.slug as string) ?? '',
          is_active: (p.is_active as boolean) ?? true,
          address: (p.address as string) ?? '',
          city: (p.city as string) ?? '',
          province: (p.province as string) ?? '',
          region: (p.region as string) ?? '',
          zip: (p.zip as string) ?? '',
          country: (p.country as string) ?? 'IT',
          latitude: p.latitude ? String(p.latitude) : '',
          longitude: p.longitude ? String(p.longitude) : '',
          email: (p.email as string) ?? '',
          phone: (p.phone as string) ?? '',
          website: (p.website as string) ?? '',
          default_check_in_time: (p.default_check_in_time as string) ?? '14:00',
          default_check_out_time: (p.default_check_out_time as string) ?? '10:00',
          amenities: (p.amenities as string[]) ?? [],
        })
      }
      setIsFetching(false)
    }
    load()
  }, [entityId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!data.name.trim()) {
      setMessage({ type: 'error', text: 'Il nome della struttura è obbligatorio.' })
      return
    }
    setIsLoading(true)
    setMessage(null)

    const result = await updatePropertyAction(entityId, {
      name: data.name.trim(),
      type: data.type,
      short_description: data.short_description || undefined,
      description: data.description || undefined,
      slug: data.slug || undefined,
      is_active: data.is_active,
      address: data.address || undefined,
      city: data.city || undefined,
      province: data.province || undefined,
      region: data.region || undefined,
      zip: data.zip || undefined,
      country: data.country || 'IT',
      latitude: data.latitude ? parseFloat(data.latitude) : null,
      longitude: data.longitude ? parseFloat(data.longitude) : null,
      email: data.email || undefined,
      phone: data.phone || undefined,
      website: data.website || undefined,
      default_check_in_time: data.default_check_in_time || undefined,
      default_check_out_time: data.default_check_out_time || undefined,
      amenities: data.amenities,
    })

    if (result.success) {
      setMessage({ type: 'success', text: 'Impostazioni salvate con successo.' })
      router.refresh()
    } else {
      setMessage({ type: 'error', text: result.error ?? 'Errore durante il salvataggio.' })
    }
    setIsLoading(false)
  }

  function updateField(field: keyof PropertyData, value: unknown) {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  function toggleAmenity(amenity: string) {
    setData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }))
  }

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  const countryCode = (data.country || 'IT') as CountryCode
  const countryDef = COUNTRY_DEFINITIONS[countryCode] ?? COUNTRY_DEFINITIONS.IT
  const isFullySupported = isCountryFullySupported(countryCode)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Impostazioni struttura</h1>
        <p className="mt-1 text-sm text-gray-500">Configura i dettagli di {data.name || 'questa struttura'}</p>
      </div>

      {message && (
        <div className={`rounded-lg border p-3 text-sm ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Dati struttura */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Informazioni generali</h2>
          <Input label="Nome della struttura" id="name" value={data.name} onChange={(e) => updateField('name', e.target.value)} required />
          <Select label="Tipo di struttura" id="type" value={data.type} onChange={(e) => updateField('type', e.target.value)} options={PROPERTY_TYPE_OPTIONS} />
          <div>
            <label htmlFor="short_desc" className="block text-sm font-medium text-gray-700">Descrizione breve</label>
            <textarea id="short_desc" value={data.short_description} onChange={(e) => updateField('short_description', e.target.value)} maxLength={200} rows={2} className="mt-1 flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descrizione completa</label>
            <textarea id="description" value={data.description} onChange={(e) => updateField('description', e.target.value)} rows={4} className="mt-1 flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={data.is_active} onChange={(e) => updateField('is_active', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
            <span className="text-sm text-gray-700">Struttura attiva</span>
          </label>
        </section>

        {/* Posizione */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Dove si trova</h2>
          <Input label="Indirizzo" id="address" value={data.address} onChange={(e) => updateField('address', e.target.value)} placeholder="Via Roma, 1" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="CAP" id="zip" value={data.zip} onChange={(e) => updateField('zip', e.target.value)} />
            <Input label="Città" id="city" value={data.city} onChange={(e) => updateField('city', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Provincia" id="province" value={data.province} onChange={(e) => updateField('province', e.target.value)} />
            <Input label="Regione" id="region" value={data.region} onChange={(e) => updateField('region', e.target.value)} />
            <Input label="Nazione" id="country" value={data.country} disabled />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Latitudine" id="latitude" value={data.latitude} onChange={(e) => updateField('latitude', e.target.value)} placeholder="46.0679" />
            <Input label="Longitudine" id="longitude" value={data.longitude} onChange={(e) => updateField('longitude', e.target.value)} placeholder="11.1211" />
          </div>
        </section>

        {/* Servizi */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Servizi offerti</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {AMENITIES_LIST.map((amenity) => (
              <label key={amenity} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={data.amenities.includes(amenity)}
                  onChange={() => toggleAmenity(amenity)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700">{amenity}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Contatti */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Contatti</h2>
          <Input label="Telefono" id="phone" value={data.phone} onChange={(e) => updateField('phone', e.target.value)} />
          <Input label="Email" id="email" value={data.email} onChange={(e) => updateField('email', e.target.value)} type="email" />
          <Input label="Sito web" id="website" value={data.website} onChange={(e) => updateField('website', e.target.value)} placeholder="https://" />
        </section>

        {/* Check-in / Check-out */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Check-in / Check-out</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Orario check-in" id="checkin" type="time" value={data.default_check_in_time} onChange={(e) => updateField('default_check_in_time', e.target.value)} />
            <Input label="Orario check-out" id="checkout" type="time" value={data.default_check_out_time} onChange={(e) => updateField('default_check_out_time', e.target.value)} />
          </div>
        </section>

        {/* Dati fiscali e compliance */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Dati fiscali e compliance</h2>
          {isFullySupported ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <p>I dati fiscali della struttura (CIN, SCIA, assicurazione, codici Alloggiati e ISTAT) sono configurabili nella sezione dedicata.</p>
              <p className="mt-2 text-xs text-gray-400">Funzionalità completa disponibile nella prossima versione.</p>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Configurazione fiscale per {countryDef.name} in arrivo
                </p>
                <p className="mt-1 text-sm text-yellow-700">
                  La gestione fiscale e la compliance per {countryDef.name} saranno disponibili a breve.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Media placeholder */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Media</h2>
          <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-500">
              Funzionalità upload in preparazione. Puoi aggiungere le foto dalla sezione Media.
            </p>
          </div>
        </section>

        {/* Sticky save bar */}
        <div className="sticky bottom-0 -mx-6 border-t border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <Button type="submit" isLoading={isLoading}>
              Salva impostazioni
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push(`/cms/${entityId}`)}>
              Annulla
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
