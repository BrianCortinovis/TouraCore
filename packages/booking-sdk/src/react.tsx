'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { TouraBookingClient, type BookingClientConfig, type SdkAvailabilityItem, type SdkBookingContext } from './client'

export { TouraBookingClient }

/**
 * Hook React pronto all'uso nei siti custom Next.js / Vite.
 *
 * ```tsx
 * function MyCustomBookingUI() {
 *   const { context, search, availability, createBooking, loading } = useTouraBooking({
 *     baseUrl: process.env.NEXT_PUBLIC_TOURACORE_URL!,
 *     slug: 'grand-hotel-adriatico',
 *   })
 *
 *   if (!context) return <Loading />
 *   return <YourCustomDesignedUI {...} />
 * }
 * ```
 */
export function useTouraBooking(config: BookingClientConfig) {
  const clientRef = useRef<TouraBookingClient | null>(null)
  if (!clientRef.current) clientRef.current = new TouraBookingClient(config)
  const client = clientRef.current

  const [context, setContext] = useState<SdkBookingContext | null>(null)
  const [availability, setAvailability] = useState<SdkAvailabilityItem[]>([])
  const [nights, setNights] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const ctx = await client.getContext()
        if (mounted) setContext(ctx)
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Errore')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [client])

  const search = useCallback(async (params: { checkIn: string; checkOut: string; guests: number; ratePlanId?: string }) => {
    setLoading(true)
    setError(null)
    try {
      const res = await client.searchAvailability(params)
      setAvailability(res.items)
      setNights(res.nights)
      return res
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore ricerca')
      throw e
    } finally {
      setLoading(false)
    }
  }, [client])

  const createBooking = useCallback(
    async (input: Parameters<TouraBookingClient['createBooking']>[0]) => client.createBooking(input),
    [client]
  )

  const payAndRedirect = useCallback(
    async (reservationId: string, opts?: { returnUrl?: string; cancelUrl?: string }) => {
      const { url } = await client.createCheckoutSession(reservationId, opts)
      if (typeof window !== 'undefined') window.location.href = url
      return url
    },
    [client]
  )

  return { client, context, availability, nights, loading, error, search, createBooking, payAndRedirect }
}
