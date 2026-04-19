'use client'

import { useState, useTransition } from 'react'
import { saveAgencyProviderAction } from './actions'

const PROVIDERS = ['resend', 'mailgun', 'twilio_sms', 'twilio_wa', 'meta_wa'] as const

export function AgencyProviderForm({ agencyId, agencySlug }: { agencyId: string; agencySlug: string }) {
  const [provider, setProvider] = useState<(typeof PROVIDERS)[number]>('resend')
  const [config, setConfig] = useState<Record<string, string>>({})
  const [fromEmail, setFromEmail] = useState('')
  const [fromName, setFromName] = useState('')
  const [fromPhone, setFromPhone] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const channel = provider === 'resend' || provider === 'mailgun' ? 'email' : provider === 'twilio_sms' ? 'sms' : 'whatsapp'

  const fields: Array<{ key: string; label: string }> =
    provider === 'resend' ? [{ key: 'apiKey', label: 'API Key' }, { key: 'defaultFrom', label: 'Default From' }]
      : provider === 'mailgun' ? [{ key: 'apiKey', label: 'API Key' }, { key: 'domain', label: 'Domain' }, { key: 'region', label: 'Region (us|eu)' }]
      : provider === 'twilio_sms' || provider === 'twilio_wa' ? [{ key: 'accountSid', label: 'Account SID' }, { key: 'authToken', label: 'Auth Token' }, { key: 'fromNumber', label: 'From Number' }]
      : [{ key: 'phoneNumberId', label: 'Phone Number ID' }, { key: 'accessToken', label: 'Access Token' }]

  function submit() {
    setMsg(null)
    start(async () => {
      const res = await saveAgencyProviderAction({
        agencyId,
        agencySlug,
        provider,
        channel: channel as 'email' | 'sms' | 'whatsapp',
        config,
        fromEmail: fromEmail || null,
        fromName: fromName || null,
        fromPhone: fromPhone || null,
      })
      setMsg(res.ok ? 'Salvato.' : `Errore: ${res.error}`)
      if (res.ok) setConfig({})
    })
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Aggiungi provider agency</h2>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="text-sm">
          <span className="text-slate-600">Provider</span>
          <select value={provider} onChange={(e) => { setProvider(e.target.value as typeof provider); setConfig({}) }} className="mt-1 w-full rounded border border-slate-300 px-3 py-2">
            {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        {fields.map((f) => (
          <label key={f.key} className="text-sm">
            <span className="text-slate-600">{f.label}</span>
            <input
              type={f.key.toLowerCase().includes('token') || f.key.toLowerCase().includes('key') ? 'password' : 'text'}
              value={config[f.key] ?? ''}
              onChange={(e) => setConfig((c) => ({ ...c, [f.key]: e.target.value }))}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-mono text-xs"
            />
          </label>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        {channel === 'email' && (
          <>
            <label className="text-sm">
              <span className="text-slate-600">From email</span>
              <input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" placeholder="hello@agency.com" />
            </label>
            <label className="text-sm">
              <span className="text-slate-600">From name</span>
              <input value={fromName} onChange={(e) => setFromName(e.target.value)} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" placeholder="Agency Name" />
            </label>
          </>
        )}
        {(channel === 'sms' || channel === 'whatsapp') && (
          <label className="text-sm">
            <span className="text-slate-600">From phone</span>
            <input value={fromPhone} onChange={(e) => setFromPhone(e.target.value)} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" placeholder="+14155..." />
          </label>
        )}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" disabled={pending} onClick={submit} className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? '…' : 'Salva'}
        </button>
        {msg && <p className="text-xs text-slate-600">{msg}</p>}
      </div>
    </div>
  )
}
