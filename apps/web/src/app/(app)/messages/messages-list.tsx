'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { InboxEntry } from '@touracore/notifications'
import { markAsReadAction, markAllAsReadAction, archiveAction } from './actions'

export function InboxList({ initial }: { initial: InboxEntry[] }) {
  const [entries, setEntries] = useState(initial)
  const [pending, start] = useTransition()
  const unreadCount = entries.filter((e) => !e.read_at).length

  function handleRead(id: string) {
    setEntries((rows) => rows.map((r) => (r.id === id ? { ...r, read_at: new Date().toISOString() } : r)))
    start(() => markAsReadAction(id))
  }
  function handleMarkAll() {
    setEntries((rows) => rows.map((r) => ({ ...r, read_at: r.read_at ?? new Date().toISOString() })))
    start(() => markAllAsReadAction())
  }
  function handleArchive(id: string) {
    setEntries((rows) => rows.filter((r) => r.id !== id))
    start(() => archiveAction(id))
  }

  const SCOPE_PALETTE: Record<string, string> = {
    platform: 'bg-slate-900 text-white',
    agency: 'bg-indigo-600 text-white',
    tenant: 'bg-emerald-600 text-white',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">{unreadCount} non letti · {entries.length} totali</p>
        {unreadCount > 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={handleMarkAll}
            className="text-xs text-indigo-600 hover:underline disabled:opacity-50"
          >
            Segna tutti come letti
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {entries.map((e) => (
          <li
            key={e.id}
            className={`flex items-start gap-3 rounded-2xl border p-4 ${
              e.read_at ? 'border-slate-200 bg-white' : 'border-indigo-300 bg-indigo-50'
            }`}
          >
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${SCOPE_PALETTE[e.scope] ?? 'bg-slate-200 text-slate-700'}`}>
              {e.scope}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{e.title}</p>
              <p className="mt-1 text-sm text-slate-600">{e.body}</p>
              <p className="mt-1 text-xs text-slate-400">
                {new Date(e.created_at).toLocaleString()} · {e.category}
                {e.action_url && (
                  <>
                    {' · '}
                    <Link href={e.action_url} className="text-indigo-600 hover:underline">Apri →</Link>
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              {!e.read_at && (
                <button type="button" onClick={() => handleRead(e.id)} className="text-xs text-indigo-600 hover:underline">
                  Segna letto
                </button>
              )}
              <button type="button" onClick={() => handleArchive(e.id)} className="text-xs text-slate-500 hover:underline">
                Archivia
              </button>
            </div>
          </li>
        ))}
        {entries.length === 0 && (
          <li className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            Inbox vuota.
          </li>
        )}
      </ul>
    </div>
  )
}
