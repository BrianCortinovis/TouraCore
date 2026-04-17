'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Send, Mail, MessageCircle, Smartphone, Plus } from 'lucide-react'
import { replyToThread, createThreadAndSend } from '../messaggi/actions'

interface Thread {
  id: string; channel: string; subject: string | null
  lastMessageAt: string; unreadCount: number
  guestId: string | null; reservationId: string | null
}

interface Message {
  id: string; direction: 'inbound' | 'outbound'
  senderName: string | null; body: string; sentAt: string
}

interface Props {
  tenantSlug: string; entitySlug: string
  threads: Thread[]; activeThreadId: string | null; messages: Message[]
}

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  email: Mail,
  whatsapp: MessageCircle,
  sms: Smartphone,
  widget: MessageCircle,
  booking_chat: MessageCircle,
  airbnb_chat: MessageCircle,
}

export function InboxView({ tenantSlug, entitySlug, threads, activeThreadId, messages }: Props) {
  const [showNew, setShowNew] = useState(false)
  const activeThread = threads.find((t) => t.id === activeThreadId)

  return (
    <>
      <div className="flex h-full gap-4 rounded-lg border border-gray-200 bg-white">
        {/* Threads list */}
        <aside className="w-72 shrink-0 overflow-y-auto border-r border-gray-200">
          <div className="flex items-center justify-between border-b border-gray-200 p-3">
            <p className="text-xs font-bold uppercase text-gray-500">Conversazioni</p>
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-1 rounded bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
              <Plus className="h-3 w-3"/> Nuova
            </button>
          </div>
          {threads.length === 0 ? (
            <p className="p-6 text-center text-xs text-gray-400">Nessuna conversazione</p>
          ) : (
            <ul>
              {threads.map((t) => {
                const Icon = CHANNEL_ICONS[t.channel] ?? Mail
                const isActive = t.id === activeThreadId
                return (
                  <li key={t.id}>
                    <Link href={`?thread=${t.id}`}
                      className={`flex gap-2 border-b border-gray-100 p-3 ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <Icon className="mt-0.5 h-4 w-4 text-gray-400 shrink-0"/>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">{t.subject ?? '(no subject)'}</p>
                          {t.unreadCount > 0 && (
                            <span className="rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">{t.unreadCount}</span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500">
                          {t.channel} · {new Date(t.lastMessageAt).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        {/* Active thread chat */}
        <div className="flex flex-1 flex-col">
          {!activeThread ? (
            <div className="flex h-full items-center justify-center text-gray-400">
              Seleziona una conversazione
            </div>
          ) : (
            <ChatView
              threadId={activeThread.id}
              channel={activeThread.channel}
              subject={activeThread.subject}
              messages={messages}
              tenantSlug={tenantSlug}
              entitySlug={entitySlug}
            />
          )}
        </div>
      </div>

      {showNew && (
        <NewThreadDialog tenantSlug={tenantSlug} entitySlug={entitySlug} onClose={() => setShowNew(false)}/>
      )}
    </>
  )
}

function ChatView({ threadId, channel, subject, messages, tenantSlug, entitySlug }: {
  threadId: string; channel: string; subject: string | null; messages: Message[]
  tenantSlug: string; entitySlug: string
}) {
  const [pending, startTransition] = useTransition()
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await replyToThread({ threadId, tenantSlug, entitySlug, body })
      if (result.success) setBody('')
      else setError(result.error ?? 'Errore')
    })
  }

  return (
    <>
      <header className="border-b border-gray-200 p-4">
        <h2 className="font-semibold">{subject ?? 'Conversazione'}</h2>
        <p className="text-xs text-gray-500">Canale: {channel}</p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-gray-400">Nessun messaggio</p>
        ) : messages.map((m) => (
          <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-md rounded-lg p-3 text-sm ${
              m.direction === 'outbound' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
            }`}>
              <p className="text-xs opacity-75">{m.senderName ?? (m.direction === 'inbound' ? 'Ospite' : 'Staff')}</p>
              <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
              <p className="mt-1 text-[10px] opacity-60">{new Date(m.sentAt).toLocaleString('it-IT')}</p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="border-t border-gray-200 p-4">
        {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <textarea required rows={2} placeholder="Scrivi un messaggio…" value={body}
            onChange={(e) => setBody(e.target.value)}
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"/>
          <button type="submit" disabled={pending}
            className="flex items-center gap-1 self-end rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            <Send className="h-4 w-4"/> Invia
          </button>
        </div>
      </form>
    </>
  )
}

function NewThreadDialog({ tenantSlug, entitySlug, onClose }: { tenantSlug: string; entitySlug: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    channel: 'email' as 'email'|'sms'|'whatsapp',
    recipient: '',
    subject: '',
    body: '',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={(e) => {
        e.preventDefault()
        startTransition(async () => {
          await createThreadAndSend({
            entitySlug, tenantSlug,
            channel: form.channel,
            recipient: form.recipient,
            subject: form.subject || undefined,
            body: form.body,
          })
          onClose()
        })
      }} className="w-full max-w-md space-y-3 rounded-lg bg-white p-6">
        <h2 className="text-lg font-semibold">Nuovo messaggio</h2>
        <select value={form.channel}
          onChange={(e) => setForm({ ...form, channel: e.target.value as 'email' })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
          <option value="email">Email</option>
          <option value="sms">SMS</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
        <input required placeholder={form.channel === 'email' ? 'Email destinatario' : 'Numero / ID'} value={form.recipient}
          onChange={(e) => setForm({ ...form, recipient: e.target.value })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"/>
        {form.channel === 'email' && (
          <input placeholder="Oggetto" value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"/>
        )}
        <textarea required rows={4} placeholder="Messaggio…" value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"/>
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
          <button type="button" onClick={onClose} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Annulla</button>
          <button type="submit" disabled={pending} className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white">{pending ? 'Invio…' : 'Invia'}</button>
        </div>
      </form>
    </div>
  )
}
