'use client'

import { useState } from 'react'

const STEPS = ['Scelta prodotto', 'Data e slot', 'Partecipanti', 'Extra', 'Dati contatto', 'Riepilogo e pagamento']

export function ExperienceBookingEngineAdmin({ slug }: { slug: string }) {
  const [stepIdx, setStepIdx] = useState(0)
  const src = `/book/experience/${slug}?preview_step=${stepIdx}&t=${Date.now()}`

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <button
          type="button"
          onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
          disabled={stepIdx === 0}
          className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium disabled:opacity-40"
        >
          ← Indietro
        </button>
        <span className="text-xs font-medium text-slate-700">
          Scheda {stepIdx + 1} di {STEPS.length}: {STEPS[stepIdx]}
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
        key={stepIdx}
        src={src}
        style={{ width: '100%', minHeight: 720, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}
        title={`Experience preview · step ${stepIdx}`}
      />
    </div>
  )
}
