'use client'

import { useState, useTransition } from 'react'
import { createClientInviteAction } from './actions'

type Vertical = 'hospitality' | 'restaurant' | 'wellness' | 'experiences' | 'bike_rental' | 'moto_rental' | 'ski_school'

export function InviteClientForm({ agencySlug }: { agencySlug: string }) {
  const [email, setEmail] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [vertical, setVertical] = useState<Vertical>('hospitality')
  const [billingMode, setBillingMode] = useState<'client_direct' | 'agency_covered'>('client_direct')
  const [managementMode, setManagementMode] = useState<'agency_managed' | 'self_service'>('self_service')
  const [msg, setMsg] = useState<string | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit() {
    setMsg(null)
    setInviteUrl(null)
    start(async () => {
      const res = await createClientInviteAction({
        agencySlug,
        email,
        tenantName: tenantName || undefined,
        verticalHint: vertical,
        billingMode,
        managementMode,
      })
      if (res.ok) {
        setMsg('Invito inviato via email al cliente.')
        setInviteUrl(res.inviteUrl ?? null)
        setEmail('')
        setTenantName('')
      } else {
        setMsg(`Errore: ${res.error}`)
      }
    })
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold">Invita nuovo cliente</h3>
      <p className="mt-1 text-xs text-slate-500">
        Genera link invito. Il cliente crea tenant con agency_id auto-associato.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
        <label className="text-sm md:col-span-2">
          <span className="text-slate-600">Email cliente</span>
          <input
            type="email"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cliente@example.com"
          />
        </label>
        <label className="text-sm md:col-span-2">
          <span className="text-slate-600">Nome tenant (suggerito)</span>
          <input
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
            placeholder="Hotel Example"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Vertical</span>
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={vertical}
            onChange={(e) => setVertical(e.target.value as Vertical)}
          >
            <option value="hospitality">Struttura ricettiva</option>
            <option value="restaurant">Ristorazione</option>
            <option value="bike_rental">Bike rental</option>
            <option value="moto_rental">Moto rental</option>
            <option value="experiences">Esperienze/Tour</option>
            <option value="wellness">Wellness/SPA</option>
            <option value="ski_school">Scuola sci</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Billing mode</span>
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={billingMode}
            onChange={(e) => setBillingMode(e.target.value as typeof billingMode)}
          >
            <option value="client_direct">client_direct</option>
            <option value="agency_covered">agency_covered</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Management</span>
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={managementMode}
            onChange={(e) => setManagementMode(e.target.value as typeof managementMode)}
          >
            <option value="self_service">self_service</option>
            <option value="agency_managed">agency_managed</option>
          </select>
        </label>
      </div>
      <div className="mt-3">
        <button
          type="button"
          disabled={pending || !email}
          onClick={submit}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? '…' : 'Invia invito'}
        </button>
      </div>
      {msg && <p className="mt-2 text-xs text-slate-600">{msg}</p>}
      {inviteUrl && (
        <div className="mt-2 rounded bg-slate-50 p-2">
          <p className="text-xs font-medium text-slate-700">Link condivisibile:</p>
          <code className="mt-1 block break-all text-xs text-indigo-700">{inviteUrl}</code>
        </div>
      )}
    </div>
  )
}
