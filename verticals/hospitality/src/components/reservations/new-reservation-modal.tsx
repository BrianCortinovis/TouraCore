'use client'
import { Button, Input, Modal, Select } from '@touracore/ui'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@touracore/db'
import { useAuthStore } from '../../stores/auth-store'
import { usePropertyConfig } from '../../hooks/use-property-config'
import { createReservation } from '../../actions/reservations'
import { MEAL_PLAN_LABELS, BOOKING_SOURCE_LABELS, PET_TYPE_LABELS, PET_SIZE_LABELS } from '../../constants'
import { Loader2, Search, UserPlus } from 'lucide-react'
import type { Guest, RoomType, RatePlan, PetDetail, MealPlan, BookingSource } from '../../types/database'
import { useRouter } from 'next/navigation'

interface NewReservationModalProps {
  isOpen: boolean
  onClose: () => void
}

const mealPlanOptions = Object.entries(MEAL_PLAN_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const sourceOptions = Object.entries(BOOKING_SOURCE_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export function NewReservationModal({ isOpen, onClose }: NewReservationModalProps) {
  const router = useRouter()
  const { property } = useAuthStore()
  const { config } = usePropertyConfig()

  // Data from DB
  const [guests, setGuests] = useState<Guest[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Guest search
  const [guestSearch, setGuestSearch] = useState('')
  const [filteredGuests, setFilteredGuests] = useState<Guest[]>([])
  const [showGuestDropdown, setShowGuestDropdown] = useState(false)

  // Form state
  const [form, setForm] = useState({
    guest_id: '',
    guestDisplay: '',
    room_type_id: '',
    rate_plan_id: '',
    check_in: '',
    check_out: '',
    adults: 1,
    children: 0,
    meal_plan: 'breakfast',
    source: 'direct',
    total_amount: 0,
    pet_count: 0,
    pet_details: [] as PetDetail[],
    special_requests: '',
    internal_notes: '',
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      const [roomTypesRes, ratePlansRes, guestsRes] = await Promise.all([
        supabase.from('room_types').select('*').order('sort_order'),
        supabase.from('rate_plans').select('*').eq('is_active', true).order('name'),
        supabase.from('guests').select('*').order('last_name').limit(100),
      ])

      if (roomTypesRes.data) setRoomTypes(roomTypesRes.data as RoomType[])
      if (ratePlansRes.data) setRatePlans(ratePlansRes.data as RatePlan[])
      if (guestsRes.data) setGuests(guestsRes.data as Guest[])
    } catch {
      setError('Errore nel caricamento dei dati')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadData()
      setForm({
        guest_id: '',
        guestDisplay: '',
        room_type_id: '',
        rate_plan_id: '',
        check_in: '',
        check_out: '',
        adults: 1,
        children: 0,
        meal_plan: 'breakfast',
        source: 'direct',
        total_amount: 0,
        pet_count: 0,
        pet_details: [],
        special_requests: '',
        internal_notes: '',
      })
      setError(null)
      setGuestSearch('')
    }
  }, [isOpen, loadData])

  // Guest search filtering
  useEffect(() => {
    if (!guestSearch.trim()) {
      setFilteredGuests(guests.slice(0, 10))
      return
    }
    const q = guestSearch.toLowerCase()
    setFilteredGuests(
      guests
        .filter(
          (g) =>
            g.first_name.toLowerCase().includes(q) ||
            g.last_name.toLowerCase().includes(q) ||
            (g.email && g.email.toLowerCase().includes(q))
        )
        .slice(0, 10)
    )
  }, [guestSearch, guests])

  // Estimate price
  useEffect(() => {
    if (form.check_in && form.check_out && form.room_type_id) {
      const nights = Math.max(
        1,
        Math.round(
          (new Date(form.check_out).getTime() - new Date(form.check_in).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
      const rt = roomTypes.find((r) => r.id === form.room_type_id)
      if (rt) {
        setForm((prev) => ({ ...prev, total_amount: rt.base_price * nights }))
      }
    }
  }, [form.check_in, form.check_out, form.room_type_id, roomTypes])

  const handleSubmit = async () => {
    if (!property) {
      setError('Organizzazione non trovata')
      return
    }
    if (!form.guest_id) {
      setError('Seleziona un ospite')
      return
    }
    if (!form.room_type_id) {
      setError('Seleziona un tipo di camera')
      return
    }
    if (!form.check_in || !form.check_out) {
      setError('Inserisci le date di check-in e check-out')
      return
    }
    if (form.check_in >= form.check_out) {
      setError('La data di check-out deve essere successiva al check-in')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await createReservation({
        entity_id: property.id,
        guest_id: form.guest_id,
        room_type_id: form.room_type_id,
        rate_plan_id: form.rate_plan_id || null,
        check_in: form.check_in,
        check_out: form.check_out,
        adults: form.adults,
        children: form.children,
        meal_plan: form.meal_plan as MealPlan,
        source: form.source as BookingSource,
        total_amount: form.total_amount,
        pet_count: form.pet_count,
        pet_details: form.pet_details,
        special_requests: form.special_requests || null,
        internal_notes: form.internal_notes || null,
      })

      // Reminder: contratto di locazione per soggiorni >30 notti (apartment)
      if (config.features.rentalContracts && form.check_in && form.check_out) {
        const nights = Math.round((new Date(form.check_out).getTime() - new Date(form.check_in).getTime()) / 86400000)
        if (nights > 30) {
          setTimeout(() => {
            alert('Attenzione: per soggiorni superiori a 30 notti e\' obbligatorio stipulare un contratto di locazione turistica. Vai alla sezione Contratti per crearlo.')
          }, 300)
        }
      }

      onClose()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nella creazione della prenotazione')
    } finally {
      setSaving(false)
    }
  }

  const roomTypeOptions = roomTypes.map((rt) => ({
    value: rt.id,
    label: `${rt.name} (${rt.base_price.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}/notte)`,
  }))

  const ratePlanOptions = ratePlans.map((rp) => ({
    value: rp.id,
    label: rp.name,
  }))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuova Prenotazione" size="lg">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Guest selection */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Ospite *
            </label>
            {form.guest_id ? (
              <div className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2">
                <span className="flex-1 text-sm text-gray-900">
                  {form.guestDisplay}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      guest_id: '',
                      guestDisplay: '',
                    }))
                  }
                >
                  Cambia
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cerca ospite per nome o email..."
                  value={guestSearch}
                  onChange={(e) => {
                    setGuestSearch(e.target.value)
                    setShowGuestDropdown(true)
                  }}
                  onFocus={() => setShowGuestDropdown(true)}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {showGuestDropdown && filteredGuests.length > 0 && (
                  <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    {filteredGuests.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50"
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            guest_id: g.id,
                            guestDisplay: `${g.first_name} ${g.last_name}${g.email ? ` (${g.email})` : ''}`,
                          }))
                          setShowGuestDropdown(false)
                          setGuestSearch('')
                        }}
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                          {g.first_name[0]}
                          {g.last_name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {g.first_name} {g.last_name}
                          </p>
                          {g.email && (
                            <p className="text-xs text-gray-500">{g.email}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Check-in *"
              type="date"
              value={form.check_in}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, check_in: e.target.value }))
              }
            />
            <Input
              label="Check-out *"
              type="date"
              value={form.check_out}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, check_out: e.target.value }))
              }
            />
          </div>

          {/* Room type & Rate plan */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tipo camera *"
              options={roomTypeOptions}
              placeholder="Seleziona..."
              value={form.room_type_id}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, room_type_id: e.target.value }))
              }
            />
            <Select
              label="Piano tariffario"
              options={ratePlanOptions}
              placeholder="Nessuno"
              value={form.rate_plan_id}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, rate_plan_id: e.target.value }))
              }
            />
          </div>

          {/* Guests & Meal plan */}
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Adulti *"
              type="number"
              min={1}
              max={10}
              value={form.adults}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  adults: parseInt(e.target.value) || 1,
                }))
              }
            />
            <Input
              label="Bambini"
              type="number"
              min={0}
              max={10}
              value={form.children}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  children: parseInt(e.target.value) || 0,
                }))
              }
            />
            <Select
              label="Trattamento"
              options={mealPlanOptions}
              value={form.meal_plan}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, meal_plan: e.target.value }))
              }
            />
          </div>

          {/* Animali */}
          {property?.pets_allowed && (() => {
            const policy = (property.pet_policy ?? {}) as Record<string, unknown>
            const maxPets = (policy.max_pets as number) ?? 5
            const allowedTypes = (policy.allowed_types as string[]) ?? ['dog', 'cat', 'other']
            const allowedSizes = (policy.allowed_sizes as string[]) ?? ['small', 'medium', 'large']
            const feePerNight = (policy.fee_per_night as number) ?? 0
            const feePerStay = (policy.fee_per_stay as number) ?? 0
            const nights = form.check_in && form.check_out
              ? Math.max(1, Math.round((new Date(form.check_out).getTime() - new Date(form.check_in).getTime()) / 86400000))
              : 1
            const petFee = form.pet_count > 0
              ? (feePerNight > 0 ? feePerNight * nights * form.pet_count : 0) + (feePerStay > 0 ? feePerStay * form.pet_count : 0)
              : 0

            return (
              <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">Animali al seguito</h4>
                  {petFee > 0 && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                      Supplemento: {petFee.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setForm((prev) => {
                      const count = Math.max(0, prev.pet_count - 1)
                      return { ...prev, pet_count: count, pet_details: prev.pet_details.slice(0, count) }
                    })}
                    disabled={form.pet_count === 0}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 text-lg font-medium"
                  >-</button>
                  <span className="w-8 text-center text-lg font-semibold text-gray-900">{form.pet_count}</span>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => {
                      if (prev.pet_count >= maxPets) return prev
                      const details = [...prev.pet_details, { type: allowedTypes[0] as PetDetail['type'], size: 'medium' as PetDetail['size'] }]
                      return { ...prev, pet_count: prev.pet_count + 1, pet_details: details }
                    })}
                    disabled={form.pet_count >= maxPets}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 text-lg font-medium"
                  >+</button>
                  <span className="text-xs text-gray-500">max {maxPets}</span>
                </div>

                {form.pet_count > 0 && form.pet_details.slice(0, form.pet_count).map((pet, idx) => (
                  <div key={idx} className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Animale {idx + 1}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-500">Tipo *</label>
                        <select
                          value={pet.type}
                          onChange={(e) => {
                            setForm((prev) => {
                              const details = [...prev.pet_details]
                              details[idx] = { ...details[idx]!, type: e.target.value as PetDetail['type'] }
                              return { ...prev, pet_details: details }
                            })
                          }}
                          className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {allowedTypes.map((v) => (
                            <option key={v} value={v}>{PET_TYPE_LABELS[v] ?? v}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-500">Taglia *</label>
                        <select
                          value={pet.size}
                          onChange={(e) => {
                            setForm((prev) => {
                              const details = [...prev.pet_details]
                              details[idx] = { ...details[idx]!, size: e.target.value as PetDetail['size'] }
                              return { ...prev, pet_details: details }
                            })
                          }}
                          className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {allowedSizes.map((v) => (
                            <option key={v} value={v}>{PET_SIZE_LABELS[v] ?? v}</option>
                          ))}
                        </select>
                      </div>
                      <Input
                        label="Nome"
                        placeholder="Es. Rex"
                        value={pet.name ?? ''}
                        onChange={(e) => {
                          setForm((prev) => {
                            const details = [...prev.pet_details]
                            details[idx] = { ...details[idx]!, name: e.target.value || undefined }
                            return { ...prev, pet_details: details }
                          })
                        }}
                      />
                      <Input
                        label="Razza"
                        placeholder="Es. Labrador"
                        value={pet.breed ?? ''}
                        onChange={(e) => {
                          setForm((prev) => {
                            const details = [...prev.pet_details]
                            details[idx] = { ...details[idx]!, breed: e.target.value || undefined }
                            return { ...prev, pet_details: details }
                          })
                        }}
                      />
                    </div>
                  </div>
                ))}

                {(feePerNight > 0 || feePerStay > 0) && form.pet_count === 0 && (
                  <p className="text-xs text-gray-500">
                    Supplemento animali: {feePerNight > 0 ? `${feePerNight.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}/notte per animale` : ''}
                    {feePerNight > 0 && feePerStay > 0 ? ' + ' : ''}
                    {feePerStay > 0 ? `${feePerStay.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}/soggiorno per animale` : ''}
                  </p>
                )}
              </div>
            )
          })()}

          {/* Source & Amount */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Fonte prenotazione"
              options={sourceOptions}
              value={form.source}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, source: e.target.value }))
              }
            />
            <Input
              label="Importo totale"
              type="number"
              min={0}
              step={0.01}
              value={form.total_amount}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  total_amount: parseFloat(e.target.value) || 0,
                }))
              }
            />
          </div>

          {/* Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Richieste speciali
              </label>
              <textarea
                rows={3}
                value={form.special_requests}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    special_requests: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Es. stanza ai piani alti..."
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Note interne
              </label>
              <textarea
                rows={3}
                value={form.internal_notes}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    internal_notes: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Note visibili solo allo staff..."
              />
            </div>
          </div>

          {/* Price summary */}
          {form.check_in && form.check_out && form.room_type_id && (
            <div className="rounded-lg bg-blue-50 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {Math.max(
                    1,
                    Math.round(
                      (new Date(form.check_out).getTime() -
                        new Date(form.check_in).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  )}{' '}
                  notti
                </span>
                <span className="font-semibold text-gray-900">
                  {form.total_amount.toLocaleString('it-IT', {
                    style: 'currency',
                    currency: 'EUR',
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Annulla
            </Button>
            <Button onClick={handleSubmit} isLoading={saving}>
              Crea Prenotazione
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
