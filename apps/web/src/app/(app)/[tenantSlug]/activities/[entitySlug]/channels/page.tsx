import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@touracore/db/server'
import { EXPERIENCE_CHANNEL_REGISTRY } from '@touracore/experiences'

interface Props { params: Promise<{ tenantSlug: string; entitySlug: string }> }

export default async function ChannelsPage({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) notFound()
  const { data: entity } = await supabase.from('entities').select('id').eq('tenant_id', tenant.id).eq('slug', entitySlug).eq('kind', 'activity').single()
  if (!entity) notFound()

  const { data: configs } = await supabase
    .from('experience_channel_configs')
    .select('channel_code, enabled, commission_pct, last_sync_at, last_sync_status')
    .eq('entity_id', entity.id)

  const enabledMap = new Map((configs ?? []).map((c: { channel_code: string; enabled: boolean; commission_pct: number; last_sync_at: string | null; last_sync_status: string | null }) => [c.channel_code, c]))

  const tiers: Array<'S' | 'A' | 'B' | 'C' | 'D'> = ['S', 'A', 'B', 'C', 'D']

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Channel Manager</h1>
        <p className="text-sm text-gray-500 mt-1">12 OTA esperienze. Configura API key + mapping prodotto per canale.</p>
      </div>
      {tiers.map((t) => {
        const channels = EXPERIENCE_CHANNEL_REGISTRY.filter((c) => c.tier === t)
        if (channels.length === 0) return null
        return (
          <div key={t}>
            <p className="text-xs font-bold uppercase text-gray-500 mb-2">Tier {t}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {channels.map((ch) => {
                const cfg = enabledMap.get(ch.code)
                return (
                  <div key={ch.code} className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{ch.label}</p>
                        <p className="text-xs text-gray-500 mt-1">{ch.description}</p>
                      </div>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg?.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {cfg?.enabled ? 'Attivo' : 'Non configurato'}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                      <span>Commission default {ch.commission_default_pct}%</span>
                      {cfg?.last_sync_at && <span>Sync: {new Date(cfg.last_sync_at).toLocaleString('it-IT')}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
      <p className="text-xs text-gray-400 mt-6">Adapter stub per Viator/GetYourGuide/Musement pronti in package. Full OAuth + push inventory in M059 parte 2.</p>
    </div>
  )
}
