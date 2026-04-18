'use client'

import { useTransition } from 'react'
import { suspendAgencyAction, reactivateAgencyAction } from './actions'

export function SuspendButton({ agencyId }: { agencyId: string }) {
  const [p, s] = useTransition()
  return (
    <button
      type="button"
      disabled={p}
      onClick={() => s(async () => { await suspendAgencyAction(agencyId) })}
      className="rounded border border-rose-200 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50"
    >
      {p ? '…' : 'Sospendi'}
    </button>
  )
}

export function ReactivateButton({ agencyId }: { agencyId: string }) {
  const [p, s] = useTransition()
  return (
    <button
      type="button"
      disabled={p}
      onClick={() => s(async () => { await reactivateAgencyAction(agencyId) })}
      className="rounded border border-emerald-200 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
    >
      {p ? '…' : 'Riattiva'}
    </button>
  )
}
