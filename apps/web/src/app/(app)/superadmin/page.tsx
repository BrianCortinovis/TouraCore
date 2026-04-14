import { createServiceRoleClient } from '@touracore/db/server'
import { Card, CardContent, CardHeader, CardTitle } from '@touracore/ui'
import { Building2, Briefcase, Users, Activity } from 'lucide-react'

interface TenantRow {
  id: string
  name: string
  slug: string
  country: string | null
  created_at: string
}

interface AuditLogRow {
  id: string
  action: string
  entity_type: string
  created_at: string
  user_id: string
}

export default async function SuperadminOverview() {
  const supabase = await createServiceRoleClient()

  const [
    { count: tenantCount },
    { count: entityCount },
    { count: agencyCount },
    { count: userCount },
  ] = await Promise.all([
    supabase.from('tenants').select('id', { count: 'exact', head: true }),
    supabase.from('entities').select('id', { count: 'exact', head: true }),
    supabase.from('agencies').select('id', { count: 'exact', head: true }),
    supabase.from('staff_members').select('user_id', { count: 'exact', head: true }),
  ])

  const { data: recentTenants } = await supabase
    .from('tenants')
    .select('id, name, slug, country, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: recentLogs } = await supabase
    .from('audit_logs')
    .select('id, action, entity_type, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <Building2 className="h-4 w-4" />
              Organizzazioni
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{tenantCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <Activity className="h-4 w-4" />
              Strutture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{entityCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <Briefcase className="h-4 w-4" />
              Agenzie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{agencyCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <Users className="h-4 w-4" />
              Staff members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{userCount ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ultime organizzazioni</CardTitle>
          </CardHeader>
          <CardContent>
            {(!recentTenants || recentTenants.length === 0) ? (
              <p className="text-sm text-gray-500">Nessuna organizzazione.</p>
            ) : (
              <div className="divide-y">
                {(recentTenants as TenantRow[]).map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.slug} · {t.country?.toUpperCase()}</p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(t.created_at).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ultimi audit logs</CardTitle>
          </CardHeader>
          <CardContent>
            {(!recentLogs || recentLogs.length === 0) ? (
              <p className="text-sm text-gray-500">Nessun log.</p>
            ) : (
              <div className="divide-y">
                {(recentLogs as AuditLogRow[]).map((log) => (
                  <div key={log.id} className="py-2">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{log.action}</span>
                      <span className="text-gray-500"> su {log.entity_type}</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(log.created_at).toLocaleString('it-IT')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
