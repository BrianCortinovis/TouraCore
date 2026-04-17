'use client'

import { useSearchParams } from 'next/navigation'
import { BookingEngine, type BookingContext, type BookingTemplate } from '@touracore/hospitality/src/components/booking'
import { createServerActionAdapter } from './booking-adapter'

export function BookingPageClient({ context }: { context: BookingContext }) {
  const params = useSearchParams()

  const templateOverride = params.get('template') as BookingTemplate | null
  const template = (templateOverride && ['minimal', 'luxury', 'mobile'].includes(templateOverride))
    ? templateOverride
    : context.template

  const checkIn = params.get('check_in') ?? undefined
  const checkOut = params.get('check_out') ?? undefined
  const guestsRaw = params.get('guests')
  const guests = guestsRaw ? parseInt(guestsRaw, 10) : undefined

  const adapter = createServerActionAdapter({
    returnUrl: typeof window !== 'undefined' ? window.location.origin + window.location.pathname + '?paid=1' : undefined,
    cancelUrl: typeof window !== 'undefined' ? window.location.href : undefined,
  })

  return (
    <BookingEngine
      context={context}
      adapter={adapter}
      template={template}
      initialCheckIn={checkIn}
      initialCheckOut={checkOut}
      initialGuests={guests}
    />
  )
}
