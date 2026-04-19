'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createAgencyOnboardingAction, type OnboardingInput } from './actions'

interface WizardProps {
  userEmail: string
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 48)
}

export function OnboardingWizard({ userEmail }: WizardProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [setupStripeNow, setSetupStripeNow] = useState(false)
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
      const res = await createAgencyOnboardingAction({
        ...form,
        legalName: form.legalName || form.name,
        setupStripeNow,
      })
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

  const canSubmit = form.name.trim().length >= 2 && form.slug.trim().length >= 3

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Nome e URL agenzia</h2>
        <label className="block text-sm">
          <span className="text-slate-700">Nome agenzia</span>
          <input
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={form.name}
            onChange={(e) => {
              update('name', e.target.value)
              if (!form.slug) update('slug', slugify(e.target.value))
            }}
            placeholder="Demo Travel Agency"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-700">Slug (URL)</span>
          <input
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={form.slug}
            onChange={(e) => update('slug', slugify(e.target.value))}
            placeholder="demo-travel"
          />
          <span className="mt-1 block text-xs text-slate-500">
            touracore.vercel.app/a/{form.slug || 'tuo-slug'}
          </span>
        </label>

        <details className="mt-4 rounded-lg border border-slate-200 p-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            Setup avanzato (opzionale — puoi farlo dopo)
          </summary>
          <div className="mt-3 space-y-3">
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
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={setupStripeNow}
                onChange={(e) => setSetupStripeNow(e.target.checked)}
              />
              <span className="text-slate-700">Setup Stripe Connect ora (altrimenti dopo da Settings)</span>
            </label>
          </div>
        </details>
      </div>

      {error && (
        <p className="rounded bg-rose-50 p-2 text-sm text-rose-700">Errore: {error}</p>
      )}

      <div className="flex items-center justify-end">
        <button
          type="button"
          className="rounded bg-indigo-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          onClick={submit}
          disabled={!canSubmit || pending}
        >
          {pending ? 'Creazione…' : 'Crea agenzia'}
        </button>
      </div>

      <p className="text-xs text-slate-500">
        Piano predefinito: Pro · €299/mo · 10 clienti · 12% commissioni. Modificabile da Settings.
      </p>
    </div>
  )
}
