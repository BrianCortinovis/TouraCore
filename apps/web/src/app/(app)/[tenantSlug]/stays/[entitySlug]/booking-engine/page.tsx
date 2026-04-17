import { createServerSupabaseClient } from '@touracore/db/server'
import { notFound } from 'next/navigation'
import { normalizeTheme } from '@touracore/hospitality/src/components/booking/core/theme'
import type { BookingTemplate } from '@touracore/hospitality/src/components/booking'
import { BookingEngineAdminClient } from './booking-engine-admin'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export default async function BookingEngineAdminPage({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('slug', tenantSlug)
    .single()
  if (!tenant) notFound()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, slug, name')
    .eq('tenant_id', tenant.id)
    .eq('slug', entitySlug)
    .single()
  if (!entity) notFound()

  const { data: acc } = await supabase
    .from('accommodations')
    .select('booking_template, booking_theme')
    .eq('entity_id', entity.id)
    .maybeSingle()

  const { data: apiKeys } = await supabase
    .from('public_booking_keys')
    .select('id, key_prefix, name, allowed_domains, scopes, is_active, last_used_at, created_at, expires_at')
    .eq('entity_id', entity.id)
    .order('created_at', { ascending: false })

  const template = (acc?.booking_template ?? 'minimal') as BookingTemplate
  const theme = normalizeTheme(acc?.booking_theme)

  return (
    <BookingEngineAdminClient
      tenantSlug={tenantSlug}
      entity={{ id: entity.id, slug: entity.slug, name: entity.name }}
      initialTemplate={template}
      initialTheme={theme}
      apiKeys={apiKeys ?? []}
    />
  )
}
