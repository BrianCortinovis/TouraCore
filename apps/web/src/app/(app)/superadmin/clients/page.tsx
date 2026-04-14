import { createServiceRoleClient } from '@touracore/db/server'
import Link from 'next/link'
import { Badge } from '@touracore/ui'

interface TenantRow {
  id: string
  name: string
  slug: string
  country: string | null
  is_active: boolean | null
  legal_type: string | null
  modules: Record<string, boolean> | null
  created_at: string
  agency_id: string | null
}

export default async function SuperadminClientsPage() {
  const supabase = await createServiceRoleClient()

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, slug, country, is_active, legal_type, modules, created_at, agency_id')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clienti</h1>
        <span className="text-sm text-gray-500">{tenants?.length ?? 0} organizzazioni</span>
      </div>

      {(!tenants || tenants.length === 0) ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">Nessuna organizzazione registrata.</p>
        </div>
      ) : (
        <div className="divide-y rounded-lg border bg-white">
          {(tenants as TenantRow[]).map((t) => {
            const modules = (t.modules as Record<string, boolean>) ?? {}
            return (
              <Link
                key={t.id}
                href={`/${t.slug}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-900">{t.name}</p>
                  <p className="text-sm text-gray-500">
                    {t.slug} · {t.country?.toUpperCase()} · {t.legal_type ?? 'N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {modules.hospitality && <Badge variant="secondary">Hospitality</Badge>}
                  {modules.experiences && <Badge variant="secondary">Experiences</Badge>}
                  <Badge variant={t.is_active ? 'default' : 'secondary'}>
                    {t.is_active ? 'Attivo' : 'Inattivo'}
                  </Badge>
                  {t.agency_id && <Badge variant="outline">Agenzia</Badge>}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
