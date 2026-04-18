import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@touracore/db/server'
import { verifyVoucherJwt } from '@touracore/vouchers/server'
import { CreditLanding } from './credit-landing'
import type { CreditInstrumentRow, GiftCardDesignRow } from '@touracore/vouchers'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false } }

export default async function CreditLandingPage({
  params,
}: {
  params: Promise<{ jwt: string }>
}) {
  const { jwt } = await params
  const verified = await verifyVoucherJwt(jwt)
  if (!verified) notFound()

  const supabase = await createServiceRoleClient()
  const { data: credit } = await supabase
    .from('credit_instruments')
    .select('*')
    .eq('id', verified.instrumentId)
    .eq('tenant_id', verified.tenantId)
    .maybeSingle()
  if (!credit) notFound()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, slug')
    .eq('id', verified.tenantId)
    .maybeSingle()

  let design: GiftCardDesignRow | null = null
  if (credit.design_id) {
    const { data: d } = await supabase
      .from('gift_card_designs')
      .select('*')
      .eq('id', credit.design_id)
      .maybeSingle()
    design = d as GiftCardDesignRow | null
  }

  return (
    <CreditLanding
      credit={credit as CreditInstrumentRow}
      design={design}
      tenantName={tenant?.name ?? 'TouraCore'}
      tenantSlug={tenant?.slug ?? ''}
    />
  )
}
