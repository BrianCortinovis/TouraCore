'use client'

import { useState, useTransition } from 'react'
import { sendBroadcastAction } from './actions'

interface Props {
  agencySlug: string
  totalClients: number
}

export function BroadcastComposer({ agencySlug, totalClients }: Props) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [channel, setChannel] = useState<'email' | 'sms' | 'whatsapp'>('email')
  const [billingMode, setBillingMode] = useState<'' | 'client_direct' | 'agency_covered'>('')
  const [moduleFilter, setModuleFilter] = useState<string>('')
  const [onlyActive, setOnlyActive] = useState(true)
  const [result, setResult] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit() {
    setResult(null)
    start(async () => {
      const res = await sendBroadcastAction({
        agencySlug,
        subject,
        body,
        channel,
        filter: {
          billingMode: billingMode || null,
          module: moduleFilter || null,
          onlyActive,
        },
      })
      if (res.ok) {
        setResult(`Inviato a ${res.recipients} destinatari.`)
        setSubject('')
        setBody('')
      } else {
        setResult(`Errore: ${res.error}`)
      }
    })
  }

  const canSend = subject.trim().length >= 3 && body.trim().length >= 10 && !pending

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold">Componi avviso</h2>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="text-sm md:col-span-2">
          <span className="text-slate-600">Oggetto</span>
          <input
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Aggiornamento importante sul servizio"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Canale</span>
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={channel}
            onChange={(e) => setChannel(e.target.value as typeof channel)}
          >
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </label>
      </div>

      <label className="mt-3 block text-sm">
        <span className="text-slate-600">Messaggio (HTML consentito)</span>
        <textarea
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="<p>Ciao, ecco l'aggiornamento…</p>"
        />
      </label>

      <fieldset className="mt-4 rounded border border-slate-200 bg-slate-50 p-3">
        <legend className="px-1 text-xs font-semibold text-slate-600">Filtra destinatari</legend>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <label className="text-xs">
            <span className="text-slate-600">Fatturazione</span>
            <select
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              value={billingMode}
              onChange={(e) => setBillingMode(e.target.value as typeof billingMode)}
            >
              <option value="">Tutti</option>
              <option value="client_direct">Solo chi paga direttamente</option>
              <option value="agency_covered">Solo chi paga l&apos;agenzia</option>
            </select>
          </label>
          <label className="text-xs">
            <span className="text-slate-600">Modulo attivo</span>
            <select
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
            >
              <option value="">Qualsiasi</option>
              <option value="hospitality">Struttura ricettiva</option>
              <option value="restaurant">Ristorazione</option>
              <option value="experiences">Esperienze</option>
              <option value="bike_rental">Noleggio bike</option>
              <option value="moto_rental">Noleggio moto</option>
              <option value="wellness">Wellness</option>
              <option value="ski_school">Scuola sci</option>
            </select>
          </label>
          <label className="flex items-end gap-2 text-xs">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => setOnlyActive(e.target.checked)}
              className="h-4 w-4"
            />
            <span>Solo clienti attivi</span>
          </label>
        </div>
      </fieldset>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Invio stimato a max {totalClients} clienti (filtri applicati ridurranno).
        </p>
        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? 'Invio…' : 'Invia ora'}
        </button>
      </div>

      {result && (
        <p className={`mt-2 text-xs ${result.startsWith('Errore') ? 'text-rose-700' : 'text-emerald-700'}`}>
          {result}
        </p>
      )}
    </section>
  )
}
