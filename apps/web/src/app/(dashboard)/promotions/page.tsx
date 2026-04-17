'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button, Input, Select, Modal, DataTable, Badge } from '@touracore/ui'
import { useAuthStore } from '@touracore/auth/store'
import {
  listPromotionsAction,
  upsertPromotionAction,
  deletePromotionAction,
  createPromoCodeAction,
} from '../competitive-actions'

interface Promo {
  id: string
  name: string
  promotion_type: string
  discount_type: string
  discount_value: number
  is_active: boolean
  valid_from: string | null
  valid_to: string | null
}

export default function PromotionsPage() {
  const { property, tenant } = useAuthStore()
  const [promos, setPromos] = useState<Promo[]>([])
  const [open, setOpen] = useState(false)
  const [codeOpen, setCodeOpen] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    promotionType: 'early_booker',
    discountType: 'percentage',
    discountValue: 10,
    minAdvanceDays: 30,
    validFrom: '',
    validTo: '',
  })
  const [codeForm, setCodeForm] = useState({ code: '', maxUses: 0 })

  const load = useCallback(async () => {
    if (!property) return
    const data = await listPromotionsAction(property.id)
    setPromos(data as Promo[])
  }, [property])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    if (!tenant || !property) return
    await upsertPromotionAction({
      tenantId: tenant.id,
      entityId: property.id,
      name: form.name,
      promotionType: form.promotionType,
      discountType: form.discountType,
      discountValue: form.discountValue,
      minAdvanceDays: form.minAdvanceDays || undefined,
      validFrom: form.validFrom || undefined,
      validTo: form.validTo || undefined,
    })
    setOpen(false)
    setForm({ name: '', promotionType: 'early_booker', discountType: 'percentage', discountValue: 10, minAdvanceDays: 30, validFrom: '', validTo: '' })
    await load()
  }

  async function handleCreateCode() {
    if (!codeOpen) return
    await createPromoCodeAction({
      promotionId: codeOpen,
      code: codeForm.code,
      maxUses: codeForm.maxUses || undefined,
    })
    setCodeOpen(null)
    setCodeForm({ code: '', maxUses: 0 })
  }

  async function handleDelete(id: string) {
    if (!confirm('Elimina promozione?')) return
    await deletePromotionAction(id)
    await load()
  }

  async function toggleActive(p: Promo) {
    if (!tenant || !property) return
    await upsertPromotionAction({
      id: p.id,
      tenantId: tenant.id,
      entityId: property.id,
      name: p.name,
      promotionType: p.promotion_type,
      discountType: p.discount_type,
      discountValue: Number(p.discount_value),
      isActive: !p.is_active,
    })
    await load()
  }

  if (!property) return <div className="py-20 text-center text-gray-500">Seleziona una struttura.</div>

  const columns = [
    { key: 'name', header: 'Nome' },
    { key: 'promotion_type', header: 'Tipo', render: (p: Promo) => <Badge variant="secondary">{p.promotion_type}</Badge> },
    { key: 'discount', header: 'Sconto', render: (p: Promo) => (
      <span>{p.discount_type === 'percentage' ? `${p.discount_value}%` : `€${p.discount_value}`}</span>
    )},
    { key: 'is_active', header: 'Stato', render: (p: Promo) => (
      <Badge variant={p.is_active ? 'success' : 'secondary'}>{p.is_active ? 'Attiva' : 'Inattiva'}</Badge>
    )},
    { key: 'actions', header: '', render: (p: Promo) => (
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => toggleActive(p)}>{p.is_active ? 'Disattiva' : 'Attiva'}</Button>
        {p.promotion_type === 'promo_code' && (
          <Button size="sm" variant="ghost" onClick={() => setCodeOpen(p.id)}>Codice</Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)} className="text-red-600">Elimina</Button>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Promozioni</h1>
        <Button onClick={() => setOpen(true)}>Nuova promozione</Button>
      </div>

      <DataTable columns={columns} data={promos} keyExtractor={(p) => p.id} emptyMessage="Nessuna promozione." />

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Nuova promozione">
        <div className="space-y-4">
          <Input label="Nome" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <Select
            label="Tipo"
            options={[
              { value: 'early_booker', label: 'Early Booker' },
              { value: 'last_minute', label: 'Last Minute' },
              { value: 'weekly_discount', label: 'Sconto settimanale' },
              { value: 'monthly_discount', label: 'Sconto mensile' },
              { value: 'genius', label: 'Genius' },
              { value: 'mobile_rate', label: 'Mobile Rate' },
              { value: 'country_rate', label: 'Country Rate' },
              { value: 'promo_code', label: 'Promo Code' },
              { value: 'basic', label: 'Base' },
            ]}
            value={form.promotionType}
            onChange={(e) => setForm((p) => ({ ...p, promotionType: e.target.value }))}
          />
          <Select
            label="Tipo sconto"
            options={[
              { value: 'percentage', label: 'Percentuale' },
              { value: 'fixed_amount', label: 'Importo fisso' },
              { value: 'free_nights', label: 'Notti gratis' },
            ]}
            value={form.discountType}
            onChange={(e) => setForm((p) => ({ ...p, discountType: e.target.value }))}
          />
          <Input
            label="Valore sconto"
            type="number"
            value={String(form.discountValue)}
            onChange={(e) => setForm((p) => ({ ...p, discountValue: Number(e.target.value) }))}
          />
          {form.promotionType === 'early_booker' && (
            <Input
              label="Giorni minimi anticipo"
              type="number"
              value={String(form.minAdvanceDays)}
              onChange={(e) => setForm((p) => ({ ...p, minAdvanceDays: Number(e.target.value) }))}
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valido da" type="date" value={form.validFrom} onChange={(e) => setForm((p) => ({ ...p, validFrom: e.target.value }))} />
            <Input label="Valido a" type="date" value={form.validTo} onChange={(e) => setForm((p) => ({ ...p, validTo: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>Annulla</Button>
            <Button onClick={handleSave} disabled={!form.name}>Salva</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!codeOpen} onClose={() => setCodeOpen(null)} title="Aggiungi codice promo">
        <div className="space-y-4">
          <Input label="Codice" value={codeForm.code} onChange={(e) => setCodeForm((p) => ({ ...p, code: e.target.value }))} />
          <Input
            label="Max usi (0 = illimitato)"
            type="number"
            value={String(codeForm.maxUses)}
            onChange={(e) => setCodeForm((p) => ({ ...p, maxUses: Number(e.target.value) }))}
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setCodeOpen(null)}>Annulla</Button>
            <Button onClick={handleCreateCode} disabled={!codeForm.code}>Crea</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
