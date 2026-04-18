import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@touracore/db/server'
import { BOOKING_MODES, CATEGORY_META, DIFFICULTY_META } from '@touracore/experiences'
import { Package, CalendarClock, Users, Globe } from 'lucide-react'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export default async function ExperienceDashboard({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) notFound()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, name, description, experience_entities(category, city, address, languages, difficulty_default, age_min_default, height_min_cm_default)')
    .eq('tenant_id', tenant.id)
    .eq('slug', entitySlug)
    .single()
  if (!entity) notFound()

  const extArr = (entity as unknown as { experience_entities: Array<{
    category: string
    city: string | null
    address: string | null
    languages: string[]
    difficulty_default: string | null
    age_min_default: number | null
    height_min_cm_default: number | null
  }> }).experience_entities
  const ext = extArr?.[0] ?? null

  const { data: products } = await supabase
    .from('experience_products')
    .select('id, slug, name, booking_mode, duration_minutes, capacity_default, price_base_cents, currency, status')
    .eq('entity_id', entity.id)
    .order('name')

  const rows = (products ?? []) as Array<{
    id: string; slug: string; name: string; booking_mode: string
    duration_minutes: number; capacity_default: number | null
    price_base_cents: number; currency: string; status: string
  }>

  const productIds = rows.map((p) => p.id)
  const { count: openSlots } = productIds.length > 0
    ? await supabase.from('experience_timeslots').select('id', { count: 'exact', head: true }).in('product_id', productIds).eq('status', 'open')
    : { count: 0 }

  const catMeta = ext?.category ? CATEGORY_META[ext.category as keyof typeof CATEGORY_META] : null
  const diffMeta = ext?.difficulty_default ? DIFFICULTY_META[ext.difficulty_default as keyof typeof DIFFICULTY_META] : null

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          {catMeta && <span className="text-2xl">{catMeta.icon}</span>}
          <h1 className="text-2xl font-bold text-gray-900">{entity.name}</h1>
        </div>
        <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
          {catMeta && <span>{catMeta.label}</span>}
          {ext?.city && <span>📍 {ext.city}</span>}
          {ext?.languages && ext.languages.length > 0 && (
            <span className="inline-flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{ext.languages.join(' · ').toUpperCase()}</span>
          )}
          {diffMeta && <span className={`text-${diffMeta.color}-600`}>Difficoltà: {diffMeta.label}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-blue-50 p-2"><Package className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Prodotti</p>
              <p className="text-2xl font-bold text-gray-900">{rows.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-purple-50 p-2"><CalendarClock className="h-5 w-5 text-purple-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Slot aperti</p>
              <p className="text-2xl font-bold text-gray-900">{openSlots ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-green-50 p-2"><Users className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Età min / Altezza min</p>
              <p className="text-lg font-bold text-gray-900">
                {ext?.age_min_default ?? '—'}+ / {ext?.height_min_cm_default ? `${ext.height_min_cm_default}cm` : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Prodotti</h2>
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <p className="text-sm text-gray-500">Nessun prodotto. Crea uno dal catalogo (milestone M052).</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Nome</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Booking mode</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Durata</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Capacity</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Prezzo base</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.map((p) => {
                  const mode = BOOKING_MODES[p.booking_mode as keyof typeof BOOKING_MODES]
                  return (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-4 py-3 text-gray-600">{mode?.label ?? p.booking_mode}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{p.duration_minutes}min</td>
                      <td className="px-4 py-3 text-right text-gray-600">{p.capacity_default ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-900 font-medium">
                        €{(p.price_base_cents / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          p.status === 'active' ? 'bg-green-100 text-green-700' :
                          p.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                          'bg-gray-100 text-gray-500'
                        }`}>{p.status}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
