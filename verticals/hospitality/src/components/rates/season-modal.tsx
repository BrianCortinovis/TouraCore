'use client'
import { Button, Input, Modal } from '@touracore/ui'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '../../stores/auth-store'
import { createSeason, updateSeason } from '../../actions/rates'
import { StayDiscountEditor, WeekdaySelector } from './stay-rule-fields'
import { stayDiscountsToJson, validateAllowedWeekdays, validateStayDiscounts, type StayDiscountRule } from '../../lib/rates/stay-rules'
import { Loader2 } from 'lucide-react'
import type { Season } from '../../types/database'

interface SeasonModalProps {
  isOpen: boolean
  onClose: () => void
  season?: Season
}

export function SeasonModal({ isOpen, onClose, season }: SeasonModalProps) {
  const router = useRouter()
  const { property } = useAuthStore()
  const isEditing = !!season

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    color: '#3b82f6',
    date_from: '',
    date_to: '',
    price_modifier: 1.0,
    min_stay: 1,
    max_stay: '',
    allowed_arrival_days: [] as number[],
    allowed_departure_days: [] as number[],
    stay_discounts: [] as StayDiscountRule[],
  })

  useEffect(() => {
    if (isOpen) {
      setError(null)
      if (season) {
        setForm({
          name: season.name,
          color: season.color,
          date_from: season.date_from,
          date_to: season.date_to,
          price_modifier: season.price_modifier,
          min_stay: season.min_stay,
          max_stay: season.max_stay?.toString() ?? '',
          allowed_arrival_days: season.allowed_arrival_days ?? [],
          allowed_departure_days: season.allowed_departure_days ?? [],
          stay_discounts: season.stay_discounts ?? [],
        })
      } else {
        setForm({
          name: '',
          color: '#3b82f6',
          date_from: '',
          date_to: '',
          price_modifier: 1.0,
          min_stay: 1,
          max_stay: '',
          allowed_arrival_days: [],
          allowed_departure_days: [],
          stay_discounts: [],
        })
      }
    }
  }, [isOpen, season])

  const modifierPercentage = Math.round((form.price_modifier - 1) * 100)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Il nome è obbligatorio')
      return
    }
    if (!form.date_from || !form.date_to) {
      setError('Le date sono obbligatorie')
      return
    }
    if (form.date_from >= form.date_to) {
      setError('La data di inizio deve essere precedente alla data di fine')
      return
    }
    const parsedMaxStay = form.max_stay ? parseInt(form.max_stay, 10) : null
    if (parsedMaxStay !== null && parsedMaxStay < form.min_stay) {
      setError('Il soggiorno massimo deve essere uguale o superiore al minimo')
      return
    }
    try {
      validateAllowedWeekdays(form.allowed_arrival_days, 'Giorni di arrivo')
      validateAllowedWeekdays(form.allowed_departure_days, 'Giorni di partenza')
      validateStayDiscounts(form.stay_discounts)
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : 'Regole soggiorno non valide')
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (isEditing) {
        await updateSeason(season.id, {
          name: form.name,
          color: form.color,
          date_from: form.date_from,
          date_to: form.date_to,
          price_modifier: form.price_modifier,
          min_stay: form.min_stay,
          max_stay: parsedMaxStay,
          allowed_arrival_days: form.allowed_arrival_days,
          allowed_departure_days: form.allowed_departure_days,
          stay_discounts: stayDiscountsToJson(form.stay_discounts),
        })
      } else {
        await createSeason({
          entity_id: property!.id,
          name: form.name,
          color: form.color,
          date_from: form.date_from,
          date_to: form.date_to,
          price_modifier: form.price_modifier,
          min_stay: form.min_stay,
          max_stay: parsedMaxStay,
          allowed_arrival_days: form.allowed_arrival_days,
          allowed_departure_days: form.allowed_departure_days,
          stay_discounts: stayDiscountsToJson(form.stay_discounts),
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
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Modifica stagione' : 'Nuova stagione'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <div className="grid grid-cols-[1fr_80px] gap-4">
          <Input
            label="Nome *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="es. Alta Stagione"
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Colore</label>
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="h-10 w-full cursor-pointer rounded-lg border border-gray-300"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Data inizio *"
            type="date"
            value={form.date_from}
            onChange={(e) => setForm({ ...form, date_from: e.target.value })}
          />
          <Input
            label="Data fine *"
            type="date"
            value={form.date_to}
            onChange={(e) => setForm({ ...form, date_to: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <Input
              label="Moltiplicatore prezzo"
              type="number"
              step="0.01"
              min="0.1"
              max="10"
              value={form.price_modifier}
              onChange={(e) => setForm({ ...form, price_modifier: parseFloat(e.target.value) || 1.0 })}
            />
            <p className="text-xs text-gray-500">
              {modifierPercentage > 0 && <span className="text-red-600">+{modifierPercentage}% sul prezzo base</span>}
              {modifierPercentage < 0 && <span className="text-green-600">{modifierPercentage}% sul prezzo base</span>}
              {modifierPercentage === 0 && <span>Prezzo base invariato</span>}
            </p>
          </div>
          <Input
            label="Soggiorno minimo (notti)"
            type="number"
            min={1}
            value={form.min_stay}
            onChange={(e) => setForm({ ...form, min_stay: parseInt(e.target.value) || 1 })}
          />
          <Input
            label="Soggiorno massimo (notti)"
            type="number"
            min={1}
            value={form.max_stay}
            onChange={(e) => setForm({ ...form, max_stay: e.target.value })}
            placeholder="Illimitato"
          />
        </div>

        <div className="space-y-4 rounded-lg border border-gray-200 p-4">
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-gray-700">Preset arrivo/partenza</p>
              <p className="text-xs text-gray-500">
                Per esempio puoi fare solo sabato-sabato o domenica-domenica come nei PMS professionali.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Libero', arrival: [] as number[], departure: [] as number[] },
                { label: 'Sab-Sab', arrival: [6], departure: [6] },
                { label: 'Dom-Dom', arrival: [0], departure: [0] },
                { label: 'Ven-Ven', arrival: [5], departure: [5] },
                { label: 'Weekend', arrival: [5], departure: [0] },
              ].map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  onClick={() => setForm((current) => ({
                    ...current,
                    allowed_arrival_days: preset.arrival,
                    allowed_departure_days: preset.departure,
                  }))}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <WeekdaySelector
              label="Giorni consentiti di arrivo"
              helper="Se non selezioni nulla, l'arrivo resta libero."
              value={form.allowed_arrival_days}
              onChange={(days) => setForm((current) => ({ ...current, allowed_arrival_days: days }))}
            />
            <WeekdaySelector
              label="Giorni consentiti di partenza"
              helper="Se non selezioni nulla, la partenza resta libera."
              value={form.allowed_departure_days}
              onChange={(days) => setForm((current) => ({ ...current, allowed_departure_days: days }))}
            />
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <StayDiscountEditor
            value={form.stay_discounts}
            onChange={(discounts) => setForm((current) => ({ ...current, stay_discounts: discounts }))}
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Annulla
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Salva modifiche' : 'Crea stagione'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
