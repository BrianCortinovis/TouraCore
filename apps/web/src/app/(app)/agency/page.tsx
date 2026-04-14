import { createServerSupabaseClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@touracore/ui'
import { Building2, Users, BarChart3 } from 'lucide-react'

export default async function AgencyDashboard() {
  const supabase = await createServerSupabaseClient()

  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('agency_memberships')
    .select('agency_id, role, agencies(id, name, slug)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) redirect('/')

  const agency = membership.agencies as unknown as { id: string; name: string; slug: string }

  const { count: clientCount } = await supabase
    .from('agency_tenant_links')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agency.id)
    .eq('status', 'active')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{agency.name}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <Building2 className="h-4 w-4" />
              Clienti attivi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{clientCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <Users className="h-4 w-4" />
              Strutture gestite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">&mdash;</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <BarChart3 className="h-4 w-4" />
              Revenue mensile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">&mdash;</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
