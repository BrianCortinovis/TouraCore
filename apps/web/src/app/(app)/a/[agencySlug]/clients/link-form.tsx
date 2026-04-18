'use client'

import { useState, useTransition } from 'react'
import { linkTenantToAgencyAction } from './actions'

export function LinkClientForm({ agencySlug }: { agencySlug: string }) {
  const [tenantSlug, setTenantSlug] = useState('')
  const [billingMode, setBillingMode] = useState<'client_direct' | 'agency_covered'>('client_direct')
  const [managementMode, setManagementMode] = useState<'agency_managed' | 'self_service'>('self_service')
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit() {
    setMsg(null)
    start(async () => {
      const res = await linkTenantToAgencyAction({ agencySlug, tenantSlug, billingMode, managementMode })
      if (res.ok) {
        setMsg('Cliente collegato.')
        setTenantSlug('')
      } else {
        setMsg(`Errore: ${res.error}`)
      }
    })
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold">Collega cliente esistente</h3>
      <p className="mt-1 text-xs text-slate-500">
        Inserisci slug del tenant (creato da onboarding generico o admin).
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
        <label className="text-sm md:col-span-2">
          <span className="text-slate-600">Tenant slug</span>
          <input
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            placeholder="villa-irabo"
          />
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
          disabled={pending || !tenantSlug}
          onClick={submit}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? '…' : 'Collega cliente'}
        </button>
      </div>
      {msg && <p className="mt-2 text-xs text-slate-600">{msg}</p>}
    </div>
  )
}
