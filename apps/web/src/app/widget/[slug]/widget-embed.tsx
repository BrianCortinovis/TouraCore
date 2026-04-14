'use client'

import BookingWidget from '@touracore/hospitality/src/components/booking/booking-widget'

interface Props {
  propertySlug: string
  propertyName: string
  accentColor: string
}

export function WidgetEmbed({ propertySlug, propertyName, accentColor }: Props) {
  return (
    <div className="p-4">
      <BookingWidget
        orgSlug={propertySlug}
        hotelName={propertyName}
        accentColor={accentColor}
        showHeader
      />
    </div>
  )
}
