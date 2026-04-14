'use server'

import { revalidatePath } from 'next/cache'
import { assertCurrentEntityAccess, requireCurrentEntity } from '../auth/access'
import { createServerSupabaseClient } from '@touracore/db'
import type {
  HousekeepingTaskType,
  TaskStatus,
  TaskPriority,
  Json,
} from '../types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateTaskData {
  entity_id: string
  room_id: string
  task_date: string
  task_type: HousekeepingTaskType
  status?: TaskStatus
  priority?: TaskPriority
  assigned_to?: string | null
  checklist?: Json
  notes?: string | null
  maintenance_issue?: string | null
  photos?: string[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HOUSEKEEPING_PATHS = ['/housekeeping', '/rooms', '/dashboard']

function revalidateHousekeepingPaths() {
  for (const p of HOUSEKEEPING_PATHS) {
    revalidatePath(p)
  }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Create a new housekeeping task.
 */
export async function createTask(data: CreateTaskData) {
  if (!data.entity_id) throw new Error('entity_id is required')
  if (!data.room_id) throw new Error('room_id is required')
  if (!data.task_date) throw new Error('task_date is required')
  if (!data.task_type) throw new Error('task_type is required')

  await assertCurrentEntityAccess(data.entity_id)

  const supabase = await createServerSupabaseClient()
  const { data: room } = await supabase
    .from('rooms')
    .select('id')
    .eq('id', data.room_id)
    .eq('entity_id', data.entity_id)
    .maybeSingle()

  if (!room) {
    throw new Error('Room not found in this organization')
  }

  if (data.assigned_to) {
    const { data: assignedStaff } = await supabase
      .from('staff_members')
      .select('id')
      .eq('id', data.assigned_to)
      .eq('entity_id', data.entity_id)
      .maybeSingle()

    if (!assignedStaff) {
      throw new Error('Assigned staff member not found in this organization')
    }
  }

  const { data: task, error } = await supabase
    .from('housekeeping_tasks')
    .insert({
      entity_id: data.entity_id,
      room_id: data.room_id,
      task_date: data.task_date,
      task_type: data.task_type,
      status: data.status ?? 'pending',
      priority: data.priority ?? 'normal',
      assigned_to: data.assigned_to ?? null,
      checklist: data.checklist ?? [],
      notes: data.notes ?? null,
      maintenance_issue: data.maintenance_issue ?? null,
      photos: data.photos ?? [],
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create housekeeping task: ${error.message}`)

  revalidateHousekeepingPaths()
  return task
}

/**
 * Assign a task to a specific staff member.
 */
export async function assignTask(id: string, staffId: string) {
  if (!id) throw new Error('Task id is required')
  if (!staffId) throw new Error('Staff id is required')

  const supabase = await createServerSupabaseClient()
  const { property } = await requireCurrentEntity()
  const { data: assignedStaff } = await supabase
    .from('staff_members')
    .select('id')
    .eq('id', staffId)
    .eq('entity_id', property.id)
    .maybeSingle()

  if (!assignedStaff) {
    throw new Error('Staff member not found in this organization')
  }

  const { data: task, error } = await supabase
    .from('housekeeping_tasks')
    .update({
      assigned_to: staffId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('entity_id', property.id)
    .select()
    .single()

  if (error) throw new Error(`Failed to assign task: ${error.message}`)

  revalidateHousekeepingPaths()
  return task
}

/**
 * Start a housekeeping task. Sets status to 'in_progress' and records started_at.
 */
export async function startTask(id: string) {
  if (!id) throw new Error('Task id is required')

  const supabase = await createServerSupabaseClient()
  const { property } = await requireCurrentEntity()
  const now = new Date().toISOString()

  const { data: task, error } = await supabase
    .from('housekeeping_tasks')
    .update({
      status: 'in_progress' as TaskStatus,
      started_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .eq('entity_id', property.id)
    .select()
    .single()

  if (error) throw new Error(`Failed to start task: ${error.message}`)

  revalidateHousekeepingPaths()
  return task
}

/**
 * Complete a housekeeping task.
 * - Sets status to 'completed' and records completed_at.
 * - Also updates the associated room status to 'available'.
 */
export async function completeTask(id: string) {
  if (!id) throw new Error('Task id is required')

  const supabase = await createServerSupabaseClient()
  const { property } = await requireCurrentEntity()
  const now = new Date().toISOString()

  const { data: task, error } = await supabase
    .from('housekeeping_tasks')
    .update({
      status: 'completed' as TaskStatus,
      completed_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .eq('entity_id', property.id)
    .select()
    .single()

  if (error) throw new Error(`Failed to complete task: ${error.message}`)

  // Update the room status to 'available'
  if (task.room_id) {
    const { error: roomError } = await supabase
      .from('rooms')
      .update({ status: 'available', updated_at: now })
      .eq('id', task.room_id)
      .eq('entity_id', property.id)

    if (roomError) {
      console.error(`Failed to update room status after task completion: ${roomError.message}`)
    }
  }

  revalidateHousekeepingPaths()
  return task
}

/**
 * Mark a task as inspected by a staff member.
 * Sets status to 'inspected' and records inspected_by / inspected_at.
 */
export async function inspectTask(id: string, staffId: string) {
  if (!id) throw new Error('Task id is required')
  if (!staffId) throw new Error('Staff id (inspector) is required')

  const supabase = await createServerSupabaseClient()
  const { property } = await requireCurrentEntity()
  const now = new Date().toISOString()

  const { data: task, error } = await supabase
    .from('housekeeping_tasks')
    .update({
      status: 'inspected' as TaskStatus,
      inspected_by: staffId,
      inspected_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .eq('entity_id', property.id)
    .select()
    .single()

  if (error) throw new Error(`Failed to inspect task: ${error.message}`)

  revalidateHousekeepingPaths()
  return task
}
