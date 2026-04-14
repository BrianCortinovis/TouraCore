'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button, Input, Card, CardContent, DataTable, Badge } from '@touracore/ui'
import {
  getAdminStatsAction,
  listTenantsAction,
  listPropertiesAdminAction,
  listPortalsAdminAction,
  togglePropertyActiveAction,
} from './actions'

type Tab = 'dashboard' | 'tenants' | 'properties' | 'portals'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [stats, setStats] = useState({ tenants: 0, properties: 0, portals: 0, activeReservations: 0 })
  const [tenants, setTenants] = useState<Record<string, unknown>[]>([])
  const [tenantsCount, setTenantsCount] = useState(0)
  const [properties, setProperties] = useState<Record<string, unknown>[]>([])
  const [propertiesCount, setPropertiesCount] = useState(0)
  const [portals, setPortals] = useState<Record<string, unknown>[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const loadStats = useCallback(async () => {
    const s = await getAdminStatsAction()
    setStats(s)
  }, [])

  const loadTenants = useCallback(async () => {
    setLoading(true)
    const res = await listTenantsAction(page, search || undefined)
    setTenants(res.data)
    setTenantsCount(res.count)
    setLoading(false)
  }, [page, search])

  const loadProperties = useCallback(async () => {
    setLoading(true)
    const res = await listPropertiesAdminAction(page, search || undefined)
    setProperties(res.data)
    setPropertiesCount(res.count)
    setLoading(false)
  }, [page, search])

  const loadPortals = useCallback(async () => {
    setLoading(true)
    const data = await listPortalsAdminAction()
    setPortals(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    if (tab === 'tenants') loadTenants()
    else if (tab === 'properties') loadProperties()
    else if (tab === 'portals') loadPortals()
    else setLoading(false)
  }, [tab, loadTenants, loadProperties, loadPortals])

  async function handleToggleProperty(id: string, isActive: boolean) {
    await togglePropertyActiveAction(id, !isActive)
    loadProperties()
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'tenants', label: 'Attività' },
    { key: 'properties', label: 'Strutture' },
    { key: 'portals', label: 'Portali' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Pannello Admin</h1>

      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setPage(1); setSearch('') }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Attività', value: stats.tenants },
            { label: 'Strutture', value: stats.properties },
            { label: 'Portali', value: stats.portals },
            { label: 'Prenotazioni attive', value: stats.activeReservations },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent>
                <div className="pt-4">
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === 'tenants' && (
        <div className="space-y-4">
          <Input
            placeholder="Cerca attività..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
          <DataTable
            columns={[
              { key: 'name', header: 'Nome' },
              { key: 'id', header: 'ID', hideOnMobile: true, render: (t) => (
                <span className="font-mono text-xs text-gray-400">{String((t as Record<string, unknown>).id).slice(0, 8)}</span>
              )},
              { key: 'created_at', header: 'Creato', hideOnMobile: true, render: (t) => {
                const d = (t as Record<string, unknown>).created_at as string
                return d ? new Date(d).toLocaleDateString('it-IT') : '—'
              }},
            ]}
            data={tenants}
            keyExtractor={(t) => (t as Record<string, unknown>).id as string}
            isLoading={loading}
            emptyMessage="Nessuna attività trovata"
            pagination={{
              page,
              pageSize: 20,
              total: tenantsCount,
              onPageChange: setPage,
            }}
          />
        </div>
      )}

      {tab === 'properties' && (
        <div className="space-y-4">
          <Input
            placeholder="Cerca struttura..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
          <DataTable
            columns={[
              { key: 'name', header: 'Nome' },
              { key: 'type', header: 'Tipo', hideOnMobile: true },
              { key: 'city', header: 'Città', hideOnMobile: true },
              { key: 'is_active', header: 'Stato', render: (p) => (
                <Badge variant={(p as Record<string, unknown>).is_active ? 'success' : 'secondary'}>
                  {(p as Record<string, unknown>).is_active ? 'Attiva' : 'Inattiva'}
                </Badge>
              )},
              { key: 'actions', header: '', render: (p) => (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleToggleProperty(
                      (p as Record<string, unknown>).id as string,
                      (p as Record<string, unknown>).is_active as boolean
                    )
                  }}
                >
                  {(p as Record<string, unknown>).is_active ? 'Disattiva' : 'Attiva'}
                </Button>
              )},
            ]}
            data={properties}
            keyExtractor={(p) => (p as Record<string, unknown>).id as string}
            isLoading={loading}
            emptyMessage="Nessuna struttura trovata"
            pagination={{
              page,
              pageSize: 20,
              total: propertiesCount,
              onPageChange: setPage,
            }}
          />
        </div>
      )}

      {tab === 'portals' && (
        <div className="space-y-4">
          <DataTable
            columns={[
              { key: 'name', header: 'Nome' },
              { key: 'slug', header: 'Indirizzo', hideOnMobile: true },
              { key: 'status', header: 'Stato', render: (p) => (
                <Badge variant={(p as Record<string, unknown>).status === 'active' ? 'success' : 'secondary'}>
                  {String((p as Record<string, unknown>).status)}
                </Badge>
              )},
              { key: 'created_at', header: 'Creato', hideOnMobile: true, render: (p) => {
                const d = (p as Record<string, unknown>).created_at as string
                return d ? new Date(d).toLocaleDateString('it-IT') : '—'
              }},
            ]}
            data={portals}
            keyExtractor={(p) => (p as Record<string, unknown>).id as string}
            isLoading={loading}
            emptyMessage="Nessun portale trovato"
          />
        </div>
      )}
    </div>
  )
}
