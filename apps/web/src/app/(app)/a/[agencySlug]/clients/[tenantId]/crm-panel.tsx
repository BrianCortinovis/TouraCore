'use client'

import { useState, useTransition } from 'react'
import { addNoteAction, addTaskAction, toggleTaskStatusAction, pinNoteAction } from './crm-actions'

interface Note {
  id: string
  body: string
  pinned: boolean
  created_at: string
  author_user_id: string | null
}

interface Task {
  id: string
  title: string
  description: string | null
  status: 'open' | 'in_progress' | 'done' | 'cancelled'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  due_date: string | null
  created_at: string
}

interface Props {
  agencySlug: string
  tenantId: string
  notes: Note[]
  tasks: Task[]
}

export function CrmPanel({ agencySlug, tenantId, notes, tasks }: Props) {
  const [tab, setTab] = useState<'notes' | 'tasks'>('notes')

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <header className="flex items-center gap-1 border-b border-slate-100 px-3 py-2">
        <TabBtn active={tab === 'notes'} onClick={() => setTab('notes')}>
          Note · {notes.length}
        </TabBtn>
        <TabBtn active={tab === 'tasks'} onClick={() => setTab('tasks')}>
          Task · {tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled').length} aperti
        </TabBtn>
      </header>
      <div className="p-3">
        {tab === 'notes' && <NotesTab agencySlug={agencySlug} tenantId={tenantId} notes={notes} />}
        {tab === 'tasks' && <TasksTab agencySlug={agencySlug} tenantId={tenantId} tasks={tasks} />}
      </div>
    </section>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-3 py-1 text-xs font-medium ${
        active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  )
}

function NotesTab({ agencySlug, tenantId, notes }: { agencySlug: string; tenantId: string; notes: Note[] }) {
  const [body, setBody] = useState('')
  const [pending, start] = useTransition()

  function add() {
    if (!body.trim()) return
    start(async () => {
      const res = await addNoteAction({ agencySlug, tenantId, body })
      if (res.ok) setBody('')
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Aggiungi nota interna…"
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button
          type="button"
          onClick={add}
          disabled={pending || !body.trim()}
          className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          Aggiungi
        </button>
      </div>
      {notes.length === 0 ? (
        <p className="py-3 text-center text-xs text-slate-500">Nessuna nota ancora.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {notes.map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-2 py-2 text-sm">
              <div className="flex-1">
                {n.pinned && <span className="mr-1 text-amber-600">📌</span>}
                <span className="whitespace-pre-wrap">{n.body}</span>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  {new Date(n.created_at).toLocaleString('it-IT')}
                </p>
              </div>
              <form action={pinNoteAction} className="flex">
                <input type="hidden" name="agencySlug" value={agencySlug} />
                <input type="hidden" name="noteId" value={n.id} />
                <input type="hidden" name="pinned" value={String(!n.pinned)} />
                <button className="text-xs text-slate-400 hover:text-amber-600" title={n.pinned ? 'Rimuovi pin' : 'Pin'}>
                  {n.pinned ? '📌' : '📍'}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function TasksTab({ agencySlug, tenantId, tasks }: { agencySlug: string; tenantId: string; tasks: Task[] }) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
  const [dueDate, setDueDate] = useState('')
  const [pending, start] = useTransition()

  function add() {
    if (!title.trim()) return
    start(async () => {
      const res = await addTaskAction({ agencySlug, tenantId, title, priority, dueDate: dueDate || null })
      if (res.ok) {
        setTitle('')
        setDueDate('')
      }
    })
  }

  const open = tasks.filter((t) => t.status === 'open' || t.status === 'in_progress')
  const done = tasks.filter((t) => t.status === 'done' || t.status === 'cancelled')

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2">
        <input
          className="rounded border border-slate-300 px-3 py-1.5 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nuovo task…"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as typeof priority)}
          className="rounded border border-slate-300 px-2 py-1.5 text-xs"
        >
          <option value="low">Bassa</option>
          <option value="normal">Normale</option>
          <option value="high">Alta</option>
          <option value="urgent">Urgente</option>
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1.5 text-xs"
        />
        <button
          type="button"
          onClick={add}
          disabled={pending || !title.trim()}
          className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          Aggiungi
        </button>
      </div>

      {open.length === 0 && done.length === 0 ? (
        <p className="py-3 text-center text-xs text-slate-500">Nessun task ancora.</p>
      ) : (
        <>
          <TaskList title="Aperti" tasks={open} agencySlug={agencySlug} />
          {done.length > 0 && <TaskList title="Completati" tasks={done} agencySlug={agencySlug} />}
        </>
      )}
    </div>
  )
}

function TaskList({ title, tasks, agencySlug }: { title: string; tasks: Task[]; agencySlug: string }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <ul className="divide-y divide-slate-100 rounded border border-slate-100">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <form action={toggleTaskStatusAction}>
              <input type="hidden" name="agencySlug" value={agencySlug} />
              <input type="hidden" name="taskId" value={t.id} />
              <input type="hidden" name="nextStatus" value={t.status === 'done' ? 'open' : 'done'} />
              <button type="submit" className="text-base">
                {t.status === 'done' ? '✅' : '⬜️'}
              </button>
            </form>
            <div className="flex-1">
              <p className={t.status === 'done' ? 'text-slate-400 line-through' : ''}>{t.title}</p>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                {t.due_date && <span>Scad. {new Date(t.due_date).toLocaleDateString('it-IT')}</span>}
                <span className={priorityColor(t.priority)}>{priorityLabel(t.priority)}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function priorityLabel(p: string): string {
  if (p === 'low') return 'Bassa'
  if (p === 'normal') return 'Normale'
  if (p === 'high') return 'Alta'
  if (p === 'urgent') return 'Urgente'
  return p
}

function priorityColor(p: string): string {
  if (p === 'urgent') return 'text-rose-600 font-medium'
  if (p === 'high') return 'text-amber-600 font-medium'
  return 'text-slate-500'
}
