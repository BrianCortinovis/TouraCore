'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChefHat, Clock, AlertTriangle, Plus } from 'lucide-react'
import { createStation, updateOrderItemStatus } from './actions'

interface Station {
  id: string
  code: string
  name: string
}

interface KDSItem {
  id: string
  order_id: string
  item_name: string
  qty: number
  notes: string | null
  status: 'open' | 'sent' | 'preparing' | 'ready' | 'served'
  course_number: number
  station_code: string | null
  fired_at: string | null
  table_code: string | null
  party_size: number
  allergens: string[]
}

interface Props {
  tenantSlug: string
  entitySlug: string
  restaurantId: string
  restaurantName: string
  stations: Station[]
  activeStationCode: string | null
}

const STATUS_BG: Record<string, string> = {
  sent: 'bg-blue-700 border-blue-400',
  preparing: 'bg-amber-700 border-amber-400',
  ready: 'bg-green-700 border-green-400',
}

export function KDSView({
  tenantSlug,
  entitySlug,
  restaurantId,
  restaurantName,
  stations,
  activeStationCode,
}: Props) {
  const router = useRouter()
  const [items, setItems] = useState<KDSItem[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams({ restaurantId })
    if (activeStationCode) params.set('station', activeStationCode)
    const sseUrl = `/api/restaurant/kds-sse?${params.toString()}`

    // Initial load via REST + SSE per delta updates
    void fetch(`/api/restaurant/kds-stream?${params.toString()}`)
      .then((r) => r.json())
      .then((data: KDSItem[]) => { setItems(data); setLoading(false) })
      .catch(() => setLoading(false))

    const es = new EventSource(sseUrl)
    es.addEventListener('items', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as KDSItem[]
        setItems(data)
      } catch { /* ignore */ }
    })
    es.addEventListener('error', () => {
      // Reconnect handled automatically by EventSource
    })

    return () => { es.close() }
  }, [restaurantId, activeStationCode])

  function handleAddStation() {
    const name = prompt('Nome stazione (Hot, Cold, Grill, Pastry, Bar):')
    if (!name) return
    const code = name.toLowerCase().replace(/\s+/g, '_')
    void createStation({ restaurantId, tenantSlug, entitySlug, code, name }).then(() => {
      router.refresh()
    })
  }

  function handleAdvanceStatus(item: KDSItem) {
    const next = item.status === 'sent' ? 'preparing' : item.status === 'preparing' ? 'ready' : 'served'
    void updateOrderItemStatus({ itemId: item.id, status: next, tenantSlug, entitySlug }).then(() => {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: next as KDSItem['status'] } : i)),
      )
    })
  }

  function elapsedMin(firedAt: string | null): number {
    if (!firedAt) return 0
    return Math.floor((now - new Date(firedAt).getTime()) / 60000)
  }

  return (
    <>
      <header className="flex items-center justify-between border-b border-gray-700 bg-gray-800 p-3">
        <div className="flex items-center gap-3">
          <ChefHat className="h-6 w-6" />
          <div>
            <h1 className="text-sm font-bold uppercase">{restaurantName} KDS</h1>
            <p className="text-[10px] text-gray-400">{items.length} ordini attivi</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`?`)}
            className={`rounded px-3 py-1 text-xs font-medium ${
              !activeStationCode ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            Tutte
          </button>
          {stations.map((s) => (
            <button
              key={s.id}
              onClick={() => router.push(`?station=${s.code}`)}
              className={`rounded px-3 py-1 text-xs font-medium ${
                activeStationCode === s.code ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              {s.name}
            </button>
          ))}
          <button onClick={handleAddStation} className="flex items-center gap-1 rounded border border-dashed border-gray-500 px-3 py-1 text-xs">
            <Plus className="h-3 w-3" /> Stazione
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <p className="text-center text-gray-400">Caricamento…</p>
        ) : items.length === 0 ? (
          <p className="text-center text-2xl text-gray-500">Nessun ordine in coda</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => {
              const elapsed = elapsedMin(item.fired_at)
              const urgent = elapsed >= 15
              return (
                <button
                  key={item.id}
                  onClick={() => handleAdvanceStatus(item)}
                  className={`rounded-lg border-2 p-4 text-left transition ${STATUS_BG[item.status]} ${
                    urgent ? 'animate-pulse ring-4 ring-red-500' : ''
                  } hover:scale-105`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs uppercase opacity-80">
                        T{item.table_code ?? '—'} · {item.party_size}p
                      </p>
                      <p className="mt-1 text-xl font-bold">{item.qty}× {item.item_name}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <Clock className="h-3 w-3" />
                      {elapsed}min
                    </div>
                  </div>
                  {item.notes && <p className="mt-2 text-sm italic">{item.notes}</p>}
                  {item.allergens.length > 0 && (
                    <div className="mt-2 flex items-center gap-1 rounded bg-red-900 px-2 py-1 text-[10px] font-bold uppercase">
                      <AlertTriangle className="h-3 w-3" />
                      {item.allergens.join(', ')}
                    </div>
                  )}
                  <div className="mt-3 border-t border-white/30 pt-2 text-center text-xs uppercase">
                    {item.status === 'sent' && '→ Inizia preparazione'}
                    {item.status === 'preparing' && '→ Pronto'}
                    {item.status === 'ready' && '→ Servito'}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
