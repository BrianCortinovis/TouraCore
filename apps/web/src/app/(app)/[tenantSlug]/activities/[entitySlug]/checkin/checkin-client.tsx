'use client'

import { useState, useTransition } from 'react'
import { QrCode, Check, X } from 'lucide-react'
import { checkinByQrAction } from './actions'

interface Props { tenantId: string; entityId: string; entityName: string }

export function CheckinClient({ tenantId, entityId, entityName }: Props) {
  const [qr, setQr] = useState('')
  const [pending, start] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  function submit() {
    if (!qr) return
    setResult(null)
    start(async () => {
      const r = await checkinByQrAction({ qr, tenantId, entityId })
      setResult(r.ok ? { ok: true, msg: `✅ Check-in ${r.guestName} — ${r.productName}` } : { ok: false, msg: r.error ?? 'Errore' })
      if (r.ok) setQr('')
    })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><QrCode className="h-6 w-6" /> Check-in</h1>
        <p className="text-sm text-gray-500 mt-1">{entityName}</p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <label className="text-xs font-medium text-gray-700">Scansiona o incolla QR</label>
        <input value={qr} onChange={(e) => setQr(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="UUID QR guest" className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm font-mono" autoFocus />
        <button onClick={submit} disabled={pending || !qr} className="mt-3 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {pending ? 'Verifica…' : 'Check-in'}
        </button>
        {result && (
          <div className={`mt-3 rounded-md p-3 text-sm flex items-center gap-2 ${result.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {result.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            {result.msg}
          </div>
        )}
      </div>
    </div>
  )
}
