'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Select, Card, CardHeader, CardTitle, CardContent, Modal } from '@touracore/ui'
import {
  createPropertyAction,
  updatePropertyAction,
  deletePropertyAction,
  type PropertyFormData,
} from '../actions'
import type { PropertyType } from '@touracore/hospitality/src/types/database'

const PROPERTY_TYPES = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'b_and_b', label: 'Bed & Breakfast' },
  { value: 'apartment', label: 'Casa vacanze' },
  { value: 'agriturismo', label: 'Agriturismo' },
  { value: 'residence', label: 'Residence' },
  { value: 'affittacamere', label: 'Affittacamere' },
  { value: 'mixed', label: 'Altro' },
]

const AMENITIES_LIST = [
  { key: 'wifi', label: 'Wi-Fi gratuito' },
  { key: 'parking_free', label: 'Parcheggio gratuito' },
  { key: 'parking_paid', label: 'Parcheggio a pagamento' },
  { key: 'pool', label: 'Piscina' },
  { key: 'spa', label: 'Spa / Benessere' },
  { key: 'gym', label: 'Palestra' },
  { key: 'restaurant', label: 'Ristorante' },
  { key: 'bar', label: 'Bar' },
  { key: 'breakfast', label: 'Colazione inclusa' },
  { key: 'room_service', label: 'Servizio in camera' },
  { key: 'air_conditioning', label: 'Aria condizionata' },
  { key: 'heating', label: 'Riscaldamento' },
  { key: 'pets', label: 'Animali ammessi' },
  { key: 'accessible', label: 'Accessibile disabili' },
  { key: 'garden', label: 'Giardino' },
  { key: 'terrace', label: 'Terrazza' },
  { key: 'sea_view', label: 'Vista mare' },
  { key: 'mountain_view', label: 'Vista montagna' },
  { key: 'city_center', label: 'Centro città' },
  { key: 'airport_shuttle', label: 'Navetta aeroporto' },
  { key: 'laundry', label: 'Lavanderia' },
  { key: 'reception_24h', label: 'Reception 24/7' },
  { key: 'safe', label: 'Cassaforte' },
  { key: 'elevator', label: 'Ascensore' },
  { key: 'family_friendly', label: 'Family friendly' },
  { key: 'business_center', label: 'Business center' },
]

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

interface PropertyFormProps {
  entityId?: string
  initialData?: Record<string, unknown>
}

export function PropertyForm({ entityId, initialData }: PropertyFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const d = initialData ?? {}

  const [name, setName] = useState((d.name as string) ?? '')
  const [type, setType] = useState((d.type as string) ?? 'hotel')
  const [shortDescription, setShortDescription] = useState((d.short_description as string) ?? '')
  const [description, setDescription] = useState((d.description as string) ?? '')
  const [slug, setSlug] = useState((d.slug as string) ?? '')
  const [isActive, setIsActive] = useState((d.is_active as boolean) ?? true)
  const [address, setAddress] = useState((d.address as string) ?? '')
  const [city, setCity] = useState((d.city as string) ?? '')
  const [province, setProvince] = useState((d.province as string) ?? '')
  const [region, setRegion] = useState((d.region as string) ?? '')
  const [zip, setZip] = useState((d.zip as string) ?? '')
  const [country, setCountry] = useState((d.country as string) ?? 'IT')
  const [latitude, setLatitude] = useState((d.latitude as string) ?? '')
  const [longitude, setLongitude] = useState((d.longitude as string) ?? '')
  const [email, setEmail] = useState((d.email as string) ?? '')
  const [phone, setPhone] = useState((d.phone as string) ?? '')
  const [website, setWebsite] = useState((d.website as string) ?? '')
  const [checkinTime, setCheckinTime] = useState((d.default_check_in_time as string) ?? '14:00')
  const [checkoutTime, setCheckoutTime] = useState((d.default_check_out_time as string) ?? '10:00')

  const rawAmenities = d.amenities
  const initialAmenities = Array.isArray(rawAmenities) ? (rawAmenities as string[]) : []
  const [amenities, setAmenities] = useState<string[]>(initialAmenities)

  const [slugTouched, setSlugTouched] = useState(!!d.slug)

  function handleNameChange(value: string) {
    setName(value)
    if (!slugTouched) {
      setSlug(slugify(value))
    }
  }

  function toggleAmenity(key: string) {
    setAmenities((prev) =>
      prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]
    )
  }

  function buildFormData(): PropertyFormData {
    return {
      name,
      type: type as PropertyType,
      short_description: shortDescription,
      description,
      slug,
      is_active: isActive,
      address,
      city,
      province,
      region,
      zip,
      country,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      email,
      phone,
      website,
      default_check_in_time: checkinTime,
      default_check_out_time: checkoutTime,
      amenities,
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    const data = buildFormData()

    startTransition(async () => {
      const result = entityId
        ? await updatePropertyAction(entityId, data)
        : await createPropertyAction(data)

      if (result.success) {
        if (!entityId && result.data && typeof result.data === 'object' && 'id' in result.data) {
          router.push('/properties')
        }
        setMessage({
          type: 'success',
          text: entityId ? 'Modifiche salvate con successo.' : 'Struttura creata con successo.',
        })
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Errore durante il salvataggio.' })
      }
    })
  }

  function handleDelete() {
    if (!entityId) return
    startTransition(async () => {
      const result = await deletePropertyAction(entityId)
      if (result.success) {
        router.push('/properties')
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Errore durante l\'eliminazione.' })
        setShowDeleteModal(false)
      }
    })
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6 pb-24">
        {/* Informazioni generali */}
        <Card>
          <CardHeader>
            <CardTitle>Informazioni generali</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id="prop-name"
                  label="Nome della struttura"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Es. Hotel Bellavista"
                  required
                />
                <Select
                  id="prop-type"
                  label="Tipo di struttura"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  options={PROPERTY_TYPES}
                />
              </div>
              <div className="space-y-1">
                <Input
                  id="prop-short-desc"
                  label="Descrizione breve"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value.slice(0, 200))}
                  placeholder="Breve descrizione per le anteprime (max 200 caratteri)"
                />
                <p className="text-xs text-gray-400">{shortDescription.length}/200</p>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Descrizione completa</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Descrizione dettagliata della struttura..."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Input
                    id="prop-slug"
                    label="Indirizzo pagina pubblica"
                    value={slug}
                    onChange={(e) => { setSlug(e.target.value); setSlugTouched(true) }}
                    placeholder="hotel-bellavista"
                  />
                  <p className="text-xs text-gray-500">
                    I clienti ti troveranno su touracore.com/{slug || '...'}
                  </p>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Struttura attiva</span>
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dove si trova */}
        <Card>
          <CardHeader>
            <CardTitle>Dove si trova</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                id="prop-address"
                label="Indirizzo (via e numero)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Via Roma 1"
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  id="prop-zip"
                  label="CAP"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="39100"
                />
                <Input
                  id="prop-city"
                  label="Città"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Bolzano"
                />
                <Input
                  id="prop-province"
                  label="Provincia"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="BZ"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id="prop-region"
                  label="Regione"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="Trentino-Alto Adige"
                />
                <Input
                  id="prop-country"
                  label="Nazione"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="IT"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id="prop-lat"
                  label="Latitudine (opzionale)"
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="46.4983"
                />
                <Input
                  id="prop-lng"
                  label="Longitudine (opzionale)"
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="11.3548"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Servizi offerti */}
        <Card>
          <CardHeader>
            <CardTitle>Servizi offerti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {AMENITIES_LIST.map((amenity) => (
                <label key={amenity.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={amenities.includes(amenity.key)}
                    onChange={() => toggleAmenity(amenity.key)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{amenity.label}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contatti */}
        <Card>
          <CardHeader>
            <CardTitle>Contatti di questa struttura</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="prop-phone"
                label="Telefono"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+39 0471 123456"
              />
              <Input
                id="prop-email"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@hotelbellavista.it"
              />
              <Input
                id="prop-website"
                label="Sito web"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://www.hotelbellavista.it"
              />
            </div>
          </CardContent>
        </Card>

        {/* Check-in / Check-out */}
        <Card>
          <CardHeader>
            <CardTitle>Check-in / Check-out di questa struttura</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="prop-checkin"
                label="Orario check-in"
                type="time"
                value={checkinTime}
                onChange={(e) => setCheckinTime(e.target.value)}
              />
              <Input
                id="prop-checkout"
                label="Orario check-out"
                type="time"
                value={checkoutTime}
                onChange={(e) => setCheckoutTime(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Media placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Foto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
              <p className="text-sm text-gray-500">
                Funzionalità upload in preparazione. Puoi aggiungere le foto dalla sezione Media.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Barra sticky salvataggio */}
        <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-4 py-3 z-10">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/properties')}
              >
                Torna alla lista
              </Button>
              {entityId && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteModal(true)}
                >
                  Elimina struttura
                </Button>
              )}
            </div>
            <div className="flex items-center gap-4">
              {message && (
                <span className={message.type === 'success' ? 'text-sm text-green-600' : 'text-sm text-red-600'}>
                  {message.text}
                </span>
              )}
              <Button type="submit" disabled={isPending} isLoading={isPending}>
                {isPending ? 'Salvataggio...' : entityId ? 'Salva modifiche' : 'Crea struttura'}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {showDeleteModal && (
        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Elimina struttura</h3>
            <p className="text-sm text-gray-500">
              Sei sicuro di voler eliminare <strong>{name}</strong>? Questa azione non può essere annullata
              e tutti i dati collegati (camere, tariffe, prenotazioni) verranno persi.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                Annulla
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isPending} isLoading={isPending}>
                Elimina definitivamente
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
