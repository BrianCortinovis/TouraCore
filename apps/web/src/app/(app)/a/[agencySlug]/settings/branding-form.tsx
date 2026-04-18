'use client'

import { useState, useTransition } from 'react'
import { updateBrandingAction } from './actions'

interface Props {
  agencySlug: string
  initialColor: string
  initialLogoUrl: string
  initialDomain: string
  initialLegalName: string
  initialBillingEmail: string
  canWrite: boolean
}

export function BrandingForm({
  agencySlug,
  initialColor,
  initialLogoUrl,
  initialDomain,
  initialLegalName,
  initialBillingEmail,
  canWrite,
}: Props) {
  const [color, setColor] = useState(initialColor)
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl)
  const [domain, setDomain] = useState(initialDomain)
  const [legalName, setLegalName] = useState(initialLegalName)
  const [billingEmail, setBillingEmail] = useState(initialBillingEmail)
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function save() {
    setMsg(null)
    start(async () => {
      const res = await updateBrandingAction({ agencySlug, color, logoUrl, domain, legalName, billingEmail })
      setMsg(res.ok ? 'Salvato.' : `Errore: ${res.error}`)
    })
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="text-slate-600">Colore primario</span>
          <input
            type="color"
            disabled={!canWrite}
            className="mt-1 h-10 w-24 rounded border border-slate-300"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Logo URL</span>
          <input
            type="url"
            disabled={!canWrite}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://cdn.example/logo.svg"
          />
        </label>
        <label className="text-sm md:col-span-2">
          <span className="text-slate-600">Dominio white-label (CNAME)</span>
          <input
            disabled={!canWrite}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="book.miaagenzia.it"
          />
          <p className="mt-1 text-xs text-slate-500">
            Punta il CNAME a cname.touracore.app. SSL auto via Vercel.
          </p>
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Ragione sociale</span>
          <input
            disabled={!canWrite}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Email fatturazione</span>
          <input
            type="email"
            disabled={!canWrite}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={billingEmail}
            onChange={(e) => setBillingEmail(e.target.value)}
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending || !canWrite}
          onClick={save}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? '…' : 'Salva'}
        </button>
        {msg && <p className="text-xs text-slate-600">{msg}</p>}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs uppercase text-slate-400">Preview</p>
        <div className="mt-2 flex items-center gap-3 rounded-lg p-4" style={{ backgroundColor: color, color: '#fff' }}>
          {logoUrl && <img src={logoUrl} alt="logo" className="h-8 w-auto" />}
          <span className="font-semibold">Example CTA · Prenota ora</span>
        </div>
      </div>
    </div>
  )
}
