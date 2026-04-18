import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@touracore/db/server'

interface Props { params: Promise<{ tenantSlug: string; entitySlug: string }> }

export default async function WaiversPage({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) notFound()
  const { data: entity } = await supabase.from('entities').select('id').eq('tenant_id', tenant.id).eq('slug', entitySlug).eq('kind', 'activity').single()
  if (!entity) notFound()

  const { data: waivers } = await supabase
    .from('experience_waivers')
    .select('id, title, version, language, active, requires_parent_for_minor, created_at')
    .eq('entity_id', entity.id)
    .order('created_at', { ascending: false })

  const { count: signedCount } = await supabase
    .from('experience_reservation_guests')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenant.id as string)
    .not('waiver_signed_at', 'is', null)

  const rows = (waivers ?? []) as Array<{ id: string; title: string; version: number; language: string; active: boolean; requires_parent_for_minor: boolean; created_at: string }>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Waiver digitali</h1>
          <p className="text-sm text-gray-500 mt-1">{signedCount ?? 0} firme totali</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-12 text-center text-sm text-gray-500">Nessun template waiver.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rows.map((w) => (
            <div key={w.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-gray-900">{w.title}</p>
                <span className="text-[11px] text-gray-500">v{w.version} · {w.language.toUpperCase()}</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-500">
                <span className={w.active ? 'text-green-600' : 'text-gray-400'}>{w.active ? 'Attivo' : 'Inattivo'}</span>
                {w.requires_parent_for_minor && <span>· Parent sign</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
