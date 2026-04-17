# @touracore/booking-sdk

SDK per integrare il booking engine TouraCore nativamente in siti custom (senza iframe).

## Install

```bash
pnpm add @touracore/booking-sdk
```

## Uso — client vanilla

```ts
import { TouraBookingClient } from '@touracore/booking-sdk'

const client = new TouraBookingClient({
  baseUrl: 'https://app.touracore.com',
  slug: 'grand-hotel-adriatico',
})

const ctx = await client.getContext()
// { property, ratePlans, upsells, theme, template }

const { items } = await client.searchAvailability({
  checkIn: '2026-06-10',
  checkOut: '2026-06-14',
  guests: 2,
})

const booking = await client.createBooking({
  entityId: ctx.property.id,
  roomTypeId: items[0].roomTypeId,
  checkIn: '2026-06-10',
  checkOut: '2026-06-14',
  adults: 2,
  guestName: 'Mario Rossi',
  guestEmail: 'mario@example.com',
  guestPhone: '+39...',
  privacyConsent: true,
})

const { url } = await client.createCheckoutSession(booking.reservationId)
window.location.href = url // Stripe checkout
```

## Uso — React hook

```tsx
import { useTouraBooking } from '@touracore/booking-sdk/react'

function BookingForm() {
  const { context, availability, search, createBooking, payAndRedirect, loading } = useTouraBooking({
    baseUrl: process.env.NEXT_PUBLIC_TOURACORE_URL!,
    slug: 'grand-hotel-adriatico',
  })

  // Costruisci la TUA UI, client gestisce API + Stripe redirect
}
```

## 3 modi di integrare

| Modo | Quando usarlo | Pro | Contro |
|------|---------------|-----|--------|
| **Iframe** `<iframe src="/embed/slug">` | Clienti non-tech, embed rapido | Zero sviluppo | Limitato personalizzare |
| **SDK headless** (questo package) | Siti custom realizzati da TouraCore | UI 100% tua, pagamento sicuro via Stripe | Richiede frontend dev |
| **API raw** (fetch diretto) | Integrazione lato server-side / non-JS | Massima flessibilità | Devi gestire tutto a mano |

## API Reference

### TouraBookingClient

- `getContext()` — carica property + rate plans + upsells + theme
- `searchAvailability({ checkIn, checkOut, guests, ratePlanId? })` — elenca camere
- `createBooking({ ... })` — crea reservation (status: confirmed, paid_amount: 0)
- `createCheckoutSession(reservationId, { returnUrl?, cancelUrl? })` — Stripe URL
