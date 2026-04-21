'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button, Card, CardContent, Input } from '@touracore/ui'
import { useAuthStore } from '@touracore/auth/store'
import { listHousekeepingTemplatesAction, saveHousekeepingTemplateAction } from '../competitive-actions'

interface Template {
  id: string
  task_type: string
  checklist: string[]
  estimated_minutes: number | null
  entity_id: string | null
  room_type_id: string | null
  created_at: string
}

const TASK_TYPES = ['turnover', 'daily', 'deep_clean', 'maintenance', 'inspection']

export default function HousekeepingPage() {
  const tenantId = useAuthStore((s) => s.tenant?.id)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [taskType, setTaskType] = useState<string>(TASK_TYPES[0]!)
  const [checklistText, setChecklistText] = useState('')
  const [minutes, setMinutes] = useState<number | ''>('')

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    const data = (await listHousekeepingTemplatesAction(tenantId)) as Template[]
    setTemplates(data)
    setLoading(false)
  }, [tenantId])

  useEffect(() => { void load() }, [load])

  const handleSave = async () => {
    if (!tenantId) return
    const checklist = checklistText.split('\n').map((s) => s.trim()).filter(Boolean)
    if (checklist.length === 0) {
      alert('Aggiungi almeno un punto checklist')
      return
    }
    const result = await saveHousekeepingTemplateAction({
      tenantId,
      taskType,
      checklist,
      estimatedMinutes: typeof minutes === 'number' ? minutes : undefined,
    })
    if (result.success) {
      setShowForm(false)
      setChecklistText('')
      setMinutes('')
      void load()
    } else {
      alert(`Errore: ${result.error}`)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Checklist Housekeeping</h1>
          <p className="text-sm text-gray-500">Template attività pulizie per task type</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Annulla' : 'Nuovo template'}
        </Button>
      </header>

      {showForm && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div>
              <label className="block text-xs font-medium text-gray-600">Tipo attività</label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
              >
                {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Checklist (uno per riga)</label>
              <textarea
                value={checklistText}
                onChange={(e) => setChecklistText(e.target.value)}
                rows={8}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder={'Cambio lenzuola\nPulizia bagno\nRicarica minibar'}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Minuti stimati</label>
              <Input
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value ? Number(e.target.value) : '')}
                className="max-w-[120px]"
              />
            </div>
            <Button onClick={handleSave}>Salva template</Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Caricamento...</p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-gray-500">Nessun template configurato</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="space-y-2 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase text-gray-500">{t.task_type}</span>
                  {t.estimated_minutes && <span className="text-xs text-gray-400">{t.estimated_minutes} min</span>}
                </div>
                <ul className="list-inside list-disc space-y-1 text-xs">
                  {t.checklist.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
