import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@touracore/db/server'

interface Props { params: Promise<{ tenantSlug: string; entitySlug: string }> }

export default async function SettingsPage({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) notFound()
  const { data: entity } = await supabase.from('entities').select('id, name').eq('tenant_id', tenant.id).eq('slug', entitySlug).eq('kind', 'activity').single()
  if (!entity) notFound()

  const { data: ext } = await supabase
    .from('experience_entities')
    .select('*')
    .eq('id', entity.id)
    .single()

  const e = ext as unknown as { category: string; city: string | null; languages: string[]; age_min_default: number | null; height_min_cm_default: number | null; difficulty_default: string | null; cancellation_policy: Record<string, unknown>; waiver_policy: Record<string, unknown>; pickup_config: Record<string, unknown> }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Impostazioni</h1>
      <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-3 text-sm">
        <div><span className="text-gray-500">Categoria:</span> {e.category}</div>
        <div><span className="text-gray-500">Città:</span> {e.city ?? '—'}</div>
        <div><span className="text-gray-500">Lingue:</span> {e.languages.join(', ').toUpperCase()}</div>
        <div><span className="text-gray-500">Età min:</span> {e.age_min_default ?? '—'}</div>
        <div><span className="text-gray-500">Altezza min:</span> {e.height_min_cm_default ? `${e.height_min_cm_default}cm` : '—'}</div>
        <div><span className="text-gray-500">Difficoltà default:</span> {e.difficulty_default ?? '—'}</div>
      </div>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 text-xs">
        <p className="font-semibold text-gray-700 mb-2">Cancellation policy</p>
        <pre className="overflow-x-auto">{JSON.stringify(e.cancellation_policy, null, 2)}</pre>
      </div>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 text-xs">
        <p className="font-semibold text-gray-700 mb-2">Pickup config</p>
        <pre className="overflow-x-auto">{JSON.stringify(e.pickup_config, null, 2)}</pre>
      </div>
      <p className="text-xs text-gray-400">Editor full in fase successiva. Per ora modifica via DB/SQL.</p>
    </div>
  )
}
