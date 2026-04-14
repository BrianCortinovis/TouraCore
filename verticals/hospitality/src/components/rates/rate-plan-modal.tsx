'use client'
import { Button, Input, Modal, Select } from '@touracore/ui'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '../../stores/auth-store'
import { createRatePlan, updateRatePlan } from '../../actions/rates'
import { MEAL_PLAN_LABELS, RATE_TYPE_LABELS } from '../../constants'
import { Loader2 } from 'lucide-react'
import type { RatePlan } from '../../types/database'

interface RatePlanModalProps {
  isOpen: boolean
  onClose: () => void
  ratePlan?: RatePlan
  ratePlans: RatePlan[]
}

const rateTypeOptions = Object.entries(RATE_TYPE_LABELS).map(([value, label]) => ({ value, label }))
const mealPlanOptions = Object.entries(MEAL_PLAN_LABELS).map(([value, label]) => ({ value, label }))

export function RatePlanModal({ isOpen, onClose, ratePlan, ratePlans }: RatePlanModalProps) {
  const router = useRouter()
  const { property } = useAuthStore()
  const isEditing = !!ratePlan

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    code: '',
    rate_type: 'standard',
    meal_plan: 'room_only',
    description: '',
    is_derived: false,
    parent_rate_plan_id: '',
    is_public: true,
    is_active: true,
  })

  useEffect(() => {
    if (isOpen) {
      setError(null)
      if (ratePlan) {
        setForm({
          name: ratePlan.name,
          code: ratePlan.code ?? '',
          rate_type: ratePlan.rate_type,
          meal_plan: ratePlan.meal_plan,
          description: ratePlan.description ?? '',
          is_derived: ratePlan.is_derived,
          parent_rate_plan_id: ratePlan.parent_rate_plan_id ?? '',
          is_public: ratePlan.is_public,
          is_active: ratePlan.is_active,
        })
      } else {
        setForm({
          name: '',
          code: '',
          rate_type: 'standard',
          meal_plan: 'room_only',
          description: '',
          is_derived: false,
          parent_rate_plan_id: '',
          is_public: true,
          is_active: true,
        })
      }
    }
  }, [isOpen, ratePlan])

  const parentPlanOptions = ratePlans
    .filter((p) => p.id !== ratePlan?.id && p.is_active)
    .map((p) => ({ value: p.id, label: p.name }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Il nome è obbligatorio')
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (isEditing) {
        await updateRatePlan(ratePlan.id, {
          name: form.name,
          code: form.code || null,
          rate_type: form.rate_type as RatePlan['rate_type'],
          meal_plan: form.meal_plan as RatePlan['meal_plan'],
          description: form.description || null,
          is_derived: form.is_derived,
          parent_rate_plan_id: form.is_derived && form.parent_rate_plan_id ? form.parent_rate_plan_id : null,
          is_public: form.is_public,
          is_active: form.is_active,
        })
      } else {
        await createRatePlan({
          entity_id: property!.id,
          name: form.name,
          code: form.code || null,
          rate_type: form.rate_type as RatePlan['rate_type'],
          meal_plan: form.meal_plan as RatePlan['meal_plan'],
          description: form.description || null,
          is_derived: form.is_derived,
          parent_rate_plan_id: form.is_derived && form.parent_rate_plan_id ? form.parent_rate_plan_id : null,
          is_public: form.is_public,
          is_active: form.is_active,
        })
      }
      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Modifica piano tariffario' : 'Nuovo piano tariffario'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nome *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="es. Tariffa Flessibile"
          />
          <Input
            label="Codice"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="es. FLEX"
            maxLength={10}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Tipo tariffa"
            options={rateTypeOptions}
            value={form.rate_type}
            onChange={(e) => setForm({ ...form, rate_type: e.target.value })}
          />
          <Select
            label="Trattamento"
            options={mealPlanOptions}
            value={form.meal_plan}
            onChange={(e) => setForm({ ...form, meal_plan: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Descrizione</label>
          <textarea
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descrizione del piano tariffario..."
          />
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_derived}
              onChange={(e) => setForm({ ...form, is_derived: e.target.checked })}
              className="rounded border-gray-300"
            />
            Piano derivato da un altro
          </label>

          {form.is_derived && (
            <Select
              label="Piano tariffario padre"
              options={parentPlanOptions}
              value={form.parent_rate_plan_id}
              onChange={(e) => setForm({ ...form, parent_rate_plan_id: e.target.value })}
              placeholder="Seleziona piano padre..."
            />
          )}
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_public}
              onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
              className="rounded border-gray-300"
            />
            Visibile nel booking engine
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded border-gray-300"
            />
            Attivo
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Annulla
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Salva modifiche' : 'Crea piano'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
