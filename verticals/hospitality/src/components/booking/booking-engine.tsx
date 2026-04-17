'use client'

import type { BookingContext, BookingFlowAdapter, BookingTemplate } from './core'
import { MinimalTemplate, LuxuryTemplate, MobileTemplate } from './templates'

export interface BookingEngineProps {
  context: BookingContext
  adapter: BookingFlowAdapter
  template?: BookingTemplate
  initialCheckIn?: string
  initialCheckOut?: string
  initialGuests?: number
}

/**
 * Entry-point unico del booking engine. Sceglie template dal context (default
 * da accommodations.booking_template) o da prop esplicita (override).
 *
 * Usabile sia dentro /book/[slug] (pagina full) che /embed/[slug] (iframe) che
 * dal package @touracore/booking-sdk (siti custom).
 */
export function BookingEngine(props: BookingEngineProps) {
  const template = props.template ?? props.context.template

  switch (template) {
    case 'luxury':
      return <LuxuryTemplate {...props} />
    case 'mobile':
      return <MobileTemplate {...props} />
    case 'minimal':
    default:
      return <MinimalTemplate {...props} />
  }
}
