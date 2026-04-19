'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  BookingAvailabilityItem,
  BookingConfirmation,
  BookingContext,
  BookingGuest,
  BookingSelection,
  BookingStep,
  BookingUpsell,
} from './types'
import { nightsBetween, todayStr, addDays } from './format'

export interface BookingFlowAdapter {
  /** Cerca disponibilità per date + ospiti. Ritorna array room type candidati. */
  searchAvailability(params: {
    entityId: string
    checkIn: string
    checkOut: string
    guests: number
    ratePlanId?: string
  }): Promise<BookingAvailabilityItem[]>

  /**
   * Crea prenotazione. Ritorna reservation code + eventualmente paymentSessionUrl
   * per Stripe redirect. Se paymentSessionUrl è valorizzato, il template deve
   * fare window.location = paymentSessionUrl (oppure postMessage al parent).
   */
  createBooking(input: {
    entityId: string
    selection: BookingSelection
    guest: BookingGuest
    requestPayment: boolean
  }): Promise<BookingConfirmation>
}

export interface UseBookingFlowParams {
  context: BookingContext
  adapter: BookingFlowAdapter
  initialCheckIn?: string
  initialCheckOut?: string
  initialGuests?: number
  onConfirmed?: (c: BookingConfirmation) => void
  /** Forza step iniziale + popola dati mock per anteprima admin (non invia al backend). */
  previewMode?: boolean
  previewStep?: BookingStep
}

export interface UseBookingFlowResult {
  step: BookingStep
  setStep: (s: BookingStep) => void
  selection: BookingSelection
  updateSelection: (patch: Partial<BookingSelection>) => void
  toggleUpsell: (offerId: string, qty: number) => void
  searching: boolean
  searchError: string | null
  availability: BookingAvailabilityItem[]
  selectedAvailability: BookingAvailabilityItem | null
  search: () => Promise<void>
  guest: BookingGuest
  updateGuest: (patch: Partial<BookingGuest>) => void
  submitting: boolean
  submitError: string | null
  confirmation: BookingConfirmation | null
  submit: (opts?: { requestPayment?: boolean }) => Promise<void>
  pricing: {
    nights: number
    roomSubtotal: number
    upsellSubtotal: number
    petSupplement: number
    total: number
  }
}

export function useBookingFlow(params: UseBookingFlowParams): UseBookingFlowResult {
  const { context, adapter, onConfirmed } = params

  const [step, setStep] = useState<BookingStep>(params.previewStep ?? 'search')
  const [selection, setSelection] = useState<BookingSelection>({
    roomTypeId: null,
    ratePlanId: context.defaultRatePlanId,
    checkIn: params.initialCheckIn ?? todayStr(),
    checkOut: params.initialCheckOut ?? addDays(todayStr(), 2),
    adults: params.initialGuests ?? 2,
    children: 0,
    infants: 0,
    petCount: 0,
    upsells: {},
  })

  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [availability, setAvailability] = useState<BookingAvailabilityItem[]>([])

  const [guest, setGuest] = useState<BookingGuest>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    privacyConsent: false,
    marketingConsent: false,
  })

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null)

  // Preview mode: popola dati mock per permettere navigazione step senza backend
  useEffect(() => {
    if (!params.previewMode || !params.previewStep) return
    const targetStep = params.previewStep
    const needsAvailability = ['results', 'extras', 'form', 'confirmation'].includes(targetStep)
    if (needsAvailability && availability.length === 0) {
      const mockItem: BookingAvailabilityItem = {
        roomTypeId: 'preview-room-1',
        roomTypeName: 'Camera Standard',
        description: 'Anteprima — dati di esempio',
        baseOccupancy: 2,
        maxOccupancy: 3,
        photos: [],
        amenities: ['WiFi', 'Aria condizionata', 'TV'],
        sizeSqm: 22,
        bedConfiguration: '1 letto matrimoniale',
        availableRooms: 3,
        totalRooms: 5,
        pricePerNight: 120,
        totalPrice: 240,
        nights: 2,
        currency: 'EUR',
      }
      setAvailability([mockItem])
      setSelection((s) => ({ ...s, roomTypeId: 'preview-room-1' }))
    }
    if (targetStep === 'confirmation' && !confirmation) {
      setConfirmation({
        reservationCode: 'PREV-0001',
        checkIn: selection.checkIn,
        checkOut: selection.checkOut,
        totalAmount: 240,
        currency: 'EUR',
      })
    }
  }, [params.previewMode, params.previewStep, availability.length, confirmation, selection.checkIn, selection.checkOut])

  const updateSelection = useCallback((patch: Partial<BookingSelection>) => {
    setSelection((prev) => ({ ...prev, ...patch }))
  }, [])

  const toggleUpsell = useCallback((offerId: string, qty: number) => {
    setSelection((prev) => {
      const next = { ...prev.upsells }
      if (qty <= 0) delete next[offerId]
      else next[offerId] = qty
      return { ...prev, upsells: next }
    })
  }, [])

  const updateGuest = useCallback((patch: Partial<BookingGuest>) => {
    setGuest((prev) => ({ ...prev, ...patch }))
  }, [])

  const search = useCallback(async () => {
    setSearching(true)
    setSearchError(null)
    try {
      const guests = selection.adults + selection.children
      if (guests < 1) throw new Error('Almeno 1 ospite richiesto')
      if (new Date(selection.checkOut) <= new Date(selection.checkIn)) {
        throw new Error('Data check-out deve essere dopo check-in')
      }
      const items = await adapter.searchAvailability({
        entityId: context.property.id,
        checkIn: selection.checkIn,
        checkOut: selection.checkOut,
        guests,
        ratePlanId: selection.ratePlanId ?? undefined,
      })
      setAvailability(items)
      setStep('results')
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Errore ricerca disponibilità')
    } finally {
      setSearching(false)
    }
  }, [adapter, context.property.id, selection])

  const selectedAvailability = useMemo(
    () => availability.find((a) => a.roomTypeId === selection.roomTypeId) ?? null,
    [availability, selection.roomTypeId]
  )

  const pricing = useMemo(() => {
    const nights = nightsBetween(selection.checkIn, selection.checkOut)
    const roomSubtotal = selectedAvailability?.totalPrice ?? 0

    let upsellSubtotal = 0
    for (const upsell of context.upsells) {
      const qty = selection.upsells[upsell.id] ?? 0
      if (!qty) continue
      const multiplier = resolveUpsellMultiplier(upsell, {
        nights,
        guests: selection.adults + selection.children,
      })
      upsellSubtotal += upsell.price * qty * multiplier
    }

    const petFee = context.property.pet_policy.fee_per_night * nights + context.property.pet_policy.fee_per_stay
    const petSupplement = selection.petCount > 0 ? petFee * selection.petCount : 0

    return {
      nights,
      roomSubtotal,
      upsellSubtotal,
      petSupplement,
      total: roomSubtotal + upsellSubtotal + petSupplement,
    }
  }, [selection, selectedAvailability, context.upsells, context.property.pet_policy])

  const submit = useCallback(async (opts?: { requestPayment?: boolean }) => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      if (!selection.roomTypeId) throw new Error('Seleziona una camera')
      if (!guest.firstName || !guest.lastName) throw new Error('Nome e cognome obbligatori')
      if (!guest.email) throw new Error('Email obbligatoria')
      if (!guest.privacyConsent) throw new Error('Accetta privacy policy per continuare')

      const requestPayment = opts?.requestPayment ?? true
      const result = await adapter.createBooking({
        entityId: context.property.id,
        selection,
        guest,
        requestPayment,
      })
      setConfirmation(result)

      if (result.paymentSessionUrl) {
        // Redirect a Stripe checkout (funziona anche dentro iframe)
        if (typeof window !== 'undefined') {
          // Se in iframe: notifica parent e redirect top-level
          if (window.self !== window.top) {
            window.parent.postMessage(
              { type: 'touracore:redirect', url: result.paymentSessionUrl },
              '*'
            )
            // fallback se parent non gestisce
            setTimeout(() => { window.top!.location.href = result.paymentSessionUrl! }, 300)
          } else {
            window.location.href = result.paymentSessionUrl
          }
        }
        return
      }

      setStep('confirmation')
      onConfirmed?.(result)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Errore creazione prenotazione')
    } finally {
      setSubmitting(false)
    }
  }, [adapter, context.property.id, selection, guest, onConfirmed])

  return {
    step,
    setStep,
    selection,
    updateSelection,
    toggleUpsell,
    searching,
    searchError,
    availability,
    selectedAvailability,
    search,
    guest,
    updateGuest,
    submitting,
    submitError,
    confirmation,
    submit,
    pricing,
  }
}

function resolveUpsellMultiplier(
  upsell: BookingUpsell,
  ctx: { nights: number; guests: number }
): number {
  switch (upsell.pricing_mode) {
    case 'per_night':
    case 'per_day':
      return ctx.nights
    case 'per_guest':
      return ctx.guests * ctx.nights
    default:
      return 1
  }
}
