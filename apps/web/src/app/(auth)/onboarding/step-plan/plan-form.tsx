'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@touracore/ui'
import { confirmPlanAction } from '../actions'

interface ModuleEntry {
  code: string
  label: string
  base_price_eur: number
}

interface Bundle {
  min_modules: number
  discount_percent: number
}

interface Props {
  selectedModules: ModuleEntry[]
  bundles: Bundle[]
}

export default function PlanForm({ selectedModules, bundles }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<'trial' | 'paid_now'>('trial')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const pricing = useMemo(() => {
    const subtotal = selectedModules.reduce((s, m) => s + Number(m.base_price_eur), 0)
    const applicable = bundles.filter((b) => selectedModules.length >= b.min_modules)
    const discountPercent =
      applicable.length > 0 ? Math.max(...applicable.map((b) => b.discount_percent)) : 0
    const discountAmount = +(subtotal * (discountPercent / 100)).toFixed(2)
    const total = +(subtotal - discountAmount).toFixed(2)
    return { subtotal, discountPercent, discountAmount, total }
  }, [selectedModules, bundles])

  async function handleSubmit() {
    setLoading(true)
    setError('')
    const result = await confirmPlanAction({ mode, trial_days: mode === 'trial' ? 14 : 0 })
    if (result.success) {
      router.push('/onboarding/step-3')
    } else {
      setError(result.error ?? 'Errore durante l\'attivazione del piano.')
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
          <h1 className="text-4xl font-bold text-white">Piano</h1>
          <p className="mt-3 text-lg text-blue-100">Scegli come iniziare</p>
        </div>
      </div>

      <div className="flex w-full items-start justify-center overflow-y-auto p-8 lg:w-1/2">
        <div className="w-full max-w-xl">
          <div className="mb-6">
            <p className="text-xs font-medium uppercase text-gray-400">Passo 4 di 5</p>
            <h2 className="mt-1 text-2xl font-bold text-gray-900">Come vuoi iniziare?</h2>
            <p className="mt-2 text-sm text-gray-500">
              Puoi iniziare con una prova gratuita o attivare subito. In entrambi i casi puoi
              disdire quando vuoi.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="mb-3 text-xs font-medium uppercase text-gray-500">Riepilogo moduli</p>
            {selectedModules.map((m) => (
              <div key={m.code} className="flex items-center justify-between py-1 text-sm">
                <span className="text-gray-700">{m.label}</span>
                <span className="font-medium text-gray-900">€{Number(m.base_price_eur).toFixed(2)}</span>
              </div>
            ))}
            {pricing.discountPercent > 0 && (
              <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2 text-sm text-green-700">
                <span>Sconto bundle ({pricing.discountPercent}%)</span>
                <span>-€{pricing.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
              <span>Totale</span>
              <span>€{pricing.total.toFixed(2)}/mese</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode('trial')}
              className={`rounded-lg border-2 p-4 text-left transition-all ${
                mode === 'trial'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold text-gray-900">Prova gratuita</span>
                {mode === 'trial' && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                    ✓
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                14 giorni gratis. Nessun addebito ora. Aggiungi la carta prima della scadenza.
              </p>
              <p className="mt-2 text-sm font-medium text-green-700">€0 oggi</p>
            </button>

            <button
              type="button"
              onClick={() => setMode('paid_now')}
              className={`rounded-lg border-2 p-4 text-left transition-all ${
                mode === 'paid_now'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold text-gray-900">Paga subito</span>
                {mode === 'paid_now' && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                    ✓
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Attivazione immediata, fatturazione da oggi. Addebito ricorrente mensile.
              </p>
              <p className="mt-2 text-sm font-medium text-gray-900">
                €{pricing.total.toFixed(2)} oggi
              </p>
            </button>
          </div>

          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <strong>MVP:</strong> Al momento i moduli vengono attivati direttamente in modalità prova.
            L&apos;integrazione Stripe (carta + checkout) sarà disponibile nella prossima release.
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Indietro
            </button>
            <Button onClick={handleSubmit} isLoading={loading} size="lg">
              {mode === 'trial' ? 'Inizia prova gratuita' : 'Attiva ora'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
