import { createServiceRoleClient } from '@touracore/db/server'
import { Badge } from '@touracore/ui'

interface AgencyRow {
  id: string
  name: string
  slug: string | null
  vat_number: string | null
  is_active: boolean | null
  created_at: string
}

interface LinkRow {
  agency_id: string
}

export default async function SuperadminAgenciesPage() {
  const supabase = await createServiceRoleClient()

  const { data: agencies } = await supabase
    .from('agencies')
    .select('id, name, slug, vat_number, is_active, created_at')
    .order('created_at', { ascending: false })

  const agencyRows = (agencies ?? []) as AgencyRow[]
  const agencyIds = agencyRows.map((a) => a.id)

  const { data: linkCounts } = agencyIds.length > 0
    ? await supabase
        .from('agency_tenant_links')
        .select('agency_id')
        .in('agency_id', agencyIds)
        .eq('status', 'active')
    : { data: [] }

  const countMap = new Map<string, number>()
  for (const link of (linkCounts ?? []) as LinkRow[]) {
    countMap.set(link.agency_id, (countMap.get(link.agency_id) ?? 0) + 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Agenzie</h1>
        <span className="text-sm text-gray-500">{agencyRows.length} agenzie</span>
      </div>

      {agencyRows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">Nessuna agenzia registrata.</p>
        </div>
      ) : (
        <div className="divide-y rounded-lg border bg-white">
          {agencyRows.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-gray-900">{a.name}</p>
                <p className="text-sm text-gray-500">
                  {a.slug ?? 'no-slug'} · P.IVA: {a.vat_number ?? 'N/A'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  {countMap.get(a.id) ?? 0} clienti
                </span>
                <Badge variant={a.is_active ? 'default' : 'secondary'}>
                  {a.is_active ? 'Attiva' : 'Inattiva'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
