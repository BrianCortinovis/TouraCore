'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button, Input, Select, Modal, DataTable, Badge } from '@touracore/ui'
import { useAuthStore } from '@touracore/auth/store'
import {
  listReviewsAction,
  getReviewStatsAction,
  replyToReviewAction,
  createReviewManualAction,
} from '../competitive-actions'

interface Review {
  id: string
  source: string
  reviewer_name: string | null
  rating: number | null
  title: string | null
  body: string | null
  sentiment: string | null
  published_at: string | null
  response_body: string | null
  response_published_at: string | null
  language: string | null
}
interface Stats {
  total: number
  avg_rating: number
  by_sentiment: Record<string, number>
  by_source: Record<string, number>
}

export default function ReviewsPage() {
  const { property, tenant } = useAuthStore()
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [replying, setReplying] = useState<Review | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ source: 'direct', reviewerName: '', rating: 10, body: '' })
  const [filter, setFilter] = useState<{ sentiment: string; source: string }>({ sentiment: '', source: '' })

  const load = useCallback(async () => {
    if (!property) return
    const f: { sentiment?: string; source?: string } = {}
    if (filter.sentiment) f.sentiment = filter.sentiment
    if (filter.source) f.source = filter.source
    const [r, s] = await Promise.all([
      listReviewsAction(property.id, f),
      getReviewStatsAction(property.id),
    ])
    setReviews(r as Review[])
    setStats(s as Stats)
  }, [property, filter])

  useEffect(() => { load() }, [load])

  async function handleReply() {
    if (!replying || !replyBody.trim()) return
    await replyToReviewAction({ reviewId: replying.id, body: replyBody })
    setReplying(null)
    setReplyBody('')
    await load()
  }

  async function handleAdd() {
    if (!tenant || !property) return
    const res = await createReviewManualAction({
      tenantId: tenant.id,
      entityId: property.id,
      source: form.source,
      reviewerName: form.reviewerName,
      rating: form.rating,
      body: form.body,
    })
    if (res.success) {
      setAddOpen(false)
      setForm({ source: 'direct', reviewerName: '', rating: 10, body: '' })
      await load()
    }
  }

  if (!property) return <div className="py-20 text-center text-gray-500">Seleziona una struttura.</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Recensioni</h1>
        <Button onClick={() => setAddOpen(true)}>Aggiungi recensione</Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Totale" value={stats.total} />
          <Stat label="Media" value={`${stats.avg_rating}/10`} />
          <Stat label="Positive" value={stats.by_sentiment.positive ?? 0} color="text-green-600" />
          <Stat label="Negative" value={stats.by_sentiment.negative ?? 0} color="text-red-600" />
        </div>
      )}

      <div className="flex gap-3">
        <Select
          options={[
            { value: '', label: 'Tutti sentiment' },
            { value: 'positive', label: 'Positive' },
            { value: 'neutral', label: 'Neutral' },
            { value: 'negative', label: 'Negative' },
          ]}
          value={filter.sentiment}
          onChange={(e) => setFilter((p) => ({ ...p, sentiment: e.target.value }))}
        />
        <Select
          options={[
            { value: '', label: 'Tutte le fonti' },
            { value: 'direct', label: 'Direct' },
            { value: 'google', label: 'Google' },
            { value: 'booking', label: 'Booking' },
            { value: 'airbnb', label: 'Airbnb' },
            { value: 'tripadvisor', label: 'TripAdvisor' },
          ]}
          value={filter.source}
          onChange={(e) => setFilter((p) => ({ ...p, source: e.target.value }))}
        />
      </div>

      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{r.reviewer_name ?? 'Anonimo'}</span>
                  <Badge variant="secondary">{r.source}</Badge>
                  {r.sentiment && (
                    <Badge variant={r.sentiment === 'positive' ? 'success' : r.sentiment === 'negative' ? 'destructive' : 'secondary'}>
                      {r.sentiment}
                    </Badge>
                  )}
                  {r.rating !== null && <span className="text-yellow-500">{r.rating}/10 ⭐</span>}
                </div>
                {r.title && <div className="mt-1 font-medium">{r.title}</div>}
                {r.body && <p className="mt-2 text-sm text-gray-700">{r.body}</p>}
                <div className="mt-1 text-xs text-gray-500">
                  {r.published_at ? new Date(r.published_at).toLocaleDateString('it-IT') : ''}
                </div>
              </div>
              {!r.response_body && (
                <Button size="sm" variant="ghost" onClick={() => { setReplying(r); setReplyBody('') }}>Rispondi</Button>
              )}
            </div>
            {r.response_body && (
              <div className="mt-3 rounded-lg bg-blue-50 p-3">
                <div className="text-xs font-medium text-blue-900">Risposta host</div>
                <p className="mt-1 text-sm text-blue-900">{r.response_body}</p>
              </div>
            )}
          </div>
        ))}
        {reviews.length === 0 && <div className="py-10 text-center text-gray-500">Nessuna recensione.</div>}
      </div>

      <Modal isOpen={!!replying} onClose={() => setReplying(null)} title="Rispondi a recensione">
        <div className="space-y-4">
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            rows={5}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Risposta professionale..."
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setReplying(null)}>Annulla</Button>
            <Button onClick={handleReply} disabled={!replyBody.trim()}>Pubblica risposta</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Aggiungi recensione manuale">
        <div className="space-y-4">
          <Select
            label="Fonte"
            options={[
              { value: 'direct', label: 'Direct' },
              { value: 'google', label: 'Google' },
              { value: 'booking', label: 'Booking' },
              { value: 'airbnb', label: 'Airbnb' },
              { value: 'tripadvisor', label: 'TripAdvisor' },
            ]}
            value={form.source}
            onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))}
          />
          <Input label="Nome recensore" value={form.reviewerName} onChange={(e) => setForm((p) => ({ ...p, reviewerName: e.target.value }))} />
          <Input
            label="Rating (0-10)"
            type="number"
            value={String(form.rating)}
            onChange={(e) => setForm((p) => ({ ...p, rating: Number(e.target.value) }))}
          />
          <textarea
            placeholder="Corpo recensione"
            value={form.body}
            onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Annulla</Button>
            <Button onClick={handleAdd} disabled={!form.reviewerName || !form.body}>Aggiungi</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${color ?? 'text-gray-900'}`}>{value}</div>
    </div>
  )
}
