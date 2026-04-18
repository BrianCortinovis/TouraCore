import { createServerSupabaseClient } from '@touracore/db/server'
import { notFound } from 'next/navigation'
import { Plug, Plus, CheckCircle2, AlertCircle } from 'lucide-react'
import { Badge } from '@touracore/ui'
import {
  listChannelConnections,
  BIKE_CHANNEL_REGISTRY,
  TIER_LABEL,
  type BikeChannelProviderMeta,
} from '@touracore/bike-rental'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export default async function ChannelsPage({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) notFound()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, name')
    .eq('tenant_id', tenant.id)
    .eq('slug', entitySlug)
    .single()
  if (!entity) notFound()

  const connections = await listChannelConnections({ bikeRentalId: entity.id as string })

  const connectedProviders = new Set(connections.map((c) => c.provider))

  // Group providers by tier per display
  const byTier: Record<string, BikeChannelProviderMeta[]> = {}
  for (const p of Object.values(BIKE_CHANNEL_REGISTRY)) {
    const bucket = byTier[p.tier] ?? []
    bucket.push(p)
    byTier[p.tier] = bucket
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Channel Manager</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sincronizza disponibilità e prenotazioni con Bókun, Rezdy, GetYourGuide, Viator, OCTO, Bikesbooking…
          </p>
        </div>
      </div>

      {/* Active connections */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500">
          Connessioni attive ({connections.length})
        </h2>
        {connections.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <Plug className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-3 text-sm text-gray-600">Nessun channel attivato. Scegli un provider qui sotto.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {connections.map((c) => {
              const meta = BIKE_CHANNEL_REGISTRY[c.provider]
              return (
                <div key={c.id} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900">{meta.label}</p>
                    <Badge variant={c.sync_enabled ? 'default' : 'secondary'}>
                      {c.sync_enabled ? 'Sync ON' : 'Sync OFF'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{TIER_LABEL[meta.tier]} · {meta.scope}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <KeyVal label="Commissione" value={c.commission_rate ? `${c.commission_rate}%` : '—'} />
                    <KeyVal label="Pricing" value={c.pricing_strategy} />
                    <KeyVal
                      label="Ultimo push"
                      value={c.last_availability_push_at ? format(new Date(c.last_availability_push_at), 'dd MMM HH:mm', { locale: it }) : '—'}
                    />
                    <KeyVal
                      label="Ultimo pull"
                      value={c.last_booking_pull_at ? format(new Date(c.last_booking_pull_at), 'dd MMM HH:mm', { locale: it }) : '—'}
                    />
                  </div>
                  {c.last_sync_error && (
                    <div className="mt-2 rounded-md bg-red-50 p-2 text-xs text-red-700">
                      <AlertCircle className="mr-1 inline h-3 w-3" />
                      {c.last_sync_error}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Available providers by tier */}
      {(['hub', 'direct_ota', 'bike_pure', 'standard', 'long_tail'] as const).map((tier) => {
        const providers = byTier[tier] ?? []
        if (providers.length === 0) return null
        return (
          <section key={tier}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500">
              {TIER_LABEL[tier]}
              <span className="text-xs font-normal text-gray-400">({providers.length})</span>
            </h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {providers.map((p) => {
                const isConnected = connectedProviders.has(p.provider)
                return (
                  <div
                    key={p.provider}
                    className="rounded-lg border border-gray-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{p.label}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{p.scope}</p>
                      </div>
                      {isConnected ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Attivo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">
                          Disponibile
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-gray-600">{p.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
                      <span>Commissione {p.commissionRange}</span>
                      <span>·</span>
                      <span>{p.integrationMode}</span>
                    </div>
                    {!isConnected && (
                      <button
                        disabled
                        className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-500"
                      >
                        <Plus className="h-3 w-3" />
                        Connetti (API key required)
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        <p className="font-semibold">Stato integrazione</p>
        <p className="mt-1 text-blue-700">
          Schema DB + registry + adapter interface pronti. BokunAdapter stub pronto per partner API key.
          Rezdy/GYG/Viator/OCTO adapters in sviluppo. Wizard connessione e webhook endpoint in arrivo (M046 Phase 2B).
        </p>
      </div>
    </div>
  )
}

function KeyVal({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-500">{label}</p>
      <p className="font-medium text-gray-900">{value}</p>
    </div>
  )
}
