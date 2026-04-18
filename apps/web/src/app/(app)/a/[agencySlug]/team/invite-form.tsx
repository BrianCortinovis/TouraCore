'use client'

import { useState, useTransition } from 'react'
import { inviteTeamMemberAction } from './actions'

export function TeamInviteForm({ agencySlug }: { agencySlug: string }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'agency_admin' | 'agency_member'>('agency_member')
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit() {
    setMsg(null)
    start(async () => {
      const res = await inviteTeamMemberAction({ agencySlug, email, role })
      if (res.ok) {
        setMsg('Invito creato · controlla console server per URL.')
        setEmail('')
      } else {
        setMsg(`Errore: ${res.error}`)
      }
    })
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold">Invita un membro</h3>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex-1 text-sm">
          <span className="text-slate-600">Email</span>
          <input
            type="email"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="new.member@example.com"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Ruolo</span>
          <select
            className="mt-1 rounded border border-slate-300 px-3 py-2"
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
          >
            <option value="agency_member">member</option>
            <option value="agency_admin">admin</option>
          </select>
        </label>
        <button
          type="button"
          disabled={pending || !email}
          onClick={submit}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? '…' : 'Invita'}
        </button>
      </div>
      {msg && <p className="mt-2 text-xs text-slate-600">{msg}</p>}
    </div>
  )
}
