import { createServerSupabaseClient } from '@touracore/db'
import { getCurrentOrg } from './auth'
import type { HousekeepingTask, Room, RoomType, StaffMember } from '../types/database'

type HousekeepingTaskWithRelations = HousekeepingTask & {
  room: Room & { room_type: RoomType }
  assigned_staff: StaffMember | null
}

const HOUSEKEEPING_SELECT = `
  *,
  room:rooms(*, room_type:room_types(*)),
  assigned_staff:staff_members!housekeeping_tasks_assigned_to_fkey(*)
`

export async function getHousekeepingTasks(date?: string) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id
  const targetDate = date ?? new Date().toISOString().split('T')[0]!

  let query = supabase
    .from('housekeeping_tasks')
    .select(HOUSEKEEPING_SELECT)
    .eq('task_date', targetDate)

  if (propId) query = query.eq('entity_id', propId)

  const { data, error } = await query
    .order('priority', { ascending: true })
    .order('room_id', { ascending: true })

  if (error) throw error
  return data as HousekeepingTaskWithRelations[]
}

export async function getTodayTasks() {
  const today = new Date().toISOString().split('T')[0]!
  return getHousekeepingTasks(today)
}
