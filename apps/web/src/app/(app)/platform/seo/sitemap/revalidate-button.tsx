'use client'

import { useState, useTransition } from 'react'
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { revalidateSeoCacheAction } from './actions'

export function RevalidateButton() {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  function handleClick() {
    setResult(null)
    startTransition(async () => {
      const res = await revalidateSeoCacheAction()
      setResult(res.ok ? { ok: true, msg: 'Cache invalidata. Le sitemap si rigenereranno alla prossima richiesta.' } : { ok: false, msg: res.error })
    })
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${pending ? 'animate-spin' : ''}`} />
        {pending ? 'Invalidando...' : 'Revalidate listings + discover + sitemap'}
      </button>
      {result && (
        <div className={`flex items-center gap-2 text-sm ${result.ok ? 'text-green-700' : 'text-red-600'}`}>
          {result.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {result.msg}
        </div>
      )}
    </div>
  )
}
