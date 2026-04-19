'use client'

import { useState } from 'react'

const STEPS = ['slot', 'guest', 'deposit', 'success'] as const
type Step = typeof STEPS[number]
const LABELS: Record<Step, string> = {
  slot: 'Selezione slot',
  guest: 'Dati cliente',
  deposit: 'Deposito',
  success: 'Conferma',
}

const TEMPLATES: { id: 'minimal' | 'luxury' | 'mobile'; label: string }[] = [
  { id: 'minimal', label: 'Minimal' },
  { id: 'luxury', label: 'Luxury' },
  { id: 'mobile', label: 'Mobile' },
]

export function RestaurantBookingEngineAdmin({ slug }: { slug: string }) {
  const [template, setTemplate] = useState<'minimal' | 'luxury' | 'mobile'>('minimal')
  const [stepIdx, setStepIdx] = useState(0)
  const step = STEPS[stepIdx] ?? 'slot'
  const src = `/embed-table/${slug}?template=${template}&preview_step=${step}&t=${Date.now()}`

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-1 rounded-md bg-slate-100 p-1">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplate(t.id)}
              className={`rounded px-2.5 py-1 text-xs font-medium ${
                template === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
            disabled={stepIdx === 0}
            className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium disabled:opacity-40"
          >
            ← Indietro
          </button>
          <span className="text-xs font-medium text-slate-700">
            Scheda {stepIdx + 1} di {STEPS.length}: {LABELS[step]}
          </span>
          <button
            type="button"
            onClick={() => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1))}
            disabled={stepIdx === STEPS.length - 1}
            className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
          >
            Avanti →
          </button>
        </div>
      </div>
      <div className="flex gap-1">
        {STEPS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setStepIdx(i)}
            className={`h-1.5 flex-1 rounded-full transition ${i === stepIdx ? 'bg-blue-600' : 'bg-slate-300 hover:bg-slate-400'}`}
            aria-label={`Vai a scheda ${i + 1}`}
          />
        ))}
      </div>
      <iframe
        key={`${template}-${step}`}
        src={src}
        style={{ width: '100%', minHeight: 720, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}
        title={`Book table preview · ${template} · ${step}`}
      />
    </div>
  )
}
