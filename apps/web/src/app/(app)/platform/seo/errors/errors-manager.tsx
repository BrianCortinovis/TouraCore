'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { resolveError404Action } from './actions'

interface Err {
  id: string
  path: string
  referrer: string | null
  user_agent: string | null
  hit_count: number
  first_seen_at: string
  last_seen_at: string
  resolved: boolean
}

export function Errors404Manager({ initial }: { initial: Err[] }) {
  const [errors, setErrors] = useState<Err[]>(initial)
  const [filter, setFilter] = useState<'unresolved' | 'all'>('unresolved')
  const [pending, startTransition] = useTransition()

  const visible = errors.filter((e) => filter === 'all' ? true : !e.resolved)

  function handleResolve(id: string, redirectTarget?: string) {
    startTransition(async () => {
      const res = await resolveError404Action({ id, redirectTarget: redirectTarget ?? null })
      if (res.ok) {
        setErrors(errors.map((e) => e.id === id ? { ...e, resolved: true } : e))
      }
    })
  }

  function handleCreateRedirect(path: string) {
    const target = prompt(`Destinazione redirect per ${path}:`, '/')
    if (!target) return
    fetch('/api/platform/seo/quick-redirect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: path, target }),
    }).then((r) => r.json()).then((res) => {
      if (res.ok) {
        const e = errors.find((x) => x.path === path)
        if (e) handleResolve(e.id, target)
      } else alert(res.error ?? 'Errore')
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {errors.filter((e) => !e.resolved).length} non risolti · {errors.length} totali
        </p>
        <div className="flex gap-1 rounded-md border border-gray-200 bg-white p-1">
          <button onClick={() => setFilter('unresolved')} className={`px-3 py-1 text-xs rounded ${filter === 'unresolved' ? 'bg-blue-600 text-white' : ''}`}>Da risolvere</button>
          <button onClick={() => setFilter('all')} className={`px-3 py-1 text-xs rounded ${filter === 'all' ? 'bg-blue-600 text-white' : ''}`}>Tutti</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Path</th>
              <th className="px-3 py-2 text-left font-medium">Referrer</th>
              <th className="px-3 py-2 text-right font-medium">Hit</th>
              <th className="px-3 py-2 text-left font-medium">Ultimo</th>
              <th className="px-3 py-2 text-right font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {visible.map((e) => (
              <tr key={e.id}>
                <td className="px-3 py-2 font-mono text-xs">{e.path}</td>
                <td className="px-3 py-2 text-xs text-gray-600 max-w-xs truncate" title={e.referrer ?? ''}>{e.referrer ?? '—'}</td>
                <td className="px-3 py-2 text-right text-sm">{e.hit_count}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{new Date(e.last_seen_at).toLocaleDateString('it-IT')}</td>
                <td className="px-3 py-2 text-right space-x-2">
                  <button onClick={()=>handleCreateRedirect(e.path)} disabled={pending} className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1">
                    <ArrowRight className="h-3 w-3" /> Redirect
                  </button>
                  <button onClick={()=>handleResolve(e.id)} disabled={pending} className="text-xs text-green-600 hover:underline inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Ignora
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <p className="p-4 text-sm text-gray-500">Nessun errore 404 da risolvere.</p>}
      </div>
    </div>
  )
}
