'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button, Card, CardContent, Modal, cn } from '@touracore/ui'
import {
  Sparkles, Plus, ChevronLeft, ChevronRight,
  CheckCircle, AlertCircle, Clock, X,
  Play, Check, SkipForward, Trash2,
} from 'lucide-react'
import { format, addDays, subDays } from 'date-fns'
import { it } from 'date-fns/locale'
import { useAuthStore } from '@touracore/auth/store'
import { getStructureTerms } from '../../../../../structure-terms'
import {
  loadHousekeepingAction, createHousekeepingTaskAction,
  updateTaskStatusAction, deleteHousekeepingTaskAction,
  loadRoomsForHousekeepingAction,
} from './actions'

const TASK_TYPE_LABELS: Record<string, string> = {
  checkout_clean: 'Pulizia check-out',
  stay_clean: 'Pulizia soggiorno',
  deep_clean: 'Pulizia profonda',
  turndown: 'Turndown',
  maintenance: 'Manutenzione',
  inspection: 'Ispezione',
}

const TASK_TYPE_COLORS: Record<string, string> = {
  checkout_clean: 'bg-orange-100 text-orange-800',
  stay_clean: 'bg-blue-100 text-blue-800',
  deep_clean: 'bg-purple-100 text-purple-800',
  turndown: 'bg-indigo-100 text-indigo-800',
  maintenance: 'bg-red-100 text-red-800',
  inspection: 'bg-green-100 text-green-800',
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Da fare', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  in_progress: { label: 'In corso', color: 'bg-blue-100 text-blue-800', icon: Play },
  completed: { label: 'Completato', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  inspected: { label: 'Ispezionato', color: 'bg-emerald-100 text-emerald-800', icon: Check },
  skipped: { label: 'Saltato', color: 'bg-gray-100 text-gray-800', icon: SkipForward },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Urgente', color: 'bg-red-600 text-white' },
  high: { label: 'Alta', color: 'bg-orange-100 text-orange-800' },
  normal: { label: 'Normale', color: 'bg-gray-100 text-gray-700' },
  low: { label: 'Bassa', color: 'bg-gray-50 text-gray-500' },
}

interface HkTask {
  id: string
  room_id: string
  task_date: string
  task_type: string
  status: string
  priority: string
  assigned_to: string | null
  notes: string | null
  maintenance_issue: string | null
  started_at: string | null
  completed_at: string | null
  room: { id: string; name: string; floor: number | null } | null
}

interface RoomOption {
  id: string
  name: string
  floor: number | null
  status: string
}

export default function HousekeepingPage() {
  const { property } = useAuthStore()
  const terms = getStructureTerms(property?.property_type)
  const [tasks, setTasks] = useState<HkTask[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]!)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [rooms, setRooms] = useState<RoomOption[]>([])
  const [creating, setCreating] = useState(false)

  const [formRoom, setFormRoom] = useState('')
  const [formType, setFormType] = useState('checkout_clean')
  const [formPriority, setFormPriority] = useState('normal')
  const [formNotes, setFormNotes] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await loadHousekeepingAction({ date })
      if (result.success && result.data) {
        setTasks(result.data.tasks as HkTask[])
        setStats(result.data.stats as Record<string, number>)
      } else {
        setError(result.error ?? 'Errore')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore')
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => { loadData() }, [loadData])

  const loadRooms = useCallback(async () => {
    const result = await loadRoomsForHousekeepingAction()
    if (result.success && result.data) {
      setRooms(result.data.rooms as RoomOption[])
    }
  }, [])

  const openCreate = () => {
    setShowCreate(true)
    setFormRoom('')
    setFormType('checkout_clean')
    setFormPriority('normal')
    setFormNotes('')
    setError('')
    loadRooms()
  }

  const handleCreate = async () => {
    if (!formRoom) { setError(`Seleziona una ${terms.unitLabel}`); return }
    setCreating(true)
    setError('')

    const result = await createHousekeepingTaskAction({
      room_id: formRoom,
      task_date: date,
      task_type: formType as 'checkout_clean',
      priority: formPriority as 'normal',
      notes: formNotes || null,
    })

    if (result.success) {
      setSuccess('Task creato')
      setShowCreate(false)
      loadData()
    } else {
      setError(result.error ?? 'Errore')
    }
    setCreating(false)
  }

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const result = await updateTaskStatusAction(taskId, newStatus)
    if (result.success) loadData()
    else setError(result.error ?? 'Errore')
  }

  const handleDelete = async (taskId: string) => {
    if (!confirm('Eliminare questo task?')) return
    const result = await deleteHousekeepingTaskAction(taskId)
    if (result.success) loadData()
    else setError(result.error ?? 'Errore')
  }

  const prevDay = () => setDate(subDays(new Date(date), 1).toISOString().split('T')[0]!)
  const nextDay = () => setDate(addDays(new Date(date), 1).toISOString().split('T')[0]!)
  const today = () => setDate(new Date().toISOString().split('T')[0]!)

  const dateLabel = (() => {
    try { return format(new Date(date), 'EEEE d MMMM yyyy', { locale: it }) }
    catch { return date }
  })()

  const isToday = date === new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Sparkles className="h-6 w-6" />
            Housekeeping
          </h1>
          <p className="mt-1 text-sm text-gray-500">Gestione pulizie e manutenzione {terms.unitLabelPlural}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" /> Nuovo task
        </Button>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <CheckCircle className="h-4 w-4" />{success}
          <button onClick={() => setSuccess('')} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
      {error && !showCreate && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="h-4 w-4" />{error}
          <button onClick={() => setError('')} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Date nav + stats */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevDay}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="min-w-[200px] text-center">
            <div className="text-sm font-semibold capitalize">{dateLabel}</div>
          </div>
          <Button variant="outline" size="sm" onClick={nextDay}><ChevronRight className="h-4 w-4" /></Button>
          {!isToday && (
            <Button variant="ghost" size="sm" onClick={today} className="text-xs">Oggi</Button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-gray-500">{stats.total ?? 0} task</span>
          {(stats.completed ?? 0) > 0 && (
            <span className="text-green-600">{stats.completed} completati</span>
          )}
          {(stats.pending ?? 0) > 0 && (
            <span className="text-yellow-600">{stats.pending} da fare</span>
          )}
          {(stats.in_progress ?? 0) > 0 && (
            <span className="text-blue-600">{stats.in_progress} in corso</span>
          )}
        </div>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="py-8 text-center text-gray-500">Caricamento...</div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">Nessun task per questa data</p>
            <p className="mt-1 text-xs text-gray-400">Crea un nuovo task o seleziona un altro giorno</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const st = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pending!
            const pr = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.normal!
            const StatusIcon = st.icon
            return (
              <div
                key={task.id}
                className={cn(
                  'flex items-center gap-4 rounded-lg border p-4 transition-colors',
                  task.status === 'completed' || task.status === 'inspected'
                    ? 'border-gray-100 bg-gray-50'
                    : 'border-gray-200 bg-white'
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                  <StatusIcon className="h-5 w-5 text-gray-500" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {task.room?.name ?? terms.unitLabelTitle}
                    </span>
                    {task.room?.floor != null && (
                      <span className="text-xs text-gray-400">Piano {task.room.floor}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', TASK_TYPE_COLORS[task.task_type] ?? 'bg-gray-100 text-gray-700')}>
                      {TASK_TYPE_LABELS[task.task_type] ?? task.task_type}
                    </span>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', pr.color)}>
                      {pr.label}
                    </span>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', st.color)}>
                      {st.label}
                    </span>
                  </div>
                  {task.notes && <p className="mt-1 text-xs text-gray-500 truncate">{task.notes}</p>}
                </div>

                <div className="flex items-center gap-1">
                  {task.status === 'pending' && (
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange(task.id, 'in_progress')}>
                      <Play className="mr-1 h-3.5 w-3.5" /> Inizia
                    </Button>
                  )}
                  {task.status === 'in_progress' && (
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange(task.id, 'completed')}>
                      <Check className="mr-1 h-3.5 w-3.5" /> Completa
                    </Button>
                  )}
                  {task.status === 'completed' && (
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange(task.id, 'inspected')}>
                      <CheckCircle className="mr-1 h-3.5 w-3.5" /> Ispeziona
                    </Button>
                  )}
                  {(task.status === 'pending' || task.status === 'in_progress') && (
                    <Button variant="ghost" size="sm" onClick={() => handleStatusChange(task.id, 'skipped')}>
                      <SkipForward className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); setError('') }}
        title="Nuovo task housekeeping"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{terms.unitLabelTitle} *</label>
            <select
              value={formRoom}
              onChange={(e) => setFormRoom(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleziona {terms.unitLabel}</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}{r.floor != null ? ` (Piano ${r.floor})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Priorità</label>
              <select
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Note</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Note opzionali..."
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <Button variant="outline" onClick={() => { setShowCreate(false); setError('') }}>Annulla</Button>
            <Button onClick={handleCreate} disabled={creating || !formRoom}>
              {creating ? 'Creazione...' : 'Crea task'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
