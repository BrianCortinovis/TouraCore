'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button, Badge, Modal, Input } from '@touracore/ui'
import { useAuthStore } from '@touracore/auth/store'
import {
  listMessageThreadsAction,
  getThreadMessagesAction,
  sendMessageAction,
  createManualThreadAction,
} from '../competitive-actions'

interface Thread {
  id: string
  channel: string
  subject: string | null
  last_message_at: string | null
  unread_count: number
  is_resolved: boolean
}
interface Message {
  id: string
  direction: string
  channel: string
  from_name: string | null
  body: string
  received_at: string
  sent_at: string | null
}

const channelColor: Record<string, string> = {
  booking: 'default',
  airbnb: 'default',
  email: 'secondary',
  whatsapp: 'success',
  sms: 'secondary',
  portal: 'default',
}

export default function InboxPage() {
  const { property, tenant } = useAuthStore()
  const [threads, setThreads] = useState<Thread[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [reply, setReply] = useState('')
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [newForm, setNewForm] = useState({ channel: 'email', subject: '', guestEmail: '' })

  const loadThreads = useCallback(async () => {
    if (!property) return
    const data = await listMessageThreadsAction(property.id)
    setThreads(data as Thread[])
  }, [property])

  const loadMessages = useCallback(async (threadId: string) => {
    const data = await getThreadMessagesAction(threadId)
    setMessages(data as Message[])
  }, [])

  useEffect(() => { loadThreads() }, [loadThreads])
  useEffect(() => { if (selectedId) loadMessages(selectedId) }, [selectedId, loadMessages])

  const selectedThread = threads.find((t) => t.id === selectedId)

  async function handleSend() {
    if (!selectedId || !reply.trim() || !selectedThread) return
    await sendMessageAction({
      threadId: selectedId,
      body: reply,
      channel: selectedThread.channel,
    })
    setReply('')
    await loadMessages(selectedId)
    await loadThreads()
  }

  async function handleCreateThread() {
    if (!tenant || !property || !newForm.subject) return
    const res = await createManualThreadAction({
      tenantId: tenant.id,
      entityId: property.id,
      channel: newForm.channel,
      subject: newForm.subject,
      guestEmail: newForm.guestEmail,
    })
    if (res.success && res.data) {
      setNewModalOpen(false)
      setNewForm({ channel: 'email', subject: '', guestEmail: '' })
      await loadThreads()
      setSelectedId(res.data.id)
    }
  }

  if (!property) return <div className="py-20 text-center text-gray-500">Caricamento struttura...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Inbox messaggi</h1>
        <Button onClick={() => setNewModalOpen(true)}>Nuovo thread</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 rounded-lg border border-gray-200 bg-white">
          <div className="border-b px-4 py-2 text-sm font-medium">Conversazioni ({threads.length})</div>
          <div className="max-h-[600px] overflow-y-auto">
            {threads.length === 0 && <div className="px-4 py-6 text-sm text-gray-500">Nessun thread ancora.</div>}
            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`block w-full text-left border-b px-4 py-3 hover:bg-gray-50 ${selectedId === t.id ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{t.subject ?? 'Senza oggetto'}</span>
                  <Badge variant={(channelColor[t.channel] ?? 'secondary') as never}>{t.channel}</Badge>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {t.last_message_at ? new Date(t.last_message_at).toLocaleString('it-IT') : 'Nessun messaggio'}
                  {t.unread_count > 0 && <span className="ml-2 text-blue-600">· {t.unread_count} nuovi</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-lg border border-gray-200 bg-white">
          {!selectedThread ? (
            <div className="flex h-[600px] items-center justify-center text-gray-500">Seleziona un thread</div>
          ) : (
            <div className="flex h-[600px] flex-col">
              <div className="border-b px-4 py-3">
                <div className="font-semibold">{selectedThread.subject ?? 'Senza oggetto'}</div>
                <div className="text-xs text-gray-500">Canale: {selectedThread.channel}</div>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                        m.direction === 'outbound' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="mb-1 text-xs opacity-75">
                        {m.from_name ?? (m.direction === 'outbound' ? 'Host' : 'Guest')} ·{' '}
                        {new Date(m.sent_at ?? m.received_at).toLocaleString('it-IT')}
                      </div>
                      <div className="whitespace-pre-wrap">{m.body}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t p-3">
                <div className="flex gap-2">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Scrivi risposta..."
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    rows={2}
                  />
                  <Button onClick={handleSend} disabled={!reply.trim()}>Invia</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={newModalOpen} onClose={() => setNewModalOpen(false)} title="Nuovo thread">
        <div className="space-y-4">
          <Input
            label="Oggetto"
            value={newForm.subject}
            onChange={(e) => setNewForm((p) => ({ ...p, subject: e.target.value }))}
          />
          <Input
            label="Email guest (opzionale)"
            value={newForm.guestEmail}
            onChange={(e) => setNewForm((p) => ({ ...p, guestEmail: e.target.value }))}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setNewModalOpen(false)}>Annulla</Button>
            <Button onClick={handleCreateThread} disabled={!newForm.subject}>Crea</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
