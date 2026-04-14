import { createServiceRoleClient } from '@touracore/db/server'
import { Card, CardContent, CardHeader, CardTitle } from '@touracore/ui'

interface PlatformAdminRow {
  id: string
  user_id: string
  role: string
  created_at: string
}

export default async function SuperadminSystemPage() {
  const supabase = await createServiceRoleClient()

  const { count: adminCount } = await supabase
    .from('platform_admins')
    .select('id', { count: 'exact', head: true })

  const { data: admins } = await supabase
    .from('platform_admins')
    .select('id, user_id, role, created_at')
    .order('created_at', { ascending: true })

  const { count: auditCount } = await supabase
    .from('audit_logs')
    .select('id', { count: 'exact', head: true })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Sistema</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Platform admins</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{adminCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Audit log entries</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{auditCount ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Amministratori piattaforma</CardTitle>
        </CardHeader>
        <CardContent>
          {(!admins || admins.length === 0) ? (
            <p className="text-sm text-gray-500">Nessun admin configurato.</p>
          ) : (
            <div className="divide-y">
              {(admins as PlatformAdminRow[]).map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-mono text-gray-700">{a.user_id}</p>
                    <p className="text-xs text-gray-400">
                      {a.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(a.created_at).toLocaleDateString('it-IT')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informazioni sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>Ambiente: <span className="font-mono">{process.env.NODE_ENV}</span></p>
          <p>Supabase URL: <span className="font-mono">{process.env.NEXT_PUBLIC_SUPABASE_URL}</span></p>
        </CardContent>
      </Card>
    </div>
  )
}
