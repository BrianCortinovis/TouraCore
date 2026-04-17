'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Star, MessageSquare, Flag, EyeOff, AlertCircle } from 'lucide-react'
import { replyToReview, flagReview, hideReview } from './actions'

interface Review {
  id: string; source: string; externalId: string | null; rating: number
  title: string | null; body: string | null; language: string | null
  reviewerName: string | null; reviewerCountry: string | null
  replyBody: string | null; replyAt: string | null
  sentiment: string | null; topics: string[]; flagged: boolean
  createdAt: string
}

interface Stats { total: number; avg: number; sources: Array<[string, number]> }

interface Props {
  tenantSlug: string; entitySlug: string; currentFilter: string
  stats: Stats; reviews: Review[]
}

const SOURCE_COLORS: Record<string, string> = {
  google: 'bg-blue-100 text-blue-800',
  booking: 'bg-blue-100 text-blue-800',
  airbnb: 'bg-pink-100 text-pink-800',
  tripadvisor: 'bg-green-100 text-green-800',
  thefork: 'bg-amber-100 text-amber-800',
  direct: 'bg-purple-100 text-purple-800',
}

export function ReviewsView({ tenantSlug, entitySlug, currentFilter, stats, reviews }: Props) {
  const [replyFor, setReplyFor] = useState<Review | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Rating medio</p>
          <p className="text-2xl font-bold flex items-center gap-1">
            {stats.avg.toFixed(1)} <Star className="h-5 w-5 fill-amber-400 text-amber-400"/>
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Recensioni totali</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 col-span-2">
          <p className="text-xs text-gray-500">Per fonte</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {(stats.sources ?? []).map(([src, count]) => (
              <span key={src} className={`rounded px-2 py-0.5 text-xs ${SOURCE_COLORS[src] ?? 'bg-gray-100'}`}>
                {src} {count}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 rounded-lg border border-gray-200 bg-white p-2">
        {[
          { code: 'all', label: 'Tutte' },
          { code: 'unreplied', label: 'Senza risposta' },
          { code: 'negative', label: 'Negative ≤3⭐' },
          { code: 'flagged', label: 'Segnalate' },
        ].map((f) => (
          <Link key={f.code} href={`?filter=${f.code}`}
            className={`rounded px-3 py-1 text-xs font-medium ${currentFilter === f.code ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {f.label}
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {reviews.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">Nessuna recensione</p>
        ) : reviews.map((r) => (
          <article key={r.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${SOURCE_COLORS[r.source] ?? 'bg-gray-100'}`}>{r.source}</span>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}/>
                    ))}
                  </div>
                  {r.sentiment && (
                    <span className={`rounded px-2 py-0.5 text-[10px] ${
                      r.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                      r.sentiment === 'negative' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                    }`}>{r.sentiment}</span>
                  )}
                  {r.flagged && <Flag className="h-3 w-3 text-red-600"/>}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {r.reviewerName ?? 'Anonimo'} {r.reviewerCountry && `· ${r.reviewerCountry}`} · {new Date(r.createdAt).toLocaleDateString('it-IT')}
                </p>
                {r.title && <h3 className="mt-2 font-semibold">{r.title}</h3>}
                {r.body && <p className="mt-1 text-sm text-gray-700">{r.body}</p>}
                {r.topics.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.topics.map((t) => (
                      <span key={t} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">#{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <button onClick={() => setReplyFor(r)}
                  className="flex items-center gap-1 rounded border border-blue-300 bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                  <MessageSquare className="h-3 w-3"/>
                  {r.replyAt ? 'Modifica risposta' : 'Rispondi'}
                </button>
                <button onClick={() =>
                  startTransition(async () => { await flagReview(r.id, tenantSlug, entitySlug) })
                } disabled={pending} className="text-gray-400 hover:text-red-600 px-1">
                  <Flag className="h-3 w-3"/>
                </button>
                <button onClick={() => {
                  if (confirm('Nascondi recensione?')) startTransition(async () => { await hideReview(r.id, tenantSlug, entitySlug) })
                }} disabled={pending} className="text-gray-400 hover:text-gray-700 px-1">
                  <EyeOff className="h-3 w-3"/>
                </button>
              </div>
            </div>
            {r.replyBody && (
              <div className="mt-3 rounded border-l-4 border-blue-300 bg-blue-50 p-3">
                <p className="text-[10px] font-medium uppercase text-blue-700">Risposta · {r.replyAt && new Date(r.replyAt).toLocaleDateString('it-IT')}</p>
                <p className="mt-1 text-sm">{r.replyBody}</p>
              </div>
            )}
          </article>
        ))}
      </div>

      {replyFor && (
        <ReplyDialog review={replyFor} tenantSlug={tenantSlug} entitySlug={entitySlug} onClose={() => setReplyFor(null)}/>
      )}
    </>
  )
}

function ReplyDialog({ review, tenantSlug, entitySlug, onClose }: { review: Review; tenantSlug: string; entitySlug: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [body, setBody] = useState(review.replyBody ?? '')

  const suggestions = review.rating <= 2 ? [
    `Ci dispiace molto per la sua esperienza. ${review.reviewerName ? review.reviewerName + ', g' : 'G'}rappresenteremo questo feedback con il team. Vi preghiamo di contattarci per discutere come possiamo migliorare.`,
    `Grazie per il suo feedback onesto. Ci scusiamo per i disagi e ci impegniamo a risolvere i problemi che ha sollevato. Ci farebbe piacere parlare direttamente con lei.`,
  ] : review.rating >= 4 ? [
    `Grazie ${review.reviewerName ?? ''} per la fantastica recensione! Siamo felici che abbia apprezzato il suo soggiorno. La attendiamo con piacere per una prossima visita.`,
    `Che piacere leggere la sua recensione! Il nostro team sarà entusiasta di sapere che ha vissuto un'esperienza positiva. A presto!`,
  ] : [
    `Grazie per il suo feedback. Apprezziamo i suoi commenti e useremo le sue osservazioni per migliorare. Speriamo di rivederla presto.`,
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={(e) => {
        e.preventDefault()
        startTransition(async () => {
          await replyToReview({ reviewId: review.id, tenantSlug, entitySlug, body })
          onClose()
        })
      }} className="w-full max-w-2xl space-y-3 rounded-lg bg-white p-6">
        <h2 className="text-lg font-semibold">Risposta a {review.reviewerName ?? 'recensione'}</h2>
        <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
          <p className="text-xs text-gray-500">Recensione originale ({review.rating}⭐):</p>
          <p className="mt-1">{review.body ?? '(senza testo)'}</p>
        </div>

        <div>
          <p className="text-xs text-gray-600">Suggerimenti AI (basati su rating):</p>
          <div className="mt-1 space-y-1">
            {suggestions.map((s, i) => (
              <button key={i} type="button" onClick={() => setBody(s)}
                className="block w-full rounded border border-gray-200 bg-gray-50 p-2 text-left text-xs hover:bg-blue-50">
                {s.slice(0, 100)}…
              </button>
            ))}
          </div>
        </div>

        <textarea required rows={5} placeholder="La tua risposta…" value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"/>

        <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
          <button type="button" onClick={onClose} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Annulla</button>
          <button type="submit" disabled={pending} className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white">{pending ? 'Salvo…' : 'Pubblica risposta'}</button>
        </div>
      </form>
    </div>
  )
}
