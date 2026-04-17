'use client'

import { useState, useTransition, useEffect } from 'react'
import { Plus, Send, X, Receipt, AlertTriangle } from 'lucide-react'
import { openOrder, addItemToOrder, sendOrderToKitchen, voidOrderItem, closeOrder, findInHouseStays } from './actions'

interface TableT {
  id: string
  code: string
  roomId: string
  seatsDefault: number
}

interface Room {
  id: string
  name: string
}

interface OpenOrder {
  id: string
  tableId: string | null
  status: 'open' | 'sent'
  subtotal: number
  total: number
  partySize: number
  openedAt: string
}

interface MenuItem {
  id: string
  categoryId: string
  name: string
  priceBase: number
  vatPct: number
  stationCode: string | null
  allergens: string[]
}

interface Category {
  id: string
  name: string
}

interface Props {
  tenantSlug: string
  entitySlug: string
  restaurantId: string
  rooms: Room[]
  tables: TableT[]
  openOrders: OpenOrder[]
  categories: Category[]
  items: MenuItem[]
}

export function POSView(props: Props) {
  const { tenantSlug, entitySlug, restaurantId, rooms, tables, openOrders, categories, items } = props
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(categories[0]?.id ?? null)
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [pending, startTransition] = useTransition()

  function getOrderForTable(tableId: string): OpenOrder | undefined {
    return openOrders.find((o) => o.tableId === tableId)
  }

  function handleSelectTable(t: TableT) {
    setSelectedTableId(t.id)
    const existing = getOrderForTable(t.id)
    if (existing) {
      setActiveOrderId(existing.id)
    } else {
      // Open new order
      startTransition(async () => {
        const result = await openOrder({
          restaurantId,
          tenantSlug,
          entitySlug,
          tableId: t.id,
          partySize: t.seatsDefault,
        })
        setActiveOrderId(result.orderId)
      })
    }
  }

  function handleAddItem(item: MenuItem) {
    if (!activeOrderId) return
    startTransition(async () => {
      await addItemToOrder({
        orderId: activeOrderId,
        menuItemId: item.id,
        qty: 1,
        modifiers: [],
        tenantSlug,
        entitySlug,
      })
    })
  }

  const activeTable = tables.find((t) => t.id === selectedTableId)
  const activeOrder = openOrders.find((o) => o.id === activeOrderId)
  const filteredItems = activeCategory ? items.filter((i) => i.categoryId === activeCategory) : items

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* LEFT: tavoli */}
      <div className="col-span-3 rounded-lg border border-gray-200 bg-white p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Tavoli</p>
        <div className="space-y-3">
          {rooms.map((r) => {
            const roomTables = tables.filter((t) => t.roomId === r.id)
            return (
              <div key={r.id}>
                <p className="mb-1 text-xs font-medium text-gray-600">{r.name}</p>
                <div className="grid grid-cols-3 gap-1">
                  {roomTables.map((t) => {
                    const order = getOrderForTable(t.id)
                    const isActive = t.id === selectedTableId
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleSelectTable(t)}
                        className={`rounded border p-2 text-xs ${
                          isActive
                            ? 'border-blue-500 bg-blue-50'
                            : order
                              ? 'border-amber-300 bg-amber-50'
                              : 'border-gray-300 bg-white hover:border-blue-300'
                        }`}
                      >
                        <p className="font-bold">{t.code}</p>
                        {order && <p className="text-[9px] text-amber-700">€ {order.total.toFixed(2)}</p>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* CENTER: menu */}
      <div className="col-span-5 rounded-lg border border-gray-200 bg-white">
        <div className="flex border-b border-gray-200 p-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-3 py-1 text-xs font-medium ${
                c.id === activeCategory ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 p-3">
          {filteredItems.map((i) => (
            <button
              key={i.id}
              onClick={() => handleAddItem(i)}
              disabled={!activeOrderId || pending}
              className="rounded border border-gray-200 bg-white p-2 text-left text-xs hover:border-blue-300 disabled:opacity-50"
            >
              <p className="font-medium">{i.name}</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-bold text-gray-900">€ {i.priceBase.toFixed(2)}</span>
                {i.allergens.length > 0 && (
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT: bill */}
      <div className="col-span-4 rounded-lg border border-gray-200 bg-white">
        {!activeOrderId ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-gray-500">
            Seleziona un tavolo
          </div>
        ) : (
          <BillPanel
            orderId={activeOrderId}
            tenantSlug={tenantSlug}
            entitySlug={entitySlug}
            tableCode={activeTable?.code ?? ''}
            partySize={activeOrder?.partySize ?? 1}
            total={activeOrder?.total ?? 0}
            subtotal={activeOrder?.subtotal ?? 0}
            status={activeOrder?.status ?? 'open'}
            onClose={() => setShowCloseDialog(true)}
            pending={pending}
            startTransition={startTransition}
          />
        )}
      </div>

      {showCloseDialog && activeOrderId && (
        <CloseOrderDialog
          orderId={activeOrderId}
          partySize={activeOrder?.partySize ?? 1}
          subtotal={activeOrder?.subtotal ?? 0}
          restaurantId={restaurantId}
          tenantSlug={tenantSlug}
          entitySlug={entitySlug}
          onClose={() => {
            setShowCloseDialog(false)
            setActiveOrderId(null)
            setSelectedTableId(null)
          }}
        />
      )}
    </div>
  )
}

function BillPanel({
  orderId,
  tenantSlug,
  entitySlug,
  tableCode,
  partySize,
  total,
  subtotal,
  status,
  onClose,
  pending,
  startTransition,
}: {
  orderId: string
  tenantSlug: string
  entitySlug: string
  tableCode: string
  partySize: number
  total: number
  subtotal: number
  status: 'open' | 'sent'
  onClose: () => void
  pending: boolean
  startTransition: (cb: () => void) => void
}) {
  const [orderItems, setOrderItems] = useState<Array<{
    id: string
    item_name: string
    qty: number
    unit_price: number
    status: string
  }>>([])

  useEffect(() => {
    void fetch(`/api/restaurant/order-items?orderId=${orderId}`)
      .then((r) => r.json())
      .then(setOrderItems)
      .catch(() => setOrderItems([]))
  }, [orderId, total])

  return (
    <div className="flex h-full flex-col p-3">
      <div className="border-b border-gray-200 pb-2">
        <p className="text-xs font-bold uppercase text-gray-500">Tavolo {tableCode}</p>
        <p className="text-xs text-gray-500">{partySize} coperti</p>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {orderItems.length === 0 ? (
          <p className="py-4 text-center text-xs text-gray-400">Nessun item</p>
        ) : (
          orderItems.map((it) => (
            <div key={it.id} className="flex items-center justify-between border-b border-gray-50 py-1.5 text-xs">
              <div>
                <p className={`font-medium ${it.status === 'voided' ? 'line-through text-gray-400' : ''}`}>
                  {it.qty}× {it.item_name}
                </p>
                <p className="text-[10px] text-gray-400">{it.status}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">€ {(it.unit_price * it.qty).toFixed(2)}</span>
                {it.status !== 'voided' && (
                  <button
                    onClick={() =>
                      startTransition(async () => {
                        await voidOrderItem({ itemId: it.id, tenantSlug, entitySlug })
                      })
                    }
                    className="text-gray-400 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-gray-200 pt-2">
        <div className="flex justify-between text-xs text-gray-600">
          <span>Subtotale</span>
          <span>€ {subtotal.toFixed(2)}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm font-bold">
          <span>Totale</span>
          <span>€ {total.toFixed(2)}</span>
        </div>
        <div className="mt-3 flex gap-2">
          {status === 'open' && (
            <button
              onClick={() =>
                startTransition(async () => {
                  await sendOrderToKitchen({ orderId, tenantSlug, entitySlug })
                })
              }
              disabled={pending || orderItems.length === 0}
              className="flex flex-1 items-center justify-center gap-1 rounded bg-amber-600 px-3 py-2 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              <Send className="h-3 w-3" /> Invia cucina
            </button>
          )}
          <button
            onClick={onClose}
            disabled={total === 0}
            className="flex flex-1 items-center justify-center gap-1 rounded bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            <Receipt className="h-3 w-3" /> Chiudi conto
          </button>
        </div>
      </div>
    </div>
  )
}

interface OrderItemRow {
  id: string
  item_name: string
  qty: number
  unit_price: number
  modifier_delta?: number
  status: string
}

interface InHouseStay {
  id: string
  reservationCode: string
  guestName: string
  checkIn: string
  checkOut: string
}

function CloseOrderDialog({
  orderId,
  partySize,
  subtotal,
  restaurantId,
  tenantSlug,
  entitySlug,
  onClose,
}: {
  orderId: string
  partySize: number
  subtotal: number
  restaurantId: string
  tenantSlug: string
  entitySlug: string
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'charge_to_room'>('card')
  const [serviceChargePct, setServiceChargePct] = useState(0)
  const [coverPerGuest, setCoverPerGuest] = useState(2)
  const [tip, setTip] = useState(0)
  const [splitMode, setSplitMode] = useState<'none' | 'item' | 'cover' | 'pct'>('none')
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([])
  const [splitGuests, setSplitGuests] = useState<Array<{ name: string; pct: number; itemIds: string[] }>>([
    { name: 'Ospite 1', pct: 100, itemIds: [] },
  ])
  const [inHouseStays, setInHouseStays] = useState<InHouseStay[]>([])
  const [chargeToReservationId, setChargeToReservationId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // Carica order items per split per-item
  useEffect(() => {
    void fetch(`/api/restaurant/order-items?orderId=${orderId}`)
      .then((r) => r.json())
      .then(setOrderItems)
      .catch(() => setOrderItems([]))
  }, [orderId])

  // Carica in-house stays se charge_to_room
  useEffect(() => {
    if (paymentMethod === 'charge_to_room' && inHouseStays.length === 0) {
      void findInHouseStays(restaurantId).then(setInHouseStays).catch(() => setInHouseStays([]))
    }
  }, [paymentMethod, restaurantId, inHouseStays.length])

  const serviceCharge = subtotal * (serviceChargePct / 100)
  const coverTotal = coverPerGuest * partySize
  const grandTotal = subtotal + serviceCharge + coverTotal + tip

  // Split calculations
  const splitTotals = (() => {
    if (splitMode === 'none') return [{ name: 'Totale', amount: grandTotal }]
    if (splitMode === 'cover') {
      const each = +(grandTotal / partySize).toFixed(2)
      return Array.from({ length: partySize }).map((_, i) => ({ name: `Coperto ${i + 1}`, amount: each }))
    }
    if (splitMode === 'pct') {
      const totalPct = splitGuests.reduce((s, g) => s + g.pct, 0)
      return splitGuests.map((g) => ({
        name: g.name,
        amount: +(grandTotal * (g.pct / Math.max(totalPct, 1))).toFixed(2),
      }))
    }
    if (splitMode === 'item') {
      // Per-item: ogni guest paga somma items assegnati + service/cover/tip pro-quota
      const overhead = serviceCharge + coverTotal + tip
      const overheadPerGuest = +(overhead / Math.max(splitGuests.length, 1)).toFixed(2)
      return splitGuests.map((g) => {
        const itemsSum = orderItems
          .filter((i) => g.itemIds.includes(i.id) && i.status !== 'voided')
          .reduce((s, i) => s + i.qty * (i.unit_price + (i.modifier_delta ?? 0)), 0)
        return { name: g.name, amount: +(itemsSum + overheadPerGuest).toFixed(2) }
      })
    }
    return []
  })()

  function handleSubmit() {
    setError(null)
    if (paymentMethod === 'charge_to_room' && !chargeToReservationId) {
      setError('Seleziona prenotazione hospitality per charge-to-room')
      return
    }
    startTransition(async () => {
      try {
        await closeOrder({
          orderId,
          paymentMethod,
          chargeToRoomReservationId: chargeToReservationId || undefined,
          serviceChargePct,
          coverChargePerGuest: coverPerGuest,
          tipAmount: tip,
          splitMode,
          tenantSlug,
          entitySlug,
        })
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Errore')
      }
    })
  }

  function addSplitGuest() {
    setSplitGuests([...splitGuests, { name: `Ospite ${splitGuests.length + 1}`, pct: 0, itemIds: [] }])
  }

  function removeSplitGuest(i: number) {
    setSplitGuests(splitGuests.filter((_, idx) => idx !== i))
  }

  function toggleItemForGuest(itemId: string, guestIdx: number) {
    const next = [...splitGuests]
    const target = next[guestIdx]
    if (!target) return
    if (target.itemIds.includes(itemId)) {
      target.itemIds = target.itemIds.filter((id) => id !== itemId)
    } else {
      // Rimuovi item da altri ospiti
      next.forEach((g) => { g.itemIds = g.itemIds.filter((id) => id !== itemId) })
      target.itemIds.push(itemId)
    }
    setSplitGuests(next)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl space-y-3 overflow-y-auto rounded-lg bg-white p-6">
        <h2 className="text-lg font-semibold">Chiudi conto</h2>

        <div className="space-y-2 rounded border border-gray-200 p-3 text-sm">
          <div className="flex justify-between">
            <span>Subtotale</span>
            <span>€ {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Servizio {serviceChargePct}%</span>
            <span>€ {serviceCharge.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Coperto € {coverPerGuest} × {partySize}</span>
            <span>€ {coverTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Mancia</span>
            <span>€ {tip.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2 font-bold">
            <span>TOTALE</span>
            <span>€ {grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <label className="text-xs text-gray-600">Servizio %</label>
            <input type="number" min={0} max={30} value={serviceChargePct}
              onChange={(e) => setServiceChargePct(Number(e.target.value))}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1"/>
          </div>
          <div>
            <label className="text-xs text-gray-600">Coperto €/persona</label>
            <input type="number" step="0.5" min={0} value={coverPerGuest}
              onChange={(e) => setCoverPerGuest(Number(e.target.value))}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1"/>
          </div>
          <div>
            <label className="text-xs text-gray-600">Mancia €</label>
            <input type="number" step="0.5" min={0} value={tip}
              onChange={(e) => setTip(Number(e.target.value))}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1"/>
          </div>
          <div>
            <label className="text-xs text-gray-600">Pagamento</label>
            <select value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'card' | 'charge_to_room')}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1">
              <option value="card">Carta</option>
              <option value="cash">Contanti</option>
              <option value="charge_to_room">Charge to room</option>
            </select>
          </div>
        </div>

        {paymentMethod === 'charge_to_room' && (
          <div className="rounded border border-amber-300 bg-amber-50 p-3">
            <label className="text-xs font-medium text-amber-900">Prenotazione hospitality in-house</label>
            {inHouseStays.length === 0 ? (
              <p className="mt-1 text-xs text-amber-700">Nessuna prenotazione in-house oggi</p>
            ) : (
              <select value={chargeToReservationId}
                onChange={(e) => setChargeToReservationId(e.target.value)}
                className="mt-1 w-full rounded border border-amber-400 px-2 py-1 text-sm">
                <option value="">— seleziona —</option>
                {inHouseStays.map((s) => (
                  <option key={s.id} value={s.id}>{s.reservationCode} · {s.guestName} ({s.checkIn} → {s.checkOut})</option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="rounded border border-gray-200 p-3">
          <label className="text-xs font-medium text-gray-700">Modalità split bill</label>
          <div className="mt-1 grid grid-cols-4 gap-1">
            {(['none', 'cover', 'item', 'pct'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setSplitMode(m)}
                className={`rounded border px-2 py-1 text-xs ${splitMode === m ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-600'}`}>
                {m === 'none' ? 'Nessuno' : m === 'cover' ? `Per coperto` : m === 'item' ? 'Per item' : 'Custom %'}
              </button>
            ))}
          </div>

          {splitMode !== 'none' && (
            <div className="mt-2 space-y-1.5">
              {(splitMode === 'pct' || splitMode === 'item') && (
                <>
                  {splitGuests.map((g, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <input value={g.name} onChange={(e) => {
                        const next = [...splitGuests]; const target = next[i]; if (!target) return
                        target.name = e.target.value; setSplitGuests(next)
                      }} className="flex-1 rounded border border-gray-300 px-2 py-1"/>
                      {splitMode === 'pct' && (
                        <input type="number" min={0} max={100} value={g.pct} onChange={(e) => {
                          const next = [...splitGuests]; const target = next[i]; if (!target) return
                          target.pct = Number(e.target.value); setSplitGuests(next)
                        }} className="w-16 rounded border border-gray-300 px-2 py-1"/>
                      )}
                      {splitMode === 'item' && (
                        <span className="text-gray-500">{g.itemIds.length} items</span>
                      )}
                      {splitGuests.length > 1 && (
                        <button onClick={() => removeSplitGuest(i)} className="text-red-600">✕</button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addSplitGuest}
                    className="w-full rounded border border-dashed border-gray-300 py-1 text-xs text-gray-500 hover:border-blue-400">
                    + Aggiungi ospite
                  </button>
                </>
              )}

              {splitMode === 'item' && orderItems.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto border-t border-gray-200 pt-2">
                  <p className="mb-1 text-[10px] font-bold uppercase text-gray-500">Assegna items</p>
                  {orderItems.filter((i) => i.status !== 'voided').map((item) => {
                    const assignedTo = splitGuests.findIndex((g) => g.itemIds.includes(item.id))
                    return (
                      <div key={item.id} className="flex items-center gap-1 py-0.5 text-xs">
                        <span className="flex-1 truncate">{item.qty}× {item.item_name}</span>
                        <span className="text-gray-500">€ {(item.qty * (item.unit_price + (item.modifier_delta ?? 0))).toFixed(2)}</span>
                        <select value={assignedTo} onChange={(e) => toggleItemForGuest(item.id, Number(e.target.value))}
                          className="rounded border border-gray-300 px-1 text-xs">
                          <option value={-1}>—</option>
                          {splitGuests.map((g, i) => (<option key={i} value={i}>{g.name}</option>))}
                        </select>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="mt-2 border-t border-gray-200 pt-2">
                {splitTotals.map((s, i) => (
                  <div key={i} className="flex justify-between text-xs"><span>{s.name}</span><span className="font-medium">€ {s.amount.toFixed(2)}</span></div>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && <p className="rounded bg-red-50 p-2 text-xs text-red-700">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
          <button onClick={onClose} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Annulla</button>
          <button onClick={handleSubmit} disabled={pending}
            className="rounded bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
            {pending ? 'Salvo…' : `Conferma € ${grandTotal.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
