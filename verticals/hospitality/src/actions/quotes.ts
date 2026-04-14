'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db'
import { getCurrentOrg } from '../queries/auth'
import type { QuoteStatus, Json } from '../types/database'
import { sendEmail } from '../stubs/integrations/email'
import { renderTemplate } from '../stubs/integrations/email'
import { getTemplateById } from '../stubs/email/templates'
import { processPlatformChargeForReservation } from '../stubs/platform-billing/service'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuoteOptionInput {
  room_type_id: string
  room_type_name: string
  rate_plan_id?: string | null
  rate_plan_name?: string | null
  price_per_night: number
  total_price: number
  description?: string | null
  photos?: string[]
}

export interface CreateQuoteData {
  guest_id?: string | null
  guest_name: string
  guest_email?: string | null
  guest_phone?: string | null
  check_in: string
  check_out: string
  adults: number
  children?: number
  options: QuoteOptionInput[]
  message?: string | null
  terms?: string | null
  valid_until?: string | null
  photos?: string[]
}

export interface UpdateQuoteData {
  guest_name?: string
  guest_email?: string | null
  guest_phone?: string | null
  check_in?: string
  check_out?: string
  adults?: number
  children?: number
  options?: QuoteOptionInput[]
  message?: string | null
  terms?: string | null
  valid_until?: string | null
  photos?: string[]
  status?: QuoteStatus
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const QUOTE_PATHS = ['/quotes', '/dashboard']

function revalidateQuotePaths() {
  for (const p of QUOTE_PATHS) {
    revalidatePath(p)
  }
}

/**
 * Generate a sequential quote number in the format PRV-YYYY-NNN
 */
async function generateQuoteNumber(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  orgId: string
): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `PRV-${year}-`

  // Find the latest quote number for this org and year
  const { data } = await supabase
    .from('quotes')
    .select('quote_number')
    .eq('entity_id', orgId)
    .ilike('quote_number', `${prefix}%`)
    .order('quote_number', { ascending: false })
    .limit(1)

  let nextNum = 1
  if (data && data.length > 0) {
    const lastNum = data[0]!.quote_number.replace(prefix, '')
    const parsed = parseInt(lastNum, 10)
    if (!isNaN(parsed)) {
      nextNum = parsed + 1
    }
  }

  return `${prefix}${String(nextNum).padStart(3, '0')}`
}

/**
 * Generate a unique URL-safe token for the public quote page.
 */
function generateToken(): string {
  return randomBytes(24).toString('base64url')
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Create a new quote with auto-generated quote_number (PRV-YYYY-NNN).
 */
export async function createQuote(data: CreateQuoteData) {
  if (!data.guest_name) throw new Error('guest_name is required')
  if (!data.check_in) throw new Error('check_in is required')
  if (!data.check_out) throw new Error('check_out is required')
  if (!data.options || data.options.length === 0) throw new Error('At least one option is required')

  const supabase = await createServerSupabaseClient()
  const { property, staff } = await getCurrentOrg()
  const orgId = property?.id
  if (!orgId) throw new Error('Organization not found')

  const quoteNumber = await generateQuoteNumber(supabase, orgId)
  const token = generateToken()

  // Compute total_min and total_max from options
  const prices = data.options.map((o) => o.total_price)
  const totalMin = Math.min(...prices)
  const totalMax = Math.max(...prices)

  const { data: quote, error } = await supabase
    .from('quotes')
    .insert({
      entity_id: orgId,
      quote_number: quoteNumber,
      guest_id: data.guest_id ?? null,
      guest_name: data.guest_name,
      guest_email: data.guest_email ?? null,
      guest_phone: data.guest_phone ?? null,
      status: 'draft' as QuoteStatus,
      check_in: data.check_in,
      check_out: data.check_out,
      adults: data.adults,
      children: data.children ?? 0,
      options: data.options as unknown as Json,
      message: data.message ?? null,
      terms: data.terms ?? null,
      valid_until: data.valid_until ?? null,
      total_min: totalMin,
      total_max: totalMax,
      token,
      photos: (data.photos ?? []) as unknown as Json,
      created_by: staff?.id ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create quote: ${error.message}`)

  revalidateQuotePaths()
  return quote
}

/**
 * Update an existing quote's fields.
 */
export async function updateQuote(id: string, data: UpdateQuoteData) {
  if (!id) throw new Error('Quote id is required')

  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id

  if (!orgId) throw new Error('Organization not found')

  // If options changed, recalculate min/max totals
  const updatePayload: Record<string, unknown> = {
    ...data,
    updated_at: new Date().toISOString(),
  }

  if (data.options) {
    const prices = data.options.map((o) => o.total_price)
    updatePayload.total_min = Math.min(...prices)
    updatePayload.total_max = Math.max(...prices)
    updatePayload.options = data.options as unknown as Json
  }

  if (data.photos) {
    updatePayload.photos = data.photos as unknown as Json
  }

  const { data: quote, error } = await supabase
    .from('quotes')
    .update(updatePayload)
    .eq('id', id)
    .eq('entity_id', orgId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update quote: ${error.message}`)

  revalidateQuotePaths()
  return quote
}

/**
 * Mark a quote as sent, record the sent_at timestamp, and email the guest.
 */
export async function sendQuote(id: string) {
  if (!id) throw new Error('Quote id is required')

  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id
  const now = new Date().toISOString()

  if (!orgId) throw new Error('Organization not found')

  // Fetch quote with organization info for email
  const { data: quote, error } = await supabase
    .from('quotes')
    .update({
      status: 'sent' as QuoteStatus,
      sent_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .eq('entity_id', orgId)
    .select('*, organization:organizations(id, name, tagline, email, phone, address, city, province, zip)')
    .single()

  if (error) throw new Error(`Failed to send quote: ${error.message}`)

  // Send the actual email to guest
  if (quote.guest_email && quote.token) {
    const template = await getTemplateById('quote_proposal')
    const org = quote.organization as Record<string, string | null> | null
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const quoteUrl = `${appUrl}/quote/${quote.token}`
    const options = (quote.options ?? []) as Array<{ total_price?: number }>
    const nights = Math.max(
      1,
      Math.round(
        (new Date(quote.check_out).getTime() - new Date(quote.check_in).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    )

    const priceFrom = options.length > 0
      ? Math.min(...options.map((o) => o.total_price ?? 0))
      : 0

    const variables: Record<string, string> = {
      guest_name: quote.guest_name || 'Gentile Ospite',
      check_in_date: new Date(quote.check_in).toLocaleDateString('it-IT'),
      check_out_date: new Date(quote.check_out).toLocaleDateString('it-IT'),
      guest_count: String((quote.adults ?? 1) + (quote.children ?? 0)),
      nights_count: String(nights),
      personal_message: quote.message || '',
      price_from: `€${priceFrom.toFixed(2)}`,
      options_count: String(options.length),
      quote_url: quoteUrl,
      valid_until: quote.valid_until
        ? new Date(quote.valid_until).toLocaleDateString('it-IT')
        : '',
      hotel_name: org?.name || '',
      hotel_tagline: org?.tagline || '',
      hotel_address: [org?.address, org?.city, org?.province, org?.zip].filter(Boolean).join(', '),
      hotel_phone: org?.phone || '',
      hotel_email: org?.email || '',
    }

    const subject = renderTemplate(template?.subject || 'La nostra proposta - {{hotel_name}}', variables)
    const html = renderTemplate(template?.html || `<p>Gentile {{guest_name}}, <a href="{{quote_url}}">visualizza il preventivo</a></p>`, variables)

    sendEmail({
      organizationId: quote.entity_id,
      to: quote.guest_email,
      subject,
      html,
    }).catch((err) => console.error('[Quote] Errore invio email:', err))
  }

  revalidateQuotePaths()
  return quote
}

/**
 * Called from the public page when a guest views the quote.
 * Sets viewed_at and updates status to 'viewed' (only if currently 'sent').
 */
export async function markQuoteViewed(token: string) {
  if (!token) throw new Error('Token is required')

  // Use service role: called from public page by unauthenticated guests
  const supabase = await createServiceRoleClient()
  const now = new Date().toISOString()

  // Only update if status is 'sent' (first view)
  const { data: quote, error } = await supabase
    .from('quotes')
    .update({
      status: 'viewed' as QuoteStatus,
      viewed_at: now,
      updated_at: now,
    })
    .eq('token', token)
    .eq('status', 'sent')
    .select()
    .maybeSingle()

  if (error) throw new Error(`Failed to mark quote as viewed: ${error.message}`)

  // It's OK if no rows were updated (quote already viewed or accepted)
  return quote
}

/**
 * Accept a quote option from the public page.
 * Creates a guest (if needed) and a reservation from the selected option,
 * then updates the quote status.
 */
export async function acceptQuote(token: string, optionIndex: number) {
  if (!token) throw new Error('Token is required')
  if (optionIndex < 0) throw new Error('Invalid option index')

  // Use service role: called from public page by unauthenticated guests
  const supabase = await createServiceRoleClient()
  const now = new Date().toISOString()

  // Fetch the quote
  const { data: quote, error: fetchError } = await supabase
    .from('quotes')
    .select('*')
    .eq('token', token)
    .single()

  if (fetchError || !quote) throw new Error('Quote not found')

  if (quote.status === 'accepted') throw new Error('Quote already accepted')
  if (quote.status === 'expired') throw new Error('Quote has expired')
  if (quote.status === 'declined') throw new Error('Quote was declined')

  // Parse options
  const options = quote.options as QuoteOptionInput[]
  if (!options || optionIndex >= options.length) {
    throw new Error('Invalid option selected')
  }

  const selectedOption = options[optionIndex]

  // Find or create guest
  let guestId = quote.guest_id

  if (!guestId && quote.guest_name) {
    // Split guest_name into first and last
    const nameParts = quote.guest_name.trim().split(/\s+/)
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    const { data: newGuest, error: guestError } = await supabase
      .from('guests')
      .insert({
        entity_id: quote.entity_id,
        first_name: firstName,
        last_name: lastName,
        email: quote.guest_email ?? null,
        phone: quote.guest_phone ?? null,
      })
      .select()
      .single()

    if (guestError) throw new Error(`Failed to create guest: ${guestError.message}`)
    guestId = newGuest.id
  }

  if (!guestId) throw new Error('Could not determine guest for reservation')

  // Generate reservation code
  const { data: codeResult, error: codeError } = await supabase.rpc(
    'generate_reservation_code',
    { org_id: quote.entity_id }
  )
  if (codeError) throw new Error(`Failed to generate reservation code: ${codeError.message}`)

  // Create reservation from the accepted option
  const { data: reservation, error: resError } = await supabase
    .from('reservations')
    .insert({
      entity_id: quote.entity_id,
      reservation_code: codeResult as string,
      guest_id: guestId,
      room_type_id: selectedOption!.room_type_id,
      rate_plan_id: selectedOption!.rate_plan_id ?? null,
      check_in: quote.check_in,
      check_out: quote.check_out,
      status: 'confirmed',
      source: 'direct',
      adults: quote.adults,
      children: quote.children ?? 0,
      infants: 0,
      meal_plan: 'room_only',
      total_amount: selectedOption!.total_price,
      paid_amount: 0,
      currency: 'EUR',
      commission_amount: 0,
      commission_rate: 0,
      internal_notes: `Creata da preventivo ${quote.quote_number}`,
    })
    .select()
    .single()

  if (resError) throw new Error(`Failed to create reservation: ${resError.message}`)

  try {
    await processPlatformChargeForReservation({
      organizationId: reservation.entity_id,
      reservationId: reservation.id,
      reservationCode: reservation.reservation_code,
      totalAmount: reservation.total_amount,
      status: reservation.status,
      source: reservation.source,
      createdAt: reservation.created_at,
    })
  } catch (platformBillingError) {
    console.error('[Quotes] Platform billing error post-create:', platformBillingError)
  }

  // Update quote status
  const { error: updateError } = await supabase
    .from('quotes')
    .update({
      status: 'accepted' as QuoteStatus,
      accepted_at: now,
      accepted_option: optionIndex,
      converted_reservation_id: reservation.id,
      guest_id: guestId,
      updated_at: now,
    })
    .eq('id', quote.id)

  if (updateError) throw new Error(`Failed to update quote status: ${updateError.message}`)

  revalidateQuotePaths()
  return { quote: { ...quote, status: 'accepted' }, reservation }
}

/**
 * Delete a quote (only allowed for drafts).
 */
export async function deleteQuote(id: string) {
  if (!id) throw new Error('Quote id is required')

  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id

  if (!orgId) throw new Error('Organization not found')

  // Verify it's a draft before deleting
  const { data: existing, error: fetchError } = await supabase
    .from('quotes')
    .select('status')
    .eq('id', id)
    .eq('entity_id', orgId)
    .single()

  if (fetchError) throw new Error(`Quote not found: ${fetchError.message}`)
  if (existing.status !== 'draft') {
    throw new Error('Solo i preventivi in bozza possono essere eliminati')
  }

  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', id)
    .eq('entity_id', orgId)

  if (error) throw new Error(`Failed to delete quote: ${error.message}`)

  revalidateQuotePaths()
}
