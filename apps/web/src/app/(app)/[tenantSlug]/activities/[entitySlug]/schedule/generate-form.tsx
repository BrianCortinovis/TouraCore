'use client'

import { useState, useTransition } from 'react'
import { generateSlotsAction } from './actions'

interface Props {
  scheduleId: string
  productId: string
  tenantId: string
  durationMinutes: number
}

export function GenerateSlotsForm({ scheduleId, productId, tenantId, durationMinutes }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(in30)
  const [pending, start] = useTransition()
  const [result, setResult] = useState<string | null>(null)

  function go() {
    setResult(null)
    start(async () => {
      try {
        const r = await generateSlotsAction({ scheduleId, productId, tenantId, fromDate: from, toDate: to, durationMinutes })
        setResult(`${r.count} slot generati`)
      } catch (e) {
        setResult(e instanceof Error ? e.message : 'Errore')
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1 text-xs" />
      <span className="text-xs text-gray-400">→</span>
      <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1 text-xs" />
      <button onClick={go} disabled={pending} className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
        {pending ? '…' : 'Genera slot'}
      </button>
      {result && <span className="text-xs text-green-600">{result}</span>}
    </div>
  )
}
