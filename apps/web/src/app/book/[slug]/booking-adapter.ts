'use client'

import type { BookingFlowAdapter } from '@touracore/hospitality/src/components/booking/core'
import type { BookingAvailabilityItem } from '@touracore/hospitality/src/components/booking/core'
import { searchAvailabilityAction, createPublicBookingAction } from './actions'

/**
 * Adapter per usare i nuovi template core con le server actions esistenti.
 * Mantiene /book/[slug] route compatibile senza rewrite delle actions.
 */
export function createServerActionAdapter(opts: {
  returnUrl?: string
  cancelUrl?: string
}): BookingFlowAdapter {
  return {
    async searchAvailability(params) {
      const items = await searchAvailabilityAction(
        params.entityId,
        params.checkIn,
        params.checkOut,
        params.guests,
        params.ratePlanId
      )
      return items.map((it): BookingAvailabilityItem => ({
        roomTypeId: it.roomType.id,
        roomTypeName: it.roomType.name,
        description: it.roomType.description,
        baseOccupancy: it.roomType.base_occupancy,
        maxOccupancy: it.roomType.max_occupancy,
        photos: it.roomType.photos ?? [],
        amenities: Array.isArray(it.roomType.amenities) ? (it.roomType.amenities as string[]) : [],
        sizeSqm: it.roomType.size_sqm,
        bedConfiguration: it.roomType.bed_configuration,
        availableRooms: it.availableRooms,
        totalRooms: it.totalRooms,
        pricePerNight: it.offer?.effectivePricePerNight ?? it.roomType.base_price ?? 0,
        totalPrice: it.offer?.totalPrice ?? (it.roomType.base_price ?? 0),
        nights: Math.max(1, Math.ceil((new Date(params.checkOut).getTime() - new Date(params.checkIn).getTime()) / 86400000)),
        currency: 'EUR',
      }))
    },

    async createBooking({ entityId, selection, guest, requestPayment }) {
      const res = await createPublicBookingAction({
        entityId,
        roomTypeId: selection.roomTypeId!,
        ratePlanId: selection.ratePlanId,
        checkIn: selection.checkIn,
        checkOut: selection.checkOut,
        adults: selection.adults,
        children: selection.children,
        infants: selection.infants,
        petCount: selection.petCount,
        guestName: `${guest.firstName} ${guest.lastName}`.trim(),
        guestEmail: guest.email,
        guestPhone: guest.phone,
        nationality: guest.nationality,
        specialRequests: guest.specialRequests,
        privacyConsent: guest.privacyConsent,
        marketingConsent: guest.marketingConsent,
        selectedUpsells: Object.entries(selection.upsells).map(([offerId, quantity]) => ({
          offerId,
          quantity,
        })),
      })

      if (!res.success || !res.data) {
        throw new Error(res.error ?? 'Errore creazione prenotazione')
      }
      const data = res.data as {
        reservationCode: string
        checkIn: string
        checkOut: string
        totalAmount: number
        currency: string
        reservationId?: string
      }

      let paymentSessionUrl: string | undefined
      if (requestPayment && data.reservationId) {
        const resp = await fetch('/api/public/booking/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reservationId: data.reservationId,
            returnUrl: opts.returnUrl,
            cancelUrl: opts.cancelUrl,
            includeTouristTax: Boolean(guest.payTouristTaxOnline),
          }),
        })
        if (resp.ok) {
          const js = (await resp.json()) as { url?: string }
          paymentSessionUrl = js.url
        }
      }

      return {
        reservationCode: data.reservationCode,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        totalAmount: data.totalAmount,
        currency: data.currency,
        paymentSessionUrl,
      }
    },
  }
}
