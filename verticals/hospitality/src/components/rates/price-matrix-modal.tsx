'use client'
import { Badge, Button, Modal } from '@touracore/ui'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { StayDiscountEditor, WeekdaySelector } from './stay-rule-fields'
import { setRatePrice, syncRatesToOctorate } from '../../actions/rates'
import { stayDiscountsToJson, validateAllowedWeekdays, validateStayDiscounts, type StayDiscountRule } from '../../lib/rates/stay-rules'
import { Loader2, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react'
import type { RatePlan, Season, RoomType, RatePrice } from '../../types/database'

interface PriceMatrixModalProps {
  isOpen: boolean
  onClose: () => void
  ratePlan: RatePlan
  roomTypes: RoomType[]
  seasons: Season[]
  ratePrices: RatePrice[]
  octorateConfigured: boolean
}

interface CellData {
  price_per_night: number
  price_single_use: number | null
  extra_adult: number
  extra_child: number
  min_stay: number
  max_stay: number | null
  closed_to_arrival: boolean
  closed_to_departure: boolean
  stop_sell: boolean
  allowed_arrival_days: number[]
  allowed_departure_days: number[]
  stay_discounts: StayDiscountRule[]
}

function cellKey(roomTypeId: string, seasonId: string) {
  return `${roomTypeId}_${seasonId}`
}

export function PriceMatrixModal({
  isOpen,
  onClose,
  ratePlan,
  roomTypes,
  seasons,
  ratePrices,
  octorateConfigured,
}: PriceMatrixModalProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [expandedCell, setExpandedCell] = useState<string | null>(null)

  // Price data keyed by "roomTypeId_seasonId"
  const [cells, setCells] = useState<Record<string, CellData>>({})
  const [dirtyCells, setDirtyCells] = useState<Set<string>>(new Set())

  // Initialize cells from existing ratePrices
  const initCells = useCallback(() => {
    const initial: Record<string, CellData> = {}
    for (const rt of roomTypes) {
      for (const s of seasons) {
        const existing = ratePrices.find(
          (rp) =>
            rp.rate_plan_id === ratePlan.id &&
            rp.room_type_id === rt.id &&
            rp.date_from === s.date_from &&
            rp.date_to === s.date_to
        )
        const key = cellKey(rt.id, s.id)
        if (existing) {
          initial[key] = {
            price_per_night: existing.price_per_night,
            price_single_use: existing.price_single_use,
            extra_adult: existing.extra_adult,
            extra_child: existing.extra_child,
            min_stay: existing.min_stay,
            max_stay: existing.max_stay,
            closed_to_arrival: existing.closed_to_arrival,
            closed_to_departure: existing.closed_to_departure,
            stop_sell: existing.stop_sell,
            allowed_arrival_days: existing.allowed_arrival_days ?? [],
            allowed_departure_days: existing.allowed_departure_days ?? [],
            stay_discounts: existing.stay_discounts ?? [],
          }
        } else {
          initial[key] = {
            price_per_night: 0,
            price_single_use: null,
            extra_adult: 0,
            extra_child: 0,
            min_stay: s.min_stay ?? 1,
            max_stay: s.max_stay ?? null,
            closed_to_arrival: false,
            closed_to_departure: false,
            stop_sell: false,
            allowed_arrival_days: s.allowed_arrival_days ?? [],
            allowed_departure_days: s.allowed_departure_days ?? [],
            stay_discounts: s.stay_discounts ?? [],
          }
        }
      }
    }
    setCells(initial)
    setDirtyCells(new Set())
    setError(null)
    setSyncMessage(null)
  }, [ratePlan.id, roomTypes, seasons, ratePrices])

  useEffect(() => {
    if (isOpen) {
      initCells()
    }
  }, [isOpen, initCells])

  const updateCell = (
    key: string,
    field: keyof CellData,
    value: number | boolean | number[] | StayDiscountRule[] | null
  ) => {
    setCells((prev) => {
      const existing = prev[key]
      if (!existing) return prev
      return {
        ...prev,
        [key]: { ...existing, [field]: value },
      }
    })
    setDirtyCells((prev) => new Set(prev).add(key))
  }

  const handleSave = async () => {
    const dirty = Array.from(dirtyCells)
    if (dirty.length === 0) {
      onClose()
      return
    }

    setSaving(true)
    setError(null)
    setSyncMessage(null)

    try {
      // Save all dirty cells
      for (const key of dirty) {
        const parts = key.split('_')
        const roomTypeId = parts[0]!
        const seasonId = parts[1]!
        const cell = cells[key]
        if (!cell || cell.price_per_night <= 0) continue
        if (cell.max_stay != null && cell.max_stay < cell.min_stay) {
          throw new Error('Il soggiorno massimo deve essere uguale o superiore al minimo')
        }
        validateAllowedWeekdays(cell.allowed_arrival_days, 'Giorni di arrivo')
        validateAllowedWeekdays(cell.allowed_departure_days, 'Giorni di partenza')
        validateStayDiscounts(cell.stay_discounts)

        await setRatePrice(ratePlan.id, roomTypeId, seasonId, {
          price_per_night: cell.price_per_night,
          price_single_use: cell.price_single_use,
          extra_adult: cell.extra_adult,
          extra_child: cell.extra_child,
          min_stay: cell.min_stay,
          max_stay: cell.max_stay,
          closed_to_arrival: cell.closed_to_arrival,
          closed_to_departure: cell.closed_to_departure,
          stop_sell: cell.stop_sell,
          allowed_arrival_days: cell.allowed_arrival_days,
          allowed_departure_days: cell.allowed_departure_days,
          stay_discounts: stayDiscountsToJson(cell.stay_discounts),
        }, { skipChannelSync: true })
      }

      if (octorateConfigured) {
        setSyncing(true)
        const result = await syncRatesToOctorate(ratePlan.id)
        setSyncMessage(result.message)
        setSyncing(false)
        if (!result.success) {
          return
        }
      }

      setDirtyCells(new Set())
      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  const handleSyncOnly = async () => {
    setSyncing(true)
    setSyncMessage(null)
    try {
      const result = await syncRatesToOctorate(ratePlan.id)
      setSyncMessage(result.message)
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : 'Errore sync')
    } finally {
      setSyncing(false)
    }
  }

  if (seasons.length === 0) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={`Prezzi: ${ratePlan.name}`} size="md">
        <div className="py-8 text-center">
          <p className="text-gray-500">Crea prima una stagione per poter impostare i prezzi.</p>
          <Button variant="outline" onClick={onClose} className="mt-4">Chiudi</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Prezzi: ${ratePlan.name}`} size="full">
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}
        {syncMessage && (
          <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">{syncMessage}</div>
        )}
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Inserimento diretto prezzo unità: questa matrice imposta il prezzo finale per camera e stagione.
          Per variazioni a percentuale usa le stagioni o le regole revenue.
        </div>

        {/* Price grid */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 border-b border-r bg-white px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Tipo Camera
                </th>
                {seasons.map((s) => (
                  <th
                    key={s.id}
                    className="border-b px-3 py-2 text-center text-xs font-medium uppercase text-gray-500"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </div>
                    <div className="text-[10px] font-normal text-gray-400">
                      x{s.price_modifier}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roomTypes.map((rt) => (
                <tr key={rt.id} className="border-b last:border-b-0">
                  <td className="sticky left-0 z-10 border-r bg-white px-3 py-3 text-sm font-medium text-gray-900">
                    {rt.name}
                    <span className="ml-1 text-xs text-gray-400">{rt.code}</span>
                  </td>
                  {seasons.map((s) => {
                    const key = cellKey(rt.id, s.id)
                    const cell = cells[key]
                    if (!cell) return <td key={s.id} />
                    const isDirty = dirtyCells.has(key)
                    const isExpanded = expandedCell === key

                    return (
                      <td key={s.id} className="px-2 py-2">
                        <div className={`rounded-lg border p-2 ${isDirty ? 'border-blue-400 bg-blue-50' : 'border-gray-200'} ${cell.stop_sell ? 'bg-red-50' : ''}`}>
                          {/* Main price */}
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={cell.price_per_night || ''}
                              onChange={(e) => updateCell(key, 'price_per_night', parseFloat(e.target.value) || 0)}
                              className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-sm font-bold focus:border-blue-500 focus:outline-none"
                              placeholder="0"
                            />
                            <span className="text-xs text-gray-400">Prezzo unità</span>
                          </div>

                          {/* Expand toggle */}
                          <button
                            type="button"
                            onClick={() => setExpandedCell(isExpanded ? null : key)}
                            className="mt-1 flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600"
                          >
                            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            Dettagli
                          </button>

                          {/* Expanded details */}
                          {isExpanded && (
                            <div className="mt-2 space-y-2 border-t pt-2">
                              <div className="flex items-center gap-1">
                                <label className="w-20 text-[10px] text-gray-500">Singola</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={cell.price_single_use ?? ''}
                                  onChange={(e) => updateCell(key, 'price_single_use', e.target.value ? parseFloat(e.target.value) : null)}
                                  className="w-16 rounded border border-gray-300 px-1 py-0.5 text-right text-xs focus:border-blue-500 focus:outline-none"
                                  placeholder="--"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <label className="w-20 text-[10px] text-gray-500">Extra adulto</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={cell.extra_adult || ''}
                                  onChange={(e) => updateCell(key, 'extra_adult', parseFloat(e.target.value) || 0)}
                                  className="w-16 rounded border border-gray-300 px-1 py-0.5 text-right text-xs focus:border-blue-500 focus:outline-none"
                                  placeholder="0"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <label className="w-20 text-[10px] text-gray-500">Extra bambino</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={cell.extra_child || ''}
                                  onChange={(e) => updateCell(key, 'extra_child', parseFloat(e.target.value) || 0)}
                                  className="w-16 rounded border border-gray-300 px-1 py-0.5 text-right text-xs focus:border-blue-500 focus:outline-none"
                                  placeholder="0"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <label className="w-20 text-[10px] text-gray-500">Min notti</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={cell.min_stay || ''}
                                  onChange={(e) => updateCell(key, 'min_stay', parseInt(e.target.value) || 1)}
                                  className="w-16 rounded border border-gray-300 px-1 py-0.5 text-right text-xs focus:border-blue-500 focus:outline-none"
                                  placeholder="1"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <label className="w-20 text-[10px] text-gray-500">Max notti</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={cell.max_stay ?? ''}
                                  onChange={(e) => updateCell(key, 'max_stay', e.target.value ? parseInt(e.target.value) : null)}
                                  className="w-16 rounded border border-gray-300 px-1 py-0.5 text-right text-xs focus:border-blue-500 focus:outline-none"
                                  placeholder="--"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="flex items-center gap-1 text-[10px]">
                                  <input
                                    type="checkbox"
                                    checked={cell.closed_to_arrival}
                                    onChange={(e) => updateCell(key, 'closed_to_arrival', e.target.checked)}
                                    className="rounded border-gray-300"
                                  />
                                  <span className="text-gray-500">CTA (chiuso arrivo)</span>
                                </label>
                                <label className="flex items-center gap-1 text-[10px]">
                                  <input
                                    type="checkbox"
                                    checked={cell.closed_to_departure}
                                    onChange={(e) => updateCell(key, 'closed_to_departure', e.target.checked)}
                                    className="rounded border-gray-300"
                                  />
                                  <span className="text-gray-500">CTD (chiuso partenza)</span>
                                </label>
                                <label className="flex items-center gap-1 text-[10px]">
                                  <input
                                    type="checkbox"
                                    checked={cell.stop_sell}
                                    onChange={(e) => updateCell(key, 'stop_sell', e.target.checked)}
                                    className="rounded border-gray-300"
                                  />
                                  <span className="text-red-500 font-medium">Stop sell</span>
                                </label>
                              </div>
                              <WeekdaySelector
                                label="Arrivo consentito"
                                helper="Vuoto = arrivo libero"
                                value={cell.allowed_arrival_days}
                                onChange={(days) => updateCell(key, 'allowed_arrival_days', days)}
                              />
                              <WeekdaySelector
                                label="Partenza consentita"
                                helper="Vuoto = partenza libera"
                                value={cell.allowed_departure_days}
                                onChange={(days) => updateCell(key, 'allowed_departure_days', days)}
                              />
                              <StayDiscountEditor
                                value={cell.stay_discounts}
                                onChange={(discounts) => updateCell(key, 'stay_discounts', discounts)}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <div className="flex items-center gap-4">
            {octorateConfigured && (
              <>
                <span className="text-sm text-gray-500">
                  Il salvataggio sincronizza automaticamente le tariffe con Octorate.
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSyncOnly}
                  disabled={syncing}
                >
                  {syncing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
                  Sync Octorate
                </Button>
              </>
            )}
            {dirtyCells.size > 0 && (
              <Badge variant="secondary">{dirtyCells.size} modifiche non salvate</Badge>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Annulla
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salva prezzi
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
