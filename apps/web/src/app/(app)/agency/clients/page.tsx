import { createServerSupabaseClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@touracore/ui'

export default async function AgencyClientsPage() {
  const supabase = await createServerSupabaseClient()

  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('agency_memberships')
    .select('agency_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) redirect('/')

  const { data: links } = await supabase
    .from('agency_tenant_links')
    .select('id, status, billing_mode, tenants(id, name, slug, country)')
    .eq('agency_id', membership.agency_id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clienti</h1>
      </div>

      {(!links || links.length === 0) ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">Nessun cliente collegato.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => {
            const tenant = link.tenants as unknown as { id: string; name: string; slug: string; country: string }
            return (
              <Link key={link.id} href={`/agency/clients/${tenant.slug}`}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between">
                      <span className="text-lg">{tenant.name}</span>
                      <Badge variant={link.status === 'active' ? 'default' : 'secondary'}>
                        {link.status === 'active' ? 'Attivo' : link.status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{tenant.country?.toUpperCase()}</span>
                      <span className="text-gray-300">·</span>
                      <span>{link.billing_mode === 'pass_through' ? 'Pass-through' : 'Commissione'}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
