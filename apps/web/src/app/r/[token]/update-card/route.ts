import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'
import { getStripe } from '@touracore/billing/server'
import { createHmac, timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Magic link per cliente non-loggato che deve aggiornare carta dopo fail.
 * Token format: <vertical>.<reservationId>.<expTimestamp>.<hmac>
 *
 * Genera Stripe Customer Portal session per gestire payment methods,
 * poi redirect a Portal URL. Carta nuova viene salvata sul Customer
 * → prossimo cron auto-charge userà la nuova.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params

  const parsed = verifyToken(token)
  if (!parsed.ok) {
    return new NextResponse('Link non valido o scaduto', { status: 400 })
  }

  const supabase = await createServiceRoleClient()
  const { data: pm } = await supabase
    .from('reservation_payment_methods')
    .select('stripe_customer_id, tenant_id')
    .eq('vertical', parsed.vertical).eq('reservation_id', parsed.reservationId).eq('is_primary', true)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()

  if (!pm) return new NextResponse('Carta non trovata', { status: 404 })

  const customer = pm as { stripe_customer_id: string; tenant_id: string }

  const stripe = (() => { try { return getStripe() } catch { return null } })()
  if (!stripe) return new NextResponse('Stripe non configurato', { status: 503 })

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin

  try {
    // Customer Portal session: Stripe-native UI per aggiornare carte
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.stripe_customer_id,
      return_url: `${baseUrl}/r/${token}/update-card/done`,
      configuration: undefined, // usa default account configuration
    })
    return NextResponse.redirect(session.url, { status: 303 })
  } catch (err) {
    console.error('[update-card magic link]', err)
    return new NextResponse('Errore generazione link Stripe', { status: 500 })
  }
}

interface VerifiedToken {
  ok: true
  vertical: 'hospitality' | 'restaurant' | 'bike' | 'experience'
  reservationId: string
  expiresAt: number
}

function verifyToken(token: string): VerifiedToken | { ok: false } {
  try {
    const parts = token.split('.')
    if (parts.length !== 4) return { ok: false }
    const [vertical, reservationId, expStr, hmac] = parts
    if (!['hospitality', 'restaurant', 'bike', 'experience'].includes(vertical!)) return { ok: false }
    const exp = Number(expStr)
    if (!exp || exp < Date.now() / 1000) return { ok: false }

    // Verify secret: prod richiede MAGIC_LINK_SECRET, dev accetta fallback CRON_SECRET.
    let secret = process.env.MAGIC_LINK_SECRET
    if (!secret && process.env.NODE_ENV !== 'production') {
      secret = process.env.CRON_SECRET
    }
    if (!secret) return { ok: false }

    const expected = createHmac('sha256', secret)
      .update(`${vertical}.${reservationId}.${expStr}`)
      .digest('hex')
    const a = Buffer.from(hmac!, 'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false }

    return { ok: true, vertical: vertical as VerifiedToken['vertical'], reservationId: reservationId!, expiresAt: exp }
  } catch {
    return { ok: false }
  }
}
