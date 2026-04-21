'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button, Card, CardContent } from '@touracore/ui'
import { useAuthStore } from '@touracore/auth/store'
import { listSuppliesAction, recordSupplyMovementAction } from '../competitive-actions'

interface Supply {
  id: string
  name: string
  sku: string | null
  category: string | null
  unit: string
  quantity: number
  low_stock_threshold: number
  cost_per_unit: number | null
  last_restocked_at: string | null
}

const MOVEMENT_TYPES: Array<{ value: 'restock' | 'consumption' | 'adjustment' | 'waste'; label: string }> = [
  { value: 'restock', label: 'Riordino (+)' },
  { value: 'consumption', label: 'Consumo (-)' },
  { value: 'adjustment', label: 'Aggiustamento' },
  { value: 'waste', label: 'Scarto (-)' },
]

export default function SuppliesPage() {
  const propertyId = useAuthStore((s) => s.property?.id)
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [loading, setLoading] = useState(true)
  const [moveSupply, setMoveSupply] = useState<Supply | null>(null)
  const [moveType, setMoveType] = useState<'restock' | 'consumption' | 'adjustment' | 'waste'>('restock')
  const [moveQty, setMoveQty] = useState<number | ''>('')
  const [moveReason, setMoveReason] = useState('')

  const load = useCallback(async () => {
    if (!propertyId) return
    setLoading(true)
    const data = (await listSuppliesAction(propertyId)) as Supply[]
    setSupplies(data)
    setLoading(false)
  }, [propertyId])

  useEffect(() => { void load() }, [load])

  const handleMove = async () => {
    if (!moveSupply || typeof moveQty !== 'number' || moveQty <= 0) return
    const result = await recordSupplyMovementAction({
      supplyId: moveSupply.id,
      movementType: moveType,
      quantity: moveQty,
      reason: moveReason || undefined,
    })
    if (result.success) {
      setMoveSupply(null)
      setMoveQty('')
      setMoveReason('')
      void load()
    } else {
      alert(`Errore: ${result.error}`)
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Inventory Pulizie</h1>
        <p className="text-sm text-gray-500">Stock detergenti, asciugamani, consumabili</p>
      </header>

      {loading ? (
        <p className="text-sm text-gray-500">Caricamento...</p>
      ) : supplies.length === 0 ? (
        <p className="text-sm text-gray-500">Nessun supply. Inserisci righe direttamente in tabella `supplies` da DB.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Categoria</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Soglia min</th>
                <th className="px-3 py-2">Ultimo riordino</th>
                <th className="px-3 py-2 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {supplies.map((s) => {
                const lowStock = Number(s.quantity) <= Number(s.low_stock_threshold)
                return (
                  <tr key={s.id}>
                    <td className="px-3 py-2 font-medium">{s.name}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-500">{s.sku ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{s.category ?? '—'}</td>
                    <td className={`px-3 py-2 text-right font-mono ${lowStock ? 'text-red-600 font-bold' : ''}`}>
                      {Number(s.quantity).toFixed(2)} {s.unit}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-gray-400">
                      {Number(s.low_stock_threshold).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {s.last_restocked_at ? new Date(s.last_restocked_at).toLocaleDateString('it-IT') : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => setMoveSupply(s)}>
                        Movimento
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {moveSupply && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <h3 className="font-semibold">Registra movimento — {moveSupply.name}</h3>
            <div>
              <label className="block text-xs font-medium text-gray-600">Tipo</label>
              <select
                value={moveType}
                onChange={(e) => setMoveType(e.target.value as typeof moveType)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
              >
                {MOVEMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Quantità ({moveSupply.unit})</label>
              <input
                type="number"
                step="0.01"
                value={moveQty}
                onChange={(e) => setMoveQty(e.target.value ? Number(e.target.value) : '')}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Motivo (opzionale)</label>
              <input
                value={moveReason}
                onChange={(e) => setMoveReason(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleMove}>Salva</Button>
              <Button variant="outline" onClick={() => setMoveSupply(null)}>Annulla</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
