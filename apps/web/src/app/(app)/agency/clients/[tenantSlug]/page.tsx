import { createServerSupabaseClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@touracore/ui'
import { Building2 } from 'lucide-react'

interface ClientDetailProps {
  params: Promise<{ tenantSlug: string }>
}

export default async function AgencyClientDetail({ params }: ClientDetailProps) {
  const { tenantSlug } = await params
  const supabase = await createServerSupabaseClient()

  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('agency_memberships')
    .select('agency_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) redirect('/')

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug, country')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) notFound()

  const { data: link } = await supabase
    .from('agency_tenant_links')
    .select('id, status, billing_mode, default_management_mode, commission_pct')
    .eq('agency_id', membership.agency_id)
    .eq('tenant_id', tenant.id)
    .single()

  if (!link) notFound()

  const { data: entities } = await supabase
    .from('entities')
    .select('id, slug, name, kind, management_mode, is_active')
    .eq('tenant_id', tenant.id)
    .order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
            <span>{tenant.country?.toUpperCase()}</span>
            <span className="text-gray-300">·</span>
            <Badge variant={link.status === 'active' ? 'default' : 'secondary'}>
              {link.status === 'active' ? 'Attivo' : link.status}
            </Badge>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Strutture</h2>
        {(!entities || entities.length === 0) ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <p className="text-sm text-gray-500">Nessuna struttura per questo cliente.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {entities.map((entity) => (
              <Link key={entity.id} href={`/${tenantSlug}/stays/${entity.slug}`}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        {entity.name}
                      </span>
                      <Badge variant={entity.is_active ? 'default' : 'secondary'}>
                        {entity.is_active ? 'Attiva' : 'Inattiva'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-500">
                      {entity.management_mode === 'agency_managed' ? 'Gestita da agenzia' : 'Self-service'}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
