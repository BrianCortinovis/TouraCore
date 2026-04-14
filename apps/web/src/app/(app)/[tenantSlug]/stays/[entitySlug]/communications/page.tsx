'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button, Input, Badge, Card, CardContent, Modal, cn } from '@touracore/ui'
import {
  Mail, MessageSquare, Phone, Plus, Edit, Trash2,
  Save, X, ToggleLeft, ToggleRight, Send,
  CheckCircle, AlertCircle,
} from 'lucide-react'
import {
  loadTemplatesAction, createTemplateAction, updateTemplateAction,
  deleteTemplateAction, toggleTemplateAction, loadSentMessagesAction,
} from './actions'
import type { TemplateData } from './actions'

const TRIGGER_LABELS: Record<string, string> = {
  booking_confirmed: 'Prenotazione confermata',
  booking_cancelled: 'Prenotazione annullata',
  pre_arrival: 'Pre-arrivo',
  check_in: 'Check-in',
  check_out: 'Check-out',
  post_stay: 'Post-soggiorno',
  birthday: 'Compleanno',
  manual: 'Invio manuale',
  quote_sent: 'Preventivo inviato',
  payment_reminder: 'Sollecito pagamento',
}

const TRIGGER_ICONS: Record<string, string> = {
  booking_confirmed: 'text-green-600 bg-green-50',
  booking_cancelled: 'text-red-600 bg-red-50',
  pre_arrival: 'text-blue-600 bg-blue-50',
  check_in: 'text-indigo-600 bg-indigo-50',
  check_out: 'text-orange-600 bg-orange-50',
  post_stay: 'text-purple-600 bg-purple-50',
  birthday: 'text-pink-600 bg-pink-50',
  manual: 'text-gray-600 bg-gray-50',
  quote_sent: 'text-cyan-600 bg-cyan-50',
  payment_reminder: 'text-amber-600 bg-amber-50',
}

const CHANNEL_ICONS: Record<string, typeof Mail> = {
  email: Mail,
  whatsapp: MessageSquare,
  sms: Phone,
}

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  queued: { label: 'In coda', color: 'bg-yellow-100 text-yellow-800' },
  sent: { label: 'Inviato', color: 'bg-blue-100 text-blue-800' },
  delivered: { label: 'Consegnato', color: 'bg-green-100 text-green-800' },
  opened: { label: 'Aperto', color: 'bg-emerald-100 text-emerald-800' },
  failed: { label: 'Fallito', color: 'bg-red-100 text-red-800' },
  bounced: { label: 'Rimbalzato', color: 'bg-gray-100 text-gray-800' },
}

const AVAILABLE_VARIABLES = [
  { key: 'guest_name', label: 'Nome ospite' },
  { key: 'guest_first_name', label: 'Nome' },
  { key: 'guest_last_name', label: 'Cognome' },
  { key: 'guest_email', label: 'Email ospite' },
  { key: 'check_in_date', label: 'Data check-in' },
  { key: 'check_out_date', label: 'Data check-out' },
  { key: 'nights', label: 'Numero notti' },
  { key: 'room_name', label: 'Nome camera' },
  { key: 'total_amount', label: 'Importo totale' },
  { key: 'property_name', label: 'Nome struttura' },
  { key: 'property_address', label: 'Indirizzo struttura' },
  { key: 'property_phone', label: 'Telefono struttura' },
  { key: 'reservation_code', label: 'Codice prenotazione' },
]

interface Template {
  id: string
  entity_id: string
  name: string
  trigger: string
  channel: string
  subject: string | null
  body_html: string | null
  body_text: string | null
  variables: string[]
  send_days_offset: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface SentMessage {
  id: string
  channel: string
  recipient: string
  subject: string | null
  status: string
  sent_at: string | null
  created_at: string
}

type TabView = 'templates' | 'history'

export default function CommunicationsPage() {
  const [view, setView] = useState<TabView>('templates')
  const [templates, setTemplates] = useState<Template[]>([])
  const [messages, setMessages] = useState<SentMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showEditor, setShowEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<TemplateData>({
    name: '',
    trigger: 'booking_confirmed',
    channel: 'email',
    subject: '',
    body_html: '',
    body_text: '',
    variables: [],
    send_days_offset: 0,
    is_active: true,
  })

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    const result = await loadTemplatesAction()
    if (result.success && result.data) {
      setTemplates(result.data.templates as Template[])
    }
    setLoading(false)
  }, [])

  const loadMessages = useCallback(async () => {
    setLoading(true)
    const result = await loadSentMessagesAction({ limit: 50 })
    if (result.success && result.data) {
      setMessages(result.data.messages as SentMessage[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (view === 'templates') loadTemplates()
    else loadMessages()
  }, [view, loadTemplates, loadMessages])

  const openCreate = () => {
    setEditingTemplate(null)
    setForm({
      name: '',
      trigger: 'booking_confirmed',
      channel: 'email',
      subject: '',
      body_html: '',
      body_text: '',
      variables: [],
      send_days_offset: 0,
      is_active: true,
    })
    setShowEditor(true)
    setError('')
    setSuccess('')
  }

  const openEdit = (t: Template) => {
    setEditingTemplate(t)
    setForm({
      name: t.name,
      trigger: t.trigger as TemplateData['trigger'],
      channel: t.channel as TemplateData['channel'],
      subject: t.subject ?? '',
      body_html: t.body_html ?? '',
      body_text: t.body_text ?? '',
      variables: t.variables,
      send_days_offset: t.send_days_offset,
      is_active: t.is_active,
    })
    setShowEditor(true)
    setError('')
    setSuccess('')
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Nome template obbligatorio'); return }
    setSaving(true)
    setError('')

    const result = editingTemplate
      ? await updateTemplateAction(editingTemplate.id, form)
      : await createTemplateAction(form)

    setSaving(false)
    if (result.success) {
      setSuccess(editingTemplate ? 'Template aggiornato' : 'Template creato')
      setShowEditor(false)
      loadTemplates()
    } else {
      setError(result.error ?? 'Errore')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Eliminare il template "${name}"?`)) return
    const result = await deleteTemplateAction(id)
    if (result.success) {
      setSuccess('Template eliminato')
      loadTemplates()
    } else {
      setError(result.error ?? 'Errore')
    }
  }

  const handleToggle = async (id: string, current: boolean) => {
    const result = await toggleTemplateAction(id, !current)
    if (result.success) loadTemplates()
    else setError(result.error ?? 'Errore')
  }

  const insertVariable = (key: string) => {
    setForm((f) => ({
      ...f,
      body_text: (f.body_text ?? '') + `{{${key}}}`,
      body_html: (f.body_html ?? '') + `{{${key}}}`,
      variables: f.variables.includes(key) ? f.variables : [...f.variables, key],
    }))
  }

  const offsetLabel = (days: number) => {
    if (days === 0) return 'Al momento dell\'evento'
    if (days > 0) return `${days} giorn${days === 1 ? 'o' : 'i'} dopo`
    return `${Math.abs(days)} giorn${Math.abs(days) === 1 ? 'o' : 'i'} prima`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Mail className="h-6 w-6" />
            Comunicazioni
          </h1>
          <p className="mt-1 text-sm text-gray-500">Template e storico messaggi automatici</p>
        </div>
        {view === 'templates' && (
          <Button onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> Nuovo template
          </Button>
        )}
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <CheckCircle className="h-4 w-4" />{success}
          <button onClick={() => setSuccess('')} className="ml-auto text-green-600 hover:text-green-800"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
      {error && !showEditor && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="h-4 w-4" />{error}
          <button onClick={() => setError('')} className="ml-auto text-red-600 hover:text-red-800"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setView('templates')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            view === 'templates' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Template
        </button>
        <button
          onClick={() => setView('history')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            view === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Storico invii
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-500">Caricamento...</div>
      ) : view === 'templates' ? (
        templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Mail className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">Nessun template configurato</p>
              <p className="mt-1 text-xs text-gray-400">Crea il primo template per automatizzare le comunicazioni con gli ospiti</p>
              <Button className="mt-4" onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" /> Crea template</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => {
              const ChannelIcon = CHANNEL_ICONS[t.channel] ?? Mail
              return (
                <div
                  key={t.id}
                  className={cn(
                    'flex items-center gap-4 rounded-lg border p-4 transition-colors',
                    t.is_active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
                  )}
                >
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', TRIGGER_ICONS[t.trigger] ?? 'bg-gray-50 text-gray-600')}>
                    <ChannelIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{t.name}</span>
                      {!t.is_active && <Badge variant="secondary">Disattivato</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{TRIGGER_LABELS[t.trigger] ?? t.trigger}</span>
                      <span className="text-gray-300">|</span>
                      <span>{CHANNEL_LABELS[t.channel] ?? t.channel}</span>
                      <span className="text-gray-300">|</span>
                      <span>{offsetLabel(t.send_days_offset)}</span>
                    </div>
                    {t.subject && <div className="mt-0.5 text-xs text-gray-400">Oggetto: {t.subject}</div>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggle(t.id, t.is_active)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title={t.is_active ? 'Disattiva' : 'Attiva'}
                    >
                      {t.is_active ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => openEdit(t)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id, t.name)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        messages.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Send className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">Nessun messaggio inviato</p>
              <p className="mt-1 text-xs text-gray-400">I messaggi inviati automaticamente appariranno qui</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {messages.map((m) => {
              const st = STATUS_CONFIG[m.status] ?? { label: m.status, color: 'bg-gray-100 text-gray-800' }
              const ChannelIcon = CHANNEL_ICONS[m.channel] ?? Mail
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
                  <ChannelIcon className="h-4 w-4 text-gray-400" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900">{m.subject ?? 'Senza oggetto'}</div>
                    <div className="text-xs text-gray-500">{m.recipient}</div>
                  </div>
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', st.color)}>
                    {st.label}
                  </span>
                  <div className="text-xs text-gray-400">
                    {m.sent_at ? new Date(m.sent_at).toLocaleString('it-IT') : new Date(m.created_at).toLocaleString('it-IT')}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Template Editor Modal */}
      <Modal
        isOpen={showEditor}
        onClose={() => { setShowEditor(false); setError('') }}
        size="lg"
        title={editingTemplate ? 'Modifica template' : 'Nuovo template'}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nome template *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="es. Conferma prenotazione"
              autoFocus
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Evento trigger *</label>
              <select
                value={form.trigger}
                onChange={(e) => setForm({ ...form, trigger: e.target.value as TemplateData['trigger'] })}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Canale</label>
              <select
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value as TemplateData['channel'] })}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(CHANNEL_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Invio (offset giorni)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={form.send_days_offset}
                  onChange={(e) => setForm({ ...form, send_days_offset: Number(e.target.value) })}
                  min={-30}
                  max={365}
                  className="h-10 w-24 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-500">{offsetLabel(form.send_days_offset)}</span>
              </div>
            </div>
          </div>

          {form.channel === 'email' && (
            <Input
              label="Oggetto"
              value={form.subject ?? ''}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="es. Conferma prenotazione {{reservation_code}}"
            />
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Corpo del messaggio</label>
            <textarea
              value={form.body_text ?? ''}
              onChange={(e) => setForm({ ...form, body_text: e.target.value, body_html: e.target.value })}
              rows={8}
              className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Scrivi il messaggio... Usa {{variabile}} per inserire dati dinamici."
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-gray-600">Variabili disponibili (clicca per inserire)</label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariable(v.key)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs transition-colors',
                    form.variables.includes(v.key)
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:bg-blue-50'
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, is_active: !form.is_active })}
              className="flex items-center gap-2 text-sm"
            >
              {form.is_active
                ? <ToggleRight className="h-5 w-5 text-green-600" />
                : <ToggleLeft className="h-5 w-5 text-gray-400" />
              }
              <span className={form.is_active ? 'text-green-700' : 'text-gray-500'}>
                {form.is_active ? 'Attivo' : 'Disattivato'}
              </span>
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <Button variant="outline" onClick={() => { setShowEditor(false); setError('') }}>Annulla</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {saving ? 'Salvataggio...' : editingTemplate ? 'Aggiorna' : 'Crea template'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
