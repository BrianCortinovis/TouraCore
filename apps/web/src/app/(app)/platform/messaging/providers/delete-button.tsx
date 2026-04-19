'use client'

import { useTransition } from 'react'
import { deleteProviderAction } from './actions'

export function DeleteButton({ id }: { id: string }) {
  const [p, s] = useTransition()
  return (
    <button
      type="button"
      disabled={p}
      onClick={() => {
        if (!confirm('Eliminare provider? Questa azione è irreversibile.')) return
        s(async () => { await deleteProviderAction(id) })
      }}
      className="rounded border border-rose-200 px-3 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-50"
    >
      {p ? '…' : 'Elimina'}
    </button>
  )
}
