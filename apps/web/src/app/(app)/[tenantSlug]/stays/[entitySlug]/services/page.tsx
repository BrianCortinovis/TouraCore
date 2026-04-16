'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button, Input, Select, Modal, Badge } from '@touracore/ui'
import {
  UPSELL_CATEGORIES,
  PRICING_MODE_LABELS,
  ORDER_STATUS_LABELS,
  getUpsellCategoryLabel,
  type UpsellCategory,
  type PricingMode,
  type ChargeMode,
} from '@touracore/hospitality-config'
import {
  loadServicesPageAction,
  createOfferAction,
  updateOfferAction,
  deleteOfferAction,
  toggleOfferAction,
  confirmOrderAction,
  cancelOrderAction,
  completeOrderAction,
} from './actions'
import {
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import { SlotManager } from './slot-manager'
import { useAuthStore } from '@touracore/auth/store'
import { getStructureTerms } from '../../../../../structure-terms'

interface Offer {
  id: string
  name: string
  description: string | null
  price: number
  category: string
  charge_mode: string
  pricing_mode: string
  is_active: boolean
  online_bookable: boolean
  requires_request: boolean
  sort_order: number
  bookable_with_slots: boolean
  slot_duration_minutes: number | null
  max_concurrent: number
}

interface Order {
  id: string
  quantity: number
  unit_price: number
  total_price: number
  status: string
  source: string
  requested_date: string | null
  notes: string | null
  created_at: string
  offer: { name: string; category: string } | null
  reservation: { id: string; guest: { first_name: string; last_name: string } | null } | null
}

const CATEGORY_OPTIONS = UPSELL_CATEGORIES.map((c) => ({ value: c.key, label: c.label }))
const PRICING_OPTIONS = Object.entries(PRICING_MODE_LABELS).map(([v, l]) => ({ value: v, label: l }))
const CHARGE_OPTIONS = [
  { value: 'free', label: 'Gratuito' },
  { value: 'paid', label: 'A pagamento' },
]

const emptyForm = {
  name: '',
  description: '',
  price: '',
  category: 'food_beverage' as string,
  charge_mode: 'paid' as string,
  pricing_mode: 'per_stay' as string,
  online_bookable: true,
  requires_request: false,
  sort_order: '0',
  bookable_with_slots: false,
  slot_duration_minutes: '60',
  max_concurrent: '1',
}

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  pending: 'warning',
  confirmed: 'success',
  cancelled: 'destructive',
  completed: 'secondary',
}

export default function ServicesPage() {
  const { property } = useAuthStore()
  const terms = getStructureTerms(property?.property_type)
  const [tab, setTab] = useState<'offers' | 'orders'>('offers')
  const [offers, setOffers] = useState<Offer[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [revenue, setRevenue] = useState({ totalRevenue: 0, totalOrders: 0, pendingOrders: 0 })
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [slotManagerOffer, setSlotManagerOffer] = useState<Offer | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { offers: offersData, orders: ordersData, revenue: revenueData } =
        await loadServicesPageAction({ limit: 50 })
      setOffers(offersData as Offer[])
      setOrders(ordersData as Order[])
      setRevenue(revenueData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore caricamento servizi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setError(null)
    setModalOpen(true)
  }

  function openEdit(offer: Offer) {
    setEditingId(offer.id)
    setForm({
      name: offer.name,
      description: offer.description ?? '',
      price: offer.price.toString(),
      category: offer.category,
      charge_mode: offer.charge_mode,
      pricing_mode: offer.pricing_mode,
      online_bookable: offer.online_bookable,
      requires_request: offer.requires_request,
      sort_order: offer.sort_order.toString(),
      bookable_with_slots: offer.bookable_with_slots,
      slot_duration_minutes: (offer.slot_duration_minutes ?? 60).toString(),
      max_concurrent: offer.max_concurrent.toString(),
    })
    setError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Il nome è obbligatorio.'); return }
    setSaving(true)
    setError(null)

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: parseFloat(form.price) || 0,
      category: form.category as UpsellCategory,
      charge_mode: form.charge_mode as ChargeMode,
      pricing_mode: form.pricing_mode as PricingMode,
      online_bookable: form.online_bookable,
      requires_request: form.requires_request,
      sort_order: parseInt(form.sort_order) || 0,
      bookable_with_slots: form.bookable_with_slots,
      slot_duration_minutes: form.bookable_with_slots
        ? parseInt(form.slot_duration_minutes) || 60
        : null,
      max_concurrent: parseInt(form.max_concurrent) || 1,
    }

    const result = editingId
      ? await updateOfferAction(editingId, payload)
      : await createOfferAction(payload)

    setSaving(false)
    if (!result.success) { setError(result.error ?? 'Errore'); return }
    setModalOpen(false)
    loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questa offerta?')) return
    await deleteOfferAction(id)
    loadData()
  }

  async function handleToggle(id: string, current: boolean) {
    await toggleOfferAction(id, !current)
    loadData()
  }

  async function handleOrderAction(id: string, action: 'confirm' | 'cancel' | 'complete') {
    if (action === 'confirm') await confirmOrderAction(id)
    else if (action === 'cancel') await cancelOrderAction(id)
    else await completeOrderAction(id)
    loadData()
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-500">Caricamento...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Servizi extra</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuova offerta
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Fatturato upselling</p>
          <p className="text-2xl font-bold text-gray-900">{revenue.totalRevenue.toFixed(2)} &euro;</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Ordini totali</p>
          <p className="text-2xl font-bold text-gray-900">{revenue.totalOrders}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">In attesa</p>
          <p className="text-2xl font-bold text-amber-600">{revenue.pendingOrders}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab('offers')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'offers'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Catalogo offerte ({offers.length})
        </button>
        <button
          onClick={() => setTab('orders')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'orders'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Ordini ({orders.length})
        </button>
      </div>

      {/* Offers tab */}
      {tab === 'offers' && (
        offers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <p className="text-gray-500">Nessuna offerta configurata.</p>
            <p className="mt-1 text-sm text-gray-400">Crea la prima offerta upselling per i tuoi ospiti.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Categoria</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Prezzo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Modalità</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Stato</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {offers.map((offer) => (
                  <tr key={offer.id} className={!offer.is_active ? 'bg-gray-50 opacity-60' : ''}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{offer.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{getUpsellCategoryLabel(offer.category as UpsellCategory)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {offer.charge_mode === 'free' ? (
                        <span className="text-green-600">Gratuito</span>
                      ) : (
                        <>{offer.price.toFixed(2)} &euro;</>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {PRICING_MODE_LABELS[offer.pricing_mode as PricingMode] ?? offer.pricing_mode}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={offer.is_active ? 'success' : 'secondary'}>
                        {offer.is_active ? 'Attivo' : 'Disattivo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {offer.bookable_with_slots && (
                          <button
                            onClick={() => setSlotManagerOffer(offer)}
                            className="rounded p-1.5 text-blue-500 hover:bg-blue-50 hover:text-blue-700"
                            title="Gestisci slot orari"
                          >
                            <Clock className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleToggle(offer.id, offer.is_active)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          title={offer.is_active ? 'Disattiva' : 'Attiva'}
                        >
                          {offer.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => openEdit(offer)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          title="Modifica"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(offer.id)}
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          title="Elimina"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Orders tab */}
      {tab === 'orders' && (
        orders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <p className="text-gray-500">Nessun ordine ancora.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Servizio</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Ospite</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Qtà</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Totale</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Stato</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Data</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {order.offer?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {order.reservation?.guest
                        ? `${order.reservation.guest.first_name} ${order.reservation.guest.last_name}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{order.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{order.total_price.toFixed(2)} &euro;</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_COLORS[order.status] ?? 'secondary'}>
                        {ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS] ?? order.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {order.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleOrderAction(order.id, 'confirm')}
                              className="rounded p-1.5 text-gray-400 hover:bg-green-50 hover:text-green-600"
                              title="Conferma"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOrderAction(order.id, 'cancel')}
                              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                              title="Annulla"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {order.status === 'confirmed' && (
                          <button
                            onClick={() => handleOrderAction(order.id, 'complete')}
                            className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                            title="Completa"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Modifica offerta' : 'Nuova offerta'}>
        <div className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <Input
            label="Nome"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={`Es. Colazione in ${terms.unitLabel}`}
          />

          <Input
            label="Descrizione"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descrizione opzionale"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Categoria"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              options={CATEGORY_OPTIONS}
            />
            <Select
              label="Tipo addebito"
              value={form.charge_mode}
              onChange={(e) => setForm({ ...form, charge_mode: e.target.value })}
              options={CHARGE_OPTIONS}
            />
          </div>

          {form.charge_mode === 'paid' && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Prezzo"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
              <Select
                label="Modalità prezzo"
                value={form.pricing_mode}
                onChange={(e) => setForm({ ...form, pricing_mode: e.target.value })}
                options={PRICING_OPTIONS}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.online_bookable}
                onChange={(e) => setForm({ ...form, online_bookable: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700">Prenotabile online</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.requires_request}
                onChange={(e) => setForm({ ...form, requires_request: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700">Richiede conferma</span>
            </label>
          </div>

          <Input
            label="Ordine visualizzazione"
            type="number"
            min="0"
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
          />

          <div className="border-t border-gray-200 pt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.bookable_with_slots}
                onChange={(e) => setForm({ ...form, bookable_with_slots: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">
                Prenotazione con slot orari (spa, piscina, corsi, tour)
              </span>
            </label>
            <p className="mt-1 text-xs text-gray-500">
              Attiva per permettere agli ospiti di prenotare uno slot orario specifico
              con controllo disponibilità e anti-overbooking.
            </p>

            {form.bookable_with_slots && (
              <div className="mt-3 grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-3">
                <Input
                  label="Durata slot (minuti)"
                  type="number"
                  min="15"
                  step="15"
                  value={form.slot_duration_minutes}
                  onChange={(e) => setForm({ ...form, slot_duration_minutes: e.target.value })}
                />
                <Input
                  label="Max ospiti contemporanei"
                  type="number"
                  min="1"
                  value={form.max_concurrent}
                  onChange={(e) => setForm({ ...form, max_concurrent: e.target.value })}
                />
                <p className="col-span-2 text-xs text-gray-500">
                  Gli orari di disponibilità (giorni e fasce) si gestiscono dalla
                  scheda offerta dopo averla creata.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvataggio...' : editingId ? 'Salva modifiche' : 'Crea offerta'}
            </Button>
          </div>
        </div>
      </Modal>

      {slotManagerOffer && (
        <Modal
          isOpen={true}
          onClose={() => setSlotManagerOffer(null)}
          title=""
        >
          <SlotManager
            offerId={slotManagerOffer.id}
            offerName={slotManagerOffer.name}
            slotDurationMinutes={slotManagerOffer.slot_duration_minutes ?? 60}
            maxConcurrent={slotManagerOffer.max_concurrent}
            onClose={() => setSlotManagerOffer(null)}
          />
        </Modal>
      )}
    </div>
  )
}
