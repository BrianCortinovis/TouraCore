'use client'

import { useState, useTransition, useEffect } from 'react'
import { Plus, Send, X, Receipt, AlertTriangle } from 'lucide-react'
import { openOrder, addItemToOrder, sendOrderToKitchen, voidOrderItem, closeOrder } from './actions'

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

function CloseOrderDialog({
  orderId,
  partySize,
  subtotal,
  tenantSlug,
  entitySlug,
  onClose,
}: {
  orderId: string
  partySize: number
  subtotal: number
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

  const serviceCharge = subtotal * (serviceChargePct / 100)
  const coverTotal = coverPerGuest * partySize
  const grandTotal = subtotal + serviceCharge + coverTotal + tip

  function handleSubmit() {
    startTransition(async () => {
      await closeOrder({
        orderId,
        paymentMethod,
        serviceChargePct,
        coverChargePerGuest: coverPerGuest,
        tipAmount: tip,
        splitMode,
        tenantSlug,
        entitySlug,
      })
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md space-y-3 rounded-lg bg-white p-6">
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
            <input
              type="number"
              min={0}
              max={30}
              value={serviceChargePct}
              onChange={(e) => setServiceChargePct(Number(e.target.value))}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Coperto €/persona</label>
            <input
              type="number"
              step="0.5"
              min={0}
              value={coverPerGuest}
              onChange={(e) => setCoverPerGuest(Number(e.target.value))}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Mancia €</label>
            <input
              type="number"
              step="0.5"
              min={0}
              value={tip}
              onChange={(e) => setTip(Number(e.target.value))}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Pagamento</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'card' | 'charge_to_room')}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1"
            >
              <option value="card">Carta</option>
              <option value="cash">Contanti</option>
              <option value="charge_to_room">Charge to room</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-600">Modalità split</label>
            <select
              value={splitMode}
              onChange={(e) => setSplitMode(e.target.value as 'none' | 'item' | 'cover' | 'pct')}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1"
            >
              <option value="none">Nessuno</option>
              <option value="cover">Per coperto (€ {(grandTotal / partySize).toFixed(2)} cad)</option>
              <option value="item">Per item</option>
              <option value="pct">Custom %</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
          <button onClick={onClose} className="rounded border border-gray-300 px-3 py-1.5 text-sm">
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            disabled={pending}
            className="rounded bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {pending ? 'Salvo…' : 'Conferma pagamento'}
          </button>
        </div>
      </div>
    </div>
  )
}
