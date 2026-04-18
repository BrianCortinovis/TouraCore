import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@touracore/db/server'
import { BOOKING_MODES } from '@touracore/experiences'
import { Plus, Edit3 } from 'lucide-react'

interface Props { params: Promise<{ tenantSlug: string; entitySlug: string }> }

export default async function CatalogPage({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) notFound()
  const { data: entity } = await supabase.from('entities').select('id').eq('tenant_id', tenant.id).eq('slug', entitySlug).eq('kind', 'activity').single()
  if (!entity) notFound()

  const { data: products } = await supabase
    .from('experience_products')
    .select('id, slug, name, booking_mode, duration_minutes, capacity_default, price_base_cents, status, age_min, height_min_cm, difficulty, waiver_required')
    .eq('entity_id', entity.id)
    .order('name')

  const rows = (products ?? []) as Array<{ id: string; slug: string; name: string; booking_mode: string; duration_minutes: number; capacity_default: number | null; price_base_cents: number; status: string; age_min: number | null; height_min_cm: number | null; difficulty: string | null; waiver_required: boolean }>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catalogo prodotti</h1>
          <p className="text-sm text-gray-500 mt-1">Gestisci prodotti, varianti, addon, custom fields.</p>
        </div>
        <Link href={`/${tenantSlug}/activities/${entitySlug}/catalog/new`} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Nuovo prodotto
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">Nessun prodotto. Crea il primo.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Nome</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Mode</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Durata</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Capacity</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Prezzo</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Constraint</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((p) => {
                const mode = BOOKING_MODES[p.booking_mode as keyof typeof BOOKING_MODES]
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{mode?.label}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{p.duration_minutes}min</td>
                    <td className="px-4 py-3 text-right text-gray-600">{p.capacity_default ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">€{(p.price_base_cents / 100).toFixed(2)}</td>
                    <td className="px-4 py-3 text-[11px] text-gray-500">
                      {p.age_min && <span className="mr-1">{p.age_min}+</span>}
                      {p.height_min_cm && <span className="mr-1">≥{p.height_min_cm}cm</span>}
                      {p.waiver_required && <span className="text-amber-600">Waiver</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/${tenantSlug}/activities/${entitySlug}/catalog/${p.slug}`} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                        <Edit3 className="h-3.5 w-3.5" /> Modifica
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
