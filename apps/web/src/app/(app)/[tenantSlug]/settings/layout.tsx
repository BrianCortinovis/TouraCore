import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@touracore/db/server'
import { SettingsSidebar } from './settings-sidebar'

interface SettingsLayoutProps {
  children: React.ReactNode
  params: Promise<{ tenantSlug: string }>
}

export default async function SettingsLayout({ children, params }: SettingsLayoutProps) {
  const { tenantSlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) notFound()

  // Prima struttura attiva del tenant per shortcut "Vai al CMS"
  const { data: firstEntity } = await supabase
    .from('entities')
    .select('slug')
    .eq('tenant_id', tenant.id)
    .eq('kind', 'accommodation')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return (
    <div className="flex gap-6">
      <SettingsSidebar
        tenantSlug={tenantSlug}
        tenantName={tenant.name}
        firstEntitySlug={firstEntity?.slug ?? null}
      />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
