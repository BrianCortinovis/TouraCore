import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'
import { defaultFiscalRouter, type BundleItemContext } from '@touracore/fiscal'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Auth: cron secret (internal trigger from webhook)
  const cronSecret = request.headers.get('x-cron-secret')
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: bundleId } = await params
  const supabase = await createServiceRoleClient()

  const { data: bundle } = await supabase
    .from('reservation_bundles')
    .select('*')
    .eq('id', bundleId)
    .single()

  if (!bundle) return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
  if (bundle.status === 'confirmed') {
    return NextResponse.json({ alreadyConfirmed: true })
  }
  if (bundle.status !== 'paid' && bundle.status !== 'fulfilling') {
    return NextResponse.json({ error: `Bundle status ${bundle.status} not eligible` }, { status: 400 })
  }

  // Mark fulfilling
  await supabase
    .from('reservation_bundles')
    .update({
      status: 'fulfilling',
      saga_attempts: (bundle.saga_attempts ?? 0) + 1,
      last_saga_at: new Date().toISOString(),
    })
    .eq('id', bundleId)

  const { data: items } = await supabase
    .from('reservation_bundle_items')
    .select('*')
    .eq('bundle_id', bundleId)
    .order('sort_order')

  const { data: guest } = await supabase
    .from('guest_profiles')
    .select('*')
    .eq('id', bundle.guest_profile_id)
    .single()

  if (!items || !guest) {
    return NextResponse.json({ error: 'Missing items or guest' }, { status: 500 })
  }

  const itemsCreated: string[] = []
  const itemsFailed: Array<{ id: string; error: string }> = []
  const documentsEmitted: string[] = []

  for (const item of items) {
    if (item.fulfillment_status === 'created') continue

    try {
      // Create child record per vertical
      await fulfillItem(supabase, item, bundle, guest)

      // Fetch legal_entity for fiscal emission
      const { data: le } = await supabase
        .from('legal_entities')
        .select('*')
        .eq('id', item.legal_entity_id)
        .single()

      if (le) {
        const ctx: BundleItemContext = {
          bundleId,
          itemId: item.id,
          tenantId: bundle.tenant_id,
          legalEntity: {
            id: le.id,
            tenantId: le.tenant_id,
            type: le.type,
            displayName: le.display_name,
            fiscalCode: le.fiscal_code,
            vatNumber: le.vat_number,
            companyName: le.company_name,
            fiscalRegime: le.fiscal_regime,
            sdiRecipientCode: le.sdi_recipient_code,
            sdiPec: le.sdi_pec,
            rtDeviceSerial: le.rt_device_serial,
            rtProvider: le.rt_provider,
            cinCode: le.cin_code,
            cinRegionCode: le.cin_region_code,
            stripeConnectAccountId: le.stripe_connect_account_id,
            occasionaleAnnualLimitCents: le.occasionale_annual_limit_cents,
            occasionaleYtdRevenueCents: le.occasionale_ytd_revenue_cents,
            address: {
              street: le.address_street ?? undefined,
              city: le.address_city ?? undefined,
              zip: le.address_zip ?? undefined,
              province: le.address_province ?? undefined,
              country: le.address_country ?? 'IT',
            },
          },
          guest: {
            fullName: guest.full_name,
            email: guest.email,
            fiscalCode: guest.guest_fiscal_code,
            vatNumber: guest.guest_vat_number,
            sdiCode: guest.guest_sdi_code,
            isBusiness: guest.guest_is_business ?? false,
            companyName: guest.guest_company_name,
          },
          itemType: item.item_type,
          entityId: item.entity_id,
          serviceDate: (item.config?.checkIn as string) ?? (item.config?.date as string) ?? new Date().toISOString().slice(0, 10),
          endDate: item.config?.checkOut as string | undefined,
          quantity: item.quantity,
          unitPriceCents: item.unit_price_cents,
          subtotalCents: item.subtotal_cents,
          discountCents: item.discount_cents,
          vatRate: Number(item.vat_rate),
          vatCents: item.vat_cents,
          totalCents: item.total_cents,
          description: `${item.item_type} booking`,
          metadata: item.config ?? {},
        }

        const fiscalDoc = await defaultFiscalRouter.emit(ctx)

        // Persist document in `documents` unified table
        const { data: doc } = await supabase
          .from('documents')
          .insert({
            tenant_id: bundle.tenant_id,
            entity_id: item.entity_id,
            document_type: fiscalDoc.documentType,
            vertical: item.item_type,
            document_number: fiscalDoc.number,
            series: fiscalDoc.series,
            issued_at: fiscalDoc.issuedAt,
            total_amount: fiscalDoc.totalCents / 100,
            vat_amount: fiscalDoc.vatCents / 100,
            currency: 'EUR',
            status: 'issued',
            metadata: fiscalDoc.metadata,
            xml_payload: fiscalDoc.xmlPayload ?? null,
          })
          .select('id')
          .single()

        if (doc) {
          documentsEmitted.push(doc.id)
          await supabase
            .from('reservation_bundle_items')
            .update({
              fiscal_document_id: doc.id,
              fiscal_emitter_type: fiscalDoc.emitterType,
              fiscal_emitted_at: new Date().toISOString(),
            })
            .eq('id', item.id)

          // Revenue ledger (per regime occasionale tracking)
          await supabase.rpc('register_legal_entity_revenue', {
            p_legal_entity_id: le.id,
            p_amount_cents: item.total_cents,
            p_vat_cents: item.vat_cents,
            p_document_id: doc.id,
            p_bundle_item_id: item.id,
          })
        }
      }

      await supabase
        .from('reservation_bundle_items')
        .update({
          fulfillment_status: 'created',
          fulfilled_at: new Date().toISOString(),
        })
        .eq('id', item.id)

      itemsCreated.push(item.id)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      itemsFailed.push({ id: item.id, error: msg })
      await supabase
        .from('reservation_bundle_items')
        .update({
          fulfillment_status: 'failed',
          fulfillment_error: msg,
        })
        .eq('id', item.id)
    }
  }

  const allOk = itemsFailed.length === 0
  const newStatus = allOk ? 'confirmed' : 'partial_cancelled'

  await supabase
    .from('reservation_bundles')
    .update({
      status: newStatus,
      confirmed_at: allOk ? new Date().toISOString() : null,
      saga_state: {
        items_created: itemsCreated,
        items_failed: itemsFailed,
        documents_emitted: documentsEmitted,
        compensations_applied: [],
        last_error: itemsFailed[0]?.error ?? null,
      },
    })
    .eq('id', bundleId)

  await supabase.from('bundle_audit_log').insert({
    bundle_id: bundleId,
    tenant_id: bundle.tenant_id,
    actor_type: 'system',
    actor_id: 'saga-fulfill',
    event_type: allOk ? 'bundle.confirmed' : 'bundle.partial_failed',
    event_data: { items_created: itemsCreated.length, items_failed: itemsFailed.length, documents: documentsEmitted.length },
  })

  return NextResponse.json({
    status: newStatus,
    itemsCreated: itemsCreated.length,
    itemsFailed: itemsFailed.length,
    documentsEmitted: documentsEmitted.length,
  })
}

/**
 * Crea record child vertical-specific per un bundle item.
 * v1 mappa minima — ogni vertical dovrà espandere ClassDetails.
 */
interface BundleItem {
  id: string
  entity_id: string
  item_type: string
  total_cents: number
  config: Record<string, unknown> | null
}
interface BundleRow {
  id: string
  tenant_id: string
}
interface BundleGuest {
  email: string
  full_name: string
  phone: string | null
}

async function fulfillItem(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  item: BundleItem,
  bundle: BundleRow,
  guest: BundleGuest,
): Promise<void> {
  if (item.item_type === 'hospitality') {
    const cfg = item.config ?? {}
    const { data: r } = await supabase
      .from('reservations')
      .insert({
        tenant_id: bundle.tenant_id,
        entity_id: item.entity_id,
        guest_email: guest.email,
        guest_name: guest.full_name,
        guest_phone: guest.phone,
        check_in: cfg.checkIn,
        check_out: cfg.checkOut,
        adults: cfg.guests ?? 2,
        total_amount: item.total_cents / 100,
        paid_amount: item.total_cents / 100,
        currency: 'EUR',
        status: 'confirmed',
        source: 'bundle',
        external_ref: bundle.id,
      })
      .select('id')
      .single()
    if (r) {
      await supabase
        .from('reservation_bundle_items')
        .update({ child_ref_table: 'reservations', child_ref_id: r.id })
        .eq('id', item.id)
    }
  } else if (item.item_type === 'restaurant') {
    const cfg = item.config ?? {}
    const { data: rr } = await supabase
      .from('restaurant_reservations')
      .insert({
        tenant_id: bundle.tenant_id,
        restaurant_id: item.entity_id,  // TODO: mapping entity → restaurant.id (they share id)
        guest_name: guest.full_name,
        guest_email: guest.email,
        guest_phone: guest.phone,
        reservation_date: cfg.date,
        reservation_time: cfg.time,
        party_size: cfg.covers ?? 2,
        status: 'confirmed',
        source: 'bundle',
      })
      .select('id')
      .single()
    if (rr) {
      await supabase
        .from('reservation_bundle_items')
        .update({ child_ref_table: 'restaurant_reservations', child_ref_id: rr.id })
        .eq('id', item.id)
    }
  }
  // TODO: experience, bike_rental, wellness → future verticals
}
