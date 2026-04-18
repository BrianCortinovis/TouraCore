import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@touracore/db/server'
import { GenerateSlotsForm } from './generate-form'

interface Props { params: Promise<{ tenantSlug: string; entitySlug: string }> }

export default async function SchedulePage({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) notFound()
  const { data: entity } = await supabase.from('entities').select('id').eq('tenant_id', tenant.id).eq('slug', entitySlug).eq('kind', 'activity').single()
  if (!entity) notFound()

  const { data: products } = await supabase
    .from('experience_products')
    .select('id, name, duration_minutes, status, experience_schedules(id, name, active, last_generated_at, valid_from, valid_to)')
    .eq('entity_id', entity.id)
    .order('name')

  const rows = (products ?? []) as Array<{ id: string; name: string; duration_minutes: number; status: string; experience_schedules: Array<{ id: string; name: string; active: boolean; last_generated_at: string | null; valid_from: string; valid_to: string | null }> }>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
        <p className="text-sm text-gray-500 mt-1">Genera slot da schedule weekly. Exceptions e blackouts in JSON.</p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">Nessun prodotto. Crea prima i prodotti nel catalogo.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((p) => (
            <div key={p.id} className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.duration_minutes}min · {p.experience_schedules?.length ?? 0} schedule</p>
                </div>
              </div>
              {p.experience_schedules?.map((s) => (
                <div key={s.id} className="rounded-md border border-gray-200 bg-gray-50 p-3 mb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-gray-500">
                        {s.active ? '✅ Attivo' : '⏸ Inattivo'} · Valido dal {s.valid_from}
                        {s.valid_to && ` al ${s.valid_to}`}
                        {s.last_generated_at && ` · Ultima gen: ${new Date(s.last_generated_at).toLocaleString('it-IT')}`}
                      </p>
                    </div>
                    <GenerateSlotsForm scheduleId={s.id} productId={p.id} tenantId={tenant.id as string} durationMinutes={p.duration_minutes} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
