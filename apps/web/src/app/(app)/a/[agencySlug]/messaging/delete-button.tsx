'use client'

import { useTransition } from 'react'
import { deleteAgencyProviderAction } from './actions'

export function AgencyDeleteButton({ id, agencySlug }: { id: string; agencySlug: string }) {
  const [p, s] = useTransition()
  return (
    <button
      type="button"
      disabled={p}
      onClick={() => {
        if (!confirm('Elimina provider?')) return
        s(async () => { await deleteAgencyProviderAction(id, agencySlug) })
      }}
      className="rounded border border-rose-200 px-3 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-50"
    >
      {p ? '…' : 'Elimina'}
    </button>
  )
}
