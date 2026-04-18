import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@touracore/db/server'
import { ExperienceSidebar } from './experience-sidebar'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
  children: React.ReactNode
}

export default async function ExperienceEntityLayout({ params, children }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) notFound()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, name, slug, kind')
    .eq('tenant_id', tenant.id)
    .eq('slug', entitySlug)
    .eq('kind', 'activity')
    .single()
  if (!entity) notFound()

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <ExperienceSidebar tenantSlug={tenantSlug} entitySlug={entitySlug} entityName={entity.name} />
      <main className="flex-1 overflow-x-auto p-6">{children}</main>
    </div>
  )
}
