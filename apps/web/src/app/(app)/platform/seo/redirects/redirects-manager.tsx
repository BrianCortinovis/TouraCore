'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Power, PowerOff } from 'lucide-react'
import { createRedirectAction, deleteRedirectAction, toggleRedirectAction } from './actions'

interface Redirect {
  id: string
  source_path: string
  target_path: string
  redirect_type: number
  is_active: boolean
  hit_count: number
  last_hit_at: string | null
  notes: string | null
  created_at: string
}

export function RedirectsManager({ initial }: { initial: Redirect[] }) {
  const [redirects, setRedirects] = useState<Redirect[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')
  const [type, setType] = useState<301 | 302 | 307 | 308>(301)
  const [notes, setNotes] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleCreate() {
    setError(null)
    startTransition(async () => {
      const res = await createRedirectAction({ sourcePath: source, targetPath: target, redirectType: type, notes: notes || null })
      if (res.ok) {
        setRedirects([res.row, ...redirects])
        setSource(''); setTarget(''); setNotes(''); setShowForm(false)
      } else {
        setError(res.error)
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Eliminare questo redirect?')) return
    startTransition(async () => {
      const res = await deleteRedirectAction(id)
      if (res.ok) setRedirects(redirects.filter((r) => r.id !== id))
    })
  }

  function handleToggle(id: string, current: boolean) {
    startTransition(async () => {
      const res = await toggleRedirectAction(id, !current)
      if (res.ok) setRedirects(redirects.map((r) => r.id === id ? { ...r, is_active: !current } : r))
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">{redirects.length} redirect totali · {redirects.filter(r=>r.is_active).length} attivi</p>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Nuovo redirect
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Source path</label>
              <input value={source} onChange={(e)=>setSource(e.target.value)} placeholder="/old-path" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Target path</label>
              <input value={target} onChange={(e)=>setTarget(e.target.value)} placeholder="/new-path" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo</label>
              <select value={type} onChange={(e)=>setType(Number(e.target.value) as 301|302|307|308)} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm">
                <option value={301}>301 — Permanente</option>
                <option value={302}>302 — Temporaneo</option>
                <option value={307}>307 — Temporaneo (preserve method)</option>
                <option value={308}>308 — Permanente (preserve method)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Note</label>
              <input value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Es. rebranding 2026" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={()=>setShowForm(false)} disabled={pending} className="rounded border border-gray-300 px-3 py-2 text-sm">Annulla</button>
            <button onClick={handleCreate} disabled={pending || !source || !target} className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
              {pending ? 'Salvataggio...' : 'Crea'}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Source</th>
              <th className="px-3 py-2 text-left font-medium">Target</th>
              <th className="px-3 py-2 text-center font-medium">Tipo</th>
              <th className="px-3 py-2 text-right font-medium">Hit</th>
              <th className="px-3 py-2 text-left font-medium">Note</th>
              <th className="px-3 py-2 text-right font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {redirects.map((r) => (
              <tr key={r.id} className={r.is_active ? '' : 'opacity-50'}>
                <td className="px-3 py-2 font-mono text-xs">{r.source_path}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.target_path}</td>
                <td className="px-3 py-2 text-center text-xs">{r.redirect_type}</td>
                <td className="px-3 py-2 text-right text-xs">{r.hit_count.toLocaleString('it-IT')}</td>
                <td className="px-3 py-2 text-xs text-gray-600">{r.notes ?? '—'}</td>
                <td className="px-3 py-2 text-right space-x-2">
                  <button onClick={()=>handleToggle(r.id, r.is_active)} className="text-xs text-gray-600 hover:text-gray-900" title={r.is_active ? 'Disattiva' : 'Attiva'}>
                    {r.is_active ? <Power className="h-4 w-4 inline text-green-600" /> : <PowerOff className="h-4 w-4 inline" />}
                  </button>
                  <button onClick={()=>handleDelete(r.id)} className="text-xs text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {redirects.length === 0 && <p className="p-4 text-sm text-gray-500">Nessun redirect configurato.</p>}
      </div>
    </div>
  )
}
