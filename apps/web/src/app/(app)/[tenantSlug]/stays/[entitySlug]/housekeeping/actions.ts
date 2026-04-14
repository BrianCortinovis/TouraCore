'use server'

import { createServerSupabaseClient } from '@touracore/db'
import { requireCurrentEntity } from '@touracore/hospitality/src/auth/access'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

interface ActionResult {
  success: boolean
  error?: string
  data?: Record<string, unknown>
}

const taskTypeEnum = z.enum(['checkout_clean', 'stay_clean', 'deep_clean', 'turndown', 'maintenance', 'inspection'])
const priorityEnum = z.enum(['low', 'normal', 'high', 'urgent'])

const createTaskSchema = z.object({
  room_id: z.string().uuid(),
  task_date: z.string(),
  task_type: taskTypeEnum,
  priority: priorityEnum.default('normal'),
  assigned_to: z.string().uuid().nullish(),
  notes: z.string().max(2000).nullish(),
})

export async function loadHousekeepingAction(filters?: {
  date?: string
  status?: string
  taskType?: string
}): Promise<ActionResult> {
  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()

    const targetDate = filters?.date ?? new Date().toISOString().split('T')[0]

    let query = supabase
      .from('housekeeping_tasks')
      .select('*, room:rooms(id, name, floor)')
      .eq('entity_id', property.id)
      .eq('task_date', targetDate)

    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.taskType) query = query.eq('task_type', filters.taskType)

    const { data, error } = await query
      .order('priority', { ascending: false })
      .order('room_id')

    if (error) return { success: false, error: error.message }

    const stats = (data ?? []).reduce(
      (acc, t) => {
        acc.total++
        acc[t.status as string] = (acc[t.status as string] ?? 0) + 1
        return acc
      },
      { total: 0 } as Record<string, number>,
    )

    return { success: true, data: { tasks: data ?? [], stats, date: targetDate } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function createHousekeepingTaskAction(raw: z.infer<typeof createTaskSchema>): Promise<ActionResult> {
  const parsed = createTaskSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' }

  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('housekeeping_tasks')
      .insert({
        entity_id: property.id,
        room_id: parsed.data.room_id,
        task_date: parsed.data.task_date,
        task_type: parsed.data.task_type,
        priority: parsed.data.priority,
        assigned_to: parsed.data.assigned_to ?? null,
        notes: parsed.data.notes ?? null,
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    revalidatePath('/housekeeping')
    return { success: true, data: { task: data } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function updateTaskStatusAction(
  taskId: string,
  status: string,
): Promise<ActionResult> {
  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()

    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() }

    if (status === 'in_progress') updates.started_at = new Date().toISOString()
    if (status === 'completed') updates.completed_at = new Date().toISOString()

    const { error } = await supabase
      .from('housekeeping_tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('entity_id', property.id)

    if (error) return { success: false, error: error.message }
    revalidatePath('/housekeeping')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function deleteHousekeepingTaskAction(taskId: string): Promise<ActionResult> {
  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()

    const { error } = await supabase
      .from('housekeeping_tasks')
      .delete()
      .eq('id', taskId)
      .eq('entity_id', property.id)

    if (error) return { success: false, error: error.message }
    revalidatePath('/housekeeping')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function loadRoomsForHousekeepingAction(): Promise<ActionResult> {
  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('rooms')
      .select('id, name, floor, status')
      .eq('entity_id', property.id)
      .order('floor')
      .order('name')

    if (error) return { success: false, error: error.message }
    return { success: true, data: { rooms: data ?? [] } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}
