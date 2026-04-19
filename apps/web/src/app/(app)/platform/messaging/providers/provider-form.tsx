'use client'

import { useState, useTransition } from 'react'
import { saveProviderAction } from './actions'

const PROVIDER_FIELDS: Record<string, { channel: 'email' | 'sms' | 'whatsapp' | 'push' | 'slack'; fields: Array<{ key: string; label: string; type?: string; hint?: string }> }> = {
  resend: { channel: 'email', fields: [{ key: 'apiKey', label: 'API Key', hint: 're_xxxxx' }, { key: 'defaultFrom', label: 'Default From', hint: 'TouraCore <noreply@yourdomain>' }] },
  mailgun: { channel: 'email', fields: [{ key: 'apiKey', label: 'API Key' }, { key: 'domain', label: 'Domain' }, { key: 'region', label: 'Region (us|eu)' }] },
  sendgrid: { channel: 'email', fields: [{ key: 'apiKey', label: 'API Key' }] },
  twilio_sms: { channel: 'sms', fields: [{ key: 'accountSid', label: 'Account SID' }, { key: 'authToken', label: 'Auth Token' }, { key: 'fromNumber', label: 'From Number', hint: '+1415...' }] },
  twilio_wa: { channel: 'whatsapp', fields: [{ key: 'accountSid', label: 'Account SID' }, { key: 'authToken', label: 'Auth Token' }, { key: 'fromNumber', label: 'WhatsApp Number', hint: '+14155238886 (sandbox)' }] },
  meta_wa: { channel: 'whatsapp', fields: [{ key: 'phoneNumberId', label: 'Phone Number ID' }, { key: 'accessToken', label: 'Access Token' }, { key: 'defaultTemplate', label: 'Default template name' }, { key: 'defaultLang', label: 'Default lang (it/en)' }] },
  webpush: { channel: 'push', fields: [{ key: 'vapidPublicKey', label: 'VAPID Public Key' }, { key: 'vapidPrivateKey', label: 'VAPID Private Key' }, { key: 'subject', label: 'Subject (mailto: or https://)' }] },
  slack: { channel: 'slack', fields: [] },
}

export function ProviderForm({ scope, scopeId }: { scope: 'platform' | 'agency' | 'tenant'; scopeId: string | null }) {
  const [provider, setProvider] = useState<keyof typeof PROVIDER_FIELDS>('resend')
  const [config, setConfig] = useState<Record<string, string>>({})
  const [fromEmail, setFromEmail] = useState('')
  const [fromName, setFromName] = useState('')
  const [fromPhone, setFromPhone] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const fields = PROVIDER_FIELDS[provider]!

  function submit() {
    setMsg(null)
    start(async () => {
      const res = await saveProviderAction({
        scope,
        scopeId,
        provider: provider as import('@touracore/notifications').ProviderKey,
        channel: fields.channel,
        config,
        fromEmail: fromEmail || null,
        fromName: fromName || null,
        fromPhone: fromPhone || null,
      })
      if (res.ok) {
        setMsg('Provider salvato.')
        setConfig({})
      } else {
        setMsg(`Errore: ${res.error}`)
      }
    })
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Aggiungi/aggiorna provider</h2>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="text-sm">
          <span className="text-slate-600">Provider</span>
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={provider}
            onChange={(e) => { setProvider(e.target.value as keyof typeof PROVIDER_FIELDS); setConfig({}) }}
          >
            {Object.keys(PROVIDER_FIELDS).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Canale</span>
          <input disabled value={fields.channel} className="mt-1 w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs" />
        </label>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        {fields.fields.map((f) => (
          <label key={f.key} className="text-sm">
            <span className="text-slate-600">{f.label}</span>
            <input
              type={f.type ?? (f.key.toLowerCase().includes('token') || f.key.toLowerCase().includes('key') ? 'password' : 'text')}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-mono text-xs"
              value={config[f.key] ?? ''}
              onChange={(e) => setConfig((c) => ({ ...c, [f.key]: e.target.value }))}
              placeholder={f.hint}
            />
          </label>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        {fields.channel === 'email' && (
          <>
            <label className="text-sm">
              <span className="text-slate-600">From email</span>
              <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="noreply@yourdomain.com" />
            </label>
            <label className="text-sm">
              <span className="text-slate-600">From name</span>
              <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="TouraCore" />
            </label>
          </>
        )}
        {(fields.channel === 'sms' || fields.channel === 'whatsapp') && (
          <label className="text-sm">
            <span className="text-slate-600">From phone</span>
            <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={fromPhone} onChange={(e) => setFromPhone(e.target.value)} placeholder="+14155..." />
          </label>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? '…' : 'Salva provider'}
        </button>
        {msg && <p className="text-xs text-slate-600">{msg}</p>}
      </div>
    </div>
  )
}
