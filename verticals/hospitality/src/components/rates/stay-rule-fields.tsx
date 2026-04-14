'use client'
import { Button, Input } from '@touracore/ui'
import { WEEKDAY_OPTIONS, type StayDiscountRule } from '../../lib/rates/stay-rules'

interface WeekdaySelectorProps {
  label: string
  value: number[]
  onChange: (days: number[]) => void
  helper?: string
}

interface StayDiscountEditorProps {
  value: StayDiscountRule[]
  onChange: (discounts: StayDiscountRule[]) => void
}

function toggleDay(current: number[], day: number) {
  return current.includes(day)
    ? current.filter((item) => item !== day)
    : [...current, day]
}

export function WeekdaySelector({ label, value, onChange, helper }: WeekdaySelectorProps) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {helper ? <p className="text-xs text-gray-500">{helper}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {WEEKDAY_OPTIONS.map((day) => {
          const selected = value.includes(day.value)
          return (
            <button
              key={day.value}
              type="button"
              onClick={() => onChange(toggleDay(value, day.value))}
              className={selected
                ? 'rounded-lg border border-blue-600 bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white'
                : 'rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-400'}
            >
              {day.shortLabel}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function StayDiscountEditor({ value, onChange }: StayDiscountEditorProps) {
  const updateRow = (index: number, next: StayDiscountRule) => {
    const updated = [...value]
    updated[index] = next
    onChange(updated)
  }

  const removeRow = (index: number) => {
    onChange(value.filter((_, currentIndex) => currentIndex !== index))
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-gray-700">Sconti soggiorno lungo</p>
        <p className="text-xs text-gray-500">
          Imposta soglie tipo 7, 14 o 28 notti con sconto percentuale o fisso.
        </p>
      </div>

      <div className="space-y-3">
        {value.map((discount, index) => (
          <div key={`${discount.min_nights}-${index}`} className="grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 md:grid-cols-[110px_150px_120px_1fr_auto]">
            <Input
              label="Da notti"
              type="number"
              min={2}
              value={discount.min_nights}
              onChange={(event) => updateRow(index, {
                ...discount,
                min_nights: parseInt(event.target.value, 10) || 2,
              })}
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Tipo</label>
              <select
                value={discount.discount_type}
                onChange={(event) => updateRow(index, {
                  ...discount,
                  discount_type: event.target.value === 'fixed' ? 'fixed' : 'percentage',
                })}
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="percentage">Percentuale</option>
                <option value="fixed">Importo fisso</option>
              </select>
            </div>
            <Input
              label={discount.discount_type === 'percentage' ? 'Valore %' : 'Valore EUR'}
              type="number"
              min={0}
              step="0.01"
              value={discount.discount_value}
              onChange={(event) => updateRow(index, {
                ...discount,
                discount_value: parseFloat(event.target.value) || 0,
              })}
            />
            <Input
              label="Etichetta"
              value={discount.label ?? ''}
              onChange={(event) => updateRow(index, {
                ...discount,
                label: event.target.value || undefined,
              })}
              placeholder="Es. Sconto 2 settimane"
            />
            <div className="flex items-end">
              <Button type="button" variant="outline" onClick={() => removeRow(index)}>
                Rimuovi
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => onChange([
          ...value,
          { min_nights: value[value.length - 1]?.min_nights ? (value[value.length - 1]?.min_nights ?? 0) + 7 : 7, discount_type: 'percentage', discount_value: 5 },
        ])}
      >
        Aggiungi sconto
      </Button>
    </div>
  )
}
