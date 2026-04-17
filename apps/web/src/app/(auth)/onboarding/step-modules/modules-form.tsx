'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@touracore/ui'
import { selectModulesAction } from '../actions'

type ModuleCode =
  | 'hospitality'
  | 'restaurant'
  | 'wellness'
  | 'experiences'
  | 'bike_rental'
  | 'moto_rental'
  | 'ski_school'

interface CatalogEntry {
  code: ModuleCode
  label: string
  description: string | null
  icon: string | null
  base_price_eur: number
  entity_kind: string | null
  order_idx: number
  pausable: boolean
}

interface Bundle {
  min_modules: number
  discount_percent: number
}

interface Props {
  catalog: CatalogEntry[]
  bundles: Bundle[]
}

const MODULE_EMOJI: Record<ModuleCode, string> = {
  hospitality: '🏨',
  restaurant: '🍽️',
  wellness: '💆',
  experiences: '🗺️',
  bike_rental: '🚴',
  moto_rental: '🏍️',
  ski_school: '⛷️',
}

export default function ModulesForm({ catalog, bundles }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<ModuleCode>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggle(code: ModuleCode) {
    const next = new Set(selected)
    if (next.has(code)) next.delete(code)
    else next.add(code)
    setSelected(next)
  }

  const priceSummary = useMemo(() => {
    const selectedList = Array.from(selected)
    const subtotal = selectedList.reduce((sum, code) => {
      const entry = catalog.find((c) => c.code === code)
      return sum + Number(entry?.base_price_eur ?? 0)
    }, 0)
    const count = selectedList.length
    const applicableBundles = bundles.filter((b) => count >= b.min_modules)
    const discountPercent =
      applicableBundles.length > 0
        ? Math.max(...applicableBundles.map((b) => b.discount_percent))
        : 0
    const discountAmount = +(subtotal * (discountPercent / 100)).toFixed(2)
    const total = +(subtotal - discountAmount).toFixed(2)
    return { subtotal, discountPercent, discountAmount, total, count }
  }, [selected, catalog, bundles])

  async function handleSubmit() {
    if (selected.size === 0) {
      setError('Seleziona almeno un modulo per continuare.')
      return
    }
    setLoading(true)
    setError('')
    const result = await selectModulesAction({ modules: Array.from(selected) })
    if (result.success) {
      router.push('/onboarding/step-plan')
    } else {
      setError(result.error ?? 'Errore durante il salvataggio.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-12">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
            <span className="text-3xl font-bold text-white">T</span>
          </div>
          <h1 className="text-4xl font-bold text-white">Moduli</h1>
          <p className="mt-3 text-lg text-blue-100">Scegli cosa vuoi gestire</p>
          <div className="mt-8 space-y-3 text-left text-sm text-blue-200">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-300" />
              Configurazione iniziale
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-300" />
              Dati della tua attività
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-300" />
              Seleziona i moduli
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400/50" />
              Piano e pagamento
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400/50" />
              Prima struttura
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full items-start justify-center overflow-y-auto p-8 lg:w-1/2">
        <div className="w-full max-w-2xl">
          <div className="mb-6">
            <p className="text-xs font-medium uppercase text-gray-400">Passo 3 di 5</p>
            <h2 className="mt-1 text-2xl font-bold text-gray-900">Cosa vuoi gestire?</h2>
            <p className="mt-2 text-sm text-gray-500">
              Seleziona uno o più moduli. Puoi aggiungerli/rimuoverli successivamente.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {catalog.map((m) => {
              const isSelected = selected.has(m.code)
              return (
                <button
                  key={m.code}
                  type="button"
                  onClick={() => toggle(m.code)}
                  className={`relative flex flex-col rounded-lg border-2 p-4 text-left transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{MODULE_EMOJI[m.code]}</span>
                      <span className="font-semibold text-gray-900">{m.label}</span>
                    </div>
                    {isSelected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                        ✓
                      </span>
                    )}
                  </div>
                  {m.description && (
                    <p className="text-xs text-gray-500">{m.description}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      €{Number(m.base_price_eur).toFixed(0)}/mese
                    </span>
                    {m.pausable && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        Pausabile stagionale
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {selected.size > 0 && (
            <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {priceSummary.count} modul{priceSummary.count === 1 ? 'o' : 'i'} selezionat
                  {priceSummary.count === 1 ? 'o' : 'i'}
                </span>
                <span className="font-medium text-gray-900">
                  €{priceSummary.subtotal.toFixed(2)}
                </span>
              </div>
              {priceSummary.discountPercent > 0 && (
                <div className="mt-1 flex items-center justify-between text-sm text-green-700">
                  <span>Sconto bundle ({priceSummary.discountPercent}%)</span>
                  <span>-€{priceSummary.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
                <span>Totale stimato</span>
                <span>€{priceSummary.total.toFixed(2)}/mese</span>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Prova gratuita 14 giorni. Nessun addebito ora.
              </p>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Indietro
            </button>
            <Button
              onClick={handleSubmit}
              isLoading={loading}
              disabled={selected.size === 0}
              size="lg"
            >
              Continua
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
