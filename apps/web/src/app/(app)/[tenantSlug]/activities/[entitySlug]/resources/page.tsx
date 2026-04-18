import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@touracore/db/server'
import { RESOURCE_TYPES } from '@touracore/experiences'

interface Props { params: Promise<{ tenantSlug: string; entitySlug: string }> }

export default async function ResourcesPage({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) notFound()
  const { data: entity } = await supabase.from('entities').select('id').eq('tenant_id', tenant.id).eq('slug', entitySlug).eq('kind', 'activity').single()
  if (!entity) notFound()

  const { data: resources } = await supabase
    .from('experience_resources')
    .select('*')
    .eq('entity_id', entity.id)
    .order('kind, name')

  const rows = (resources ?? []) as Array<{ id: string; kind: string; name: string; capacity: number; skills: string[]; languages: string[]; active: boolean }>
  const byKind = new Map(RESOURCE_TYPES.map((k) => [k, rows.filter((r) => r.kind === k)]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Risorse</h1>
        <p className="text-sm text-gray-500 mt-1">Guide, mezzi, attrezzatura. Assegna a prodotti per conflict detection.</p>
      </div>
      {RESOURCE_TYPES.map((k) => {
        const items = byKind.get(k) ?? []
        return (
          <div key={k}>
            <p className="text-xs font-bold uppercase text-gray-500 mb-2">{k}</p>
            {items.length === 0 ? (
              <p className="rounded-md border border-dashed border-gray-200 p-4 text-xs text-gray-500">Nessuna risorsa {k}.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {items.map((r) => (
                  <div key={r.id} className="rounded-md border border-gray-200 bg-white p-3">
                    <p className="font-medium text-gray-900 text-sm">{r.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">cap {r.capacity} · {r.active ? '✅' : '⏸'}</p>
                    {r.languages?.length > 0 && <p className="text-[10px] text-gray-400 mt-1">{r.languages.join('·')}</p>}
                    {r.skills?.length > 0 && <p className="text-[10px] text-gray-400">{r.skills.join(', ')}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
