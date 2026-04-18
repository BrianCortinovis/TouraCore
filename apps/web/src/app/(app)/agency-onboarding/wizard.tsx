'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createAgencyOnboardingAction, type OnboardingInput } from './actions'

interface WizardProps {
  userEmail: string
}

export function OnboardingWizard({ userEmail }: WizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<OnboardingInput>({
    name: '',
    slug: '',
    legalName: '',
    billingEmail: userEmail,
    vatId: '',
    country: 'IT',
    brandingColor: '#4f46e5',
    brandingLogoUrl: '',
    plan: 'agency_pro',
  })

  function update<K extends keyof OnboardingInput>(k: K, v: OnboardingInput[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function submit() {
    setError(null)
    startTransition(async () => {
      const res = await createAgencyOnboardingAction(form)
      if (!res.ok) {
        setError(res.error ?? 'unknown_error')
        return
      }
      if (res.stripeOnboardingUrl) {
        window.location.href = res.stripeOnboardingUrl
      } else {
        router.push(`/a/${res.agencySlug}`)
      }
    })
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`h-1 flex-1 rounded-full ${n <= step ? 'bg-indigo-600' : 'bg-slate-200'}`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Step 1 · Nome agenzia</h2>
          <label className="block text-sm">
            <span className="text-slate-700">Nome</span>
            <input
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              value={form.name}
              onChange={(e) => {
                update('name', e.target.value)
                if (!form.slug) update('slug', e.target.value)
              }}
              placeholder="Demo Travel Agency"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-700">Slug (URL)</span>
            <input
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              value={form.slug}
              onChange={(e) => update('slug', e.target.value)}
              placeholder="demo-travel"
            />
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Step 2 · Dati legali</h2>
          <label className="block text-sm">
            <span className="text-slate-700">Ragione sociale</span>
            <input
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              value={form.legalName}
              onChange={(e) => update('legalName', e.target.value)}
              placeholder="Demo Travel Agency SRL"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-700">P.IVA / VAT</span>
            <input
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              value={form.vatId}
              onChange={(e) => update('vatId', e.target.value)}
              placeholder="IT12345678901"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-700">Email fatturazione</span>
            <input
              type="email"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              value={form.billingEmail}
              onChange={(e) => update('billingEmail', e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-700">Paese</span>
            <select
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              value={form.country}
              onChange={(e) => update('country', e.target.value)}
            >
              <option value="IT">Italia</option>
              <option value="FR">Francia</option>
              <option value="DE">Germania</option>
              <option value="ES">Spagna</option>
            </select>
          </label>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Step 3 · Piano</h2>
          <div className="grid grid-cols-1 gap-2">
            {(['agency_starter', 'agency_pro', 'agency_enterprise'] as const).map((p) => (
              <label
                key={p}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${
                  form.plan === p ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="plan"
                  checked={form.plan === p}
                  onChange={() => update('plan', p)}
                />
                <div>
                  <p className="font-semibold capitalize">{p.replace('agency_', '')}</p>
                  <p className="text-xs text-slate-500">
                    {p === 'agency_starter'
                      ? '€99/mo · 3 clienti · 10% commissioni'
                      : p === 'agency_pro'
                        ? '€299/mo · 10 clienti · 12% commissioni'
                        : '€999/mo · illimitati · 15% commissioni'}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Step 4 · Branding + Stripe</h2>
          <label className="block text-sm">
            <span className="text-slate-700">Colore primario</span>
            <input
              type="color"
              className="mt-1 h-10 w-24 rounded border border-slate-300"
              value={form.brandingColor}
              onChange={(e) => update('brandingColor', e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-700">Logo URL (opzionale)</span>
            <input
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              value={form.brandingLogoUrl}
              onChange={(e) => update('brandingLogoUrl', e.target.value)}
              placeholder="https://..."
            />
          </label>
          <p className="rounded bg-slate-50 p-3 text-xs text-slate-600">
            Alla submit creeremo l&apos;agenzia e avvieremo Stripe Connect Express (se configurato).
            Altrimenti vai diretto al dashboard.
          </p>
        </div>
      )}

      {error && (
        <p className="rounded bg-rose-50 p-2 text-sm text-rose-700">Errore: {error}</p>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          className="rounded border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1 || pending}
        >
          Indietro
        </button>
        {step < 4 ? (
          <button
            type="button"
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            onClick={() => setStep((s) => s + 1)}
            disabled={(step === 1 && (!form.name || !form.slug)) || (step === 2 && (!form.legalName || !form.billingEmail))}
          >
            Avanti
          </button>
        ) : (
          <button
            type="button"
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            onClick={submit}
            disabled={pending}
          >
            {pending ? 'Creazione…' : 'Crea agenzia'}
          </button>
        )}
      </div>
    </div>
  )
}
