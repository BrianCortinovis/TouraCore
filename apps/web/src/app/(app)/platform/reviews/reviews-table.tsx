'use client'

import { useState, useTransition } from 'react'
import { Flag, MessageSquare, X, Star } from 'lucide-react'
import { flagReviewAction, replyReviewAction } from './actions'

interface Review {
  id: string
  tenant_id: string | null
  entity_id: string | null
  source: string
  reviewer_name: string | null
  rating: number | null
  rating_scale: number | null
  title: string | null
  body: string | null
  language: string | null
  published_at: string | null
  sentiment: string | null
  sentiment_score: number | null
  response_body: string | null
  response_published_at: string | null
  is_flagged: boolean | null
  flagged: boolean | null
  created_at: string
}

export function ReviewsTable({ initial, sources }: { initial: Review[]; sources: string[] }) {
  const [reviews, setReviews] = useState(initial)
  const [filterSource, setFilterSource] = useState<string>('all')
  const [filterSentiment, setFilterSentiment] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Review | null>(null)
  const [reply, setReply] = useState('')
  const [pending, startTransition] = useTransition()

  const visible = reviews.filter((r) => {
    if (filterSource !== 'all' && r.source !== filterSource) return false
    if (filterSentiment !== 'all' && r.sentiment !== filterSentiment) return false
    if (search && !(r.body?.toLowerCase().includes(search.toLowerCase()) || r.reviewer_name?.toLowerCase().includes(search.toLowerCase()))) return false
    return true
  })

  function handleFlag(id: string, current: boolean) {
    startTransition(async () => {
      const res = await flagReviewAction(id, !current)
      if (res.ok) setReviews(reviews.map((r) => r.id === id ? { ...r, is_flagged: !current, flagged: !current } : r))
    })
  }

  function handleReply() {
    if (!selected || !reply.trim()) return
    startTransition(async () => {
      const res = await replyReviewAction(selected.id, reply)
      if (res.ok) {
        setReviews(reviews.map((r) => r.id === selected.id ? { ...r, response_body: reply, response_published_at: new Date().toISOString() } : r))
        setSelected(null)
        setReply('')
      } else alert(res.error)
    })
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <select value={filterSource} onChange={(e)=>setFilterSource(e.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm">
          <option value="all">Tutte le fonti</option>
          {sources.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterSentiment} onChange={(e)=>setFilterSentiment(e.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm">
          <option value="all">Tutti i sentiment</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutre</option>
          <option value="negative">Negative</option>
        </select>
        <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Cerca..." className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm" />
      </div>

      <p className="text-sm text-gray-600">{visible.length} di {reviews.length} recensioni</p>

      <div className="space-y-3">
        {visible.map((r) => (
          <div key={r.id} className={`rounded-lg border bg-white p-4 ${r.is_flagged || r.flagged ? 'border-red-300' : 'border-gray-200'}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <RatingStars rating={r.rating} scale={r.rating_scale} />
                  <span className="text-xs font-medium text-gray-700">{r.reviewer_name ?? 'Anonimo'}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs font-mono">{r.source}</span>
                  {r.sentiment && <SentimentBadge sentiment={r.sentiment} />}
                </div>
                {r.title && <p className="text-sm font-medium">{r.title}</p>}
                {r.body && <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{r.body}</p>}
                <p className="mt-2 text-xs text-gray-400">
                  {r.published_at ? new Date(r.published_at).toLocaleDateString('it-IT') : new Date(r.created_at).toLocaleDateString('it-IT')}
                  {r.language && ` · ${r.language.toUpperCase()}`}
                </p>
                {r.response_body && (
                  <div className="mt-3 rounded bg-blue-50 border-l-4 border-blue-300 p-3">
                    <p className="text-xs font-medium text-blue-700 mb-1">Risposta TouraCore:</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.response_body}</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1 ml-4">
                <button onClick={()=>handleFlag(r.id, r.is_flagged ?? false)} disabled={pending} title={r.is_flagged ? 'Unflag' : 'Flag come problematica'} className={`p-2 rounded ${r.is_flagged ? 'bg-red-100 text-red-700' : 'text-gray-400 hover:bg-gray-100'}`}>
                  <Flag className="h-4 w-4" />
                </button>
                {!r.response_body && (
                  <button onClick={()=>{ setSelected(r); setReply('') }} disabled={pending} title="Rispondi" className="p-2 rounded text-gray-600 hover:bg-blue-50 hover:text-blue-600">
                    <MessageSquare className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {visible.length === 0 && <p className="text-sm text-gray-500 text-center py-8">Nessuna recensione corrisponde ai filtri.</p>}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold">Rispondi a {selected.reviewer_name}</h2>
              <button onClick={()=>setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded bg-gray-50 p-3 text-sm">
                <p className="text-xs text-gray-500 mb-1">Recensione originale ({selected.rating}/{selected.rating_scale}):</p>
                <p className="text-gray-700">{selected.body}</p>
              </div>
              <textarea value={reply} onChange={(e)=>setReply(e.target.value)} rows={5} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" placeholder="La tua risposta professionale..." />
              <p className="text-xs text-gray-500">Le risposte sono pubbliche su tutte le fonti che lo supportano (Google, Booking, Trustpilot, etc.).</p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={()=>setSelected(null)} disabled={pending} className="rounded border border-gray-300 px-4 py-2 text-sm">Annulla</button>
              <button onClick={handleReply} disabled={pending || !reply.trim()} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {pending ? 'Invio...' : 'Pubblica risposta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function RatingStars({ rating, scale }: { rating: number | null; scale: number | null }) {
  if (!rating) return <span className="text-xs text-gray-400">no rating</span>
  const r = Number(rating)
  const max = Number(scale ?? 5)
  const stars = max === 10 ? Math.round((r / 10) * 5) : Math.round(r)
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`h-4 w-4 ${i <= stars ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
      ))}
      <span className="ml-1 text-xs font-medium">{r}/{max}</span>
    </span>
  )
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const colors: Record<string, string> = {
    positive: 'bg-green-100 text-green-700',
    neutral: 'bg-gray-100 text-gray-700',
    negative: 'bg-red-100 text-red-700',
  }
  return <span className={`inline-block rounded px-2 py-0.5 text-xs ${colors[sentiment] ?? 'bg-gray-100'}`}>{sentiment}</span>
}
