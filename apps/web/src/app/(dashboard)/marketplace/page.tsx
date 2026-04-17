'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button, Badge } from '@touracore/ui'
import { useAuthStore } from '@touracore/auth/store'
import { listMarketplaceAppsAction, listInstalledAppsAction, uninstallAppAction } from '../competitive-actions'

interface App {
  id: string
  slug: string
  name: string
  description: string | null
  pricing_model: string | null
  pricing_amount: number | null
  pricing_currency: string | null
  icon_url: string | null
  is_verified: boolean
}
interface Installation {
  id: string
  app_id: string
  granted_scopes: string[]
  created_at: string
  marketplace_apps: { name: string; slug: string; icon_url: string | null } | { name: string; slug: string; icon_url: string | null }[] | null
}

function pickFirst<T>(v: T | T[] | null): T | null {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

export default function MarketplacePage() {
  const { tenant } = useAuthStore()
  const [apps, setApps] = useState<App[]>([])
  const [installed, setInstalled] = useState<Installation[]>([])

  const load = useCallback(async () => {
    if (!tenant) return
    const [a, i] = await Promise.all([
      listMarketplaceAppsAction(),
      listInstalledAppsAction(tenant.id),
    ])
    setApps(a as App[])
    setInstalled(i as unknown as Installation[])
  }, [tenant])

  useEffect(() => { load() }, [load])

  async function handleUninstall(id: string) {
    if (!confirm('Disinstallare app?')) return
    await uninstallAppAction(id)
    await load()
  }

  if (!tenant) return <div className="py-20 text-center text-gray-500">Caricamento...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Marketplace app</h1>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">App installate ({installed.length})</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {installed.map((inst) => {
            const app = pickFirst(inst.marketplace_apps)
            return (
              <div key={inst.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{app?.name ?? 'App'}</span>
                  <Button size="sm" variant="ghost" onClick={() => handleUninstall(inst.id)} className="text-red-600">Disinstalla</Button>
                </div>
                <div className="mt-1 text-xs text-gray-500">Scope: {inst.granted_scopes.join(', ')}</div>
              </div>
            )
          })}
          {installed.length === 0 && <div className="col-span-full text-sm text-gray-500">Nessuna app installata.</div>}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">App disponibili ({apps.length})</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {apps.map((a) => (
            <div key={a.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{a.name}</h3>
                {a.is_verified && <Badge variant="success">Verificata</Badge>}
              </div>
              {a.description && <p className="mt-2 text-sm text-gray-600">{a.description}</p>}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm font-medium">
                  {a.pricing_model === 'free'
                    ? 'Gratis'
                    : a.pricing_amount
                      ? `${a.pricing_currency ?? 'EUR'} ${a.pricing_amount}${a.pricing_model === 'subscription' ? '/mese' : ''}`
                      : 'Prezzo custom'}
                </span>
                <Button size="sm">Installa</Button>
              </div>
            </div>
          ))}
          {apps.length === 0 && <div className="col-span-full text-sm text-gray-500">Nessuna app nel marketplace.</div>}
        </div>
      </div>
    </div>
  )
}
