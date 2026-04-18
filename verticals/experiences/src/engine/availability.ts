import { createServiceRoleClient } from '@touracore/db'
import type { ExperienceSchedule, WeeklyRule, ScheduleException, ScheduleBlackout } from '../types/database'

export interface GenerateSlotsParams {
  scheduleId: string
  productId: string
  tenantId: string
  fromDate: string
  toDate: string
  durationMinutes: number
  timezone?: string
}

export async function generateSlotsForSchedule(params: GenerateSlotsParams): Promise<number> {
  const supabase = await createServiceRoleClient()
  const { data: schedule } = await supabase
    .from('experience_schedules')
    .select('*')
    .eq('id', params.scheduleId)
    .single()

  if (!schedule) return 0
  const sch = schedule as unknown as ExperienceSchedule
  if (!sch.active) return 0

  const weeklyRules = (sch.weekly_rules ?? []) as WeeklyRule[]
  const exceptions = (sch.exceptions ?? []) as ScheduleException[]
  const blackouts = (sch.blackouts ?? []) as ScheduleBlackout[]
  const exceptionsMap = new Map(exceptions.map((e) => [e.date, e]))

  const from = new Date(params.fromDate + 'T00:00:00Z')
  const to = new Date(params.toDate + 'T23:59:59Z')

  const toInsert: Array<{
    product_id: string
    schedule_id: string
    tenant_id: string
    start_at: string
    end_at: string
    capacity_total: number
    status: 'open'
  }> = []

  for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10)

    const inBlackout = blackouts.some((b) => dateStr >= b.from && dateStr <= b.to)
    if (inBlackout) continue

    const exc = exceptionsMap.get(dateStr)
    if (exc?.closed) continue

    const dow = d.getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6
    const slots = exc?.slots ?? weeklyRules.find((r) => r.dow === dow)?.slots ?? []

    for (const slot of slots) {
      const [h = 0, m = 0] = slot.start.split(':').map(Number)
      const start = new Date(d)
      start.setUTCHours(h, m, 0, 0)
      const end = new Date(start.getTime() + params.durationMinutes * 60 * 1000)

      toInsert.push({
        product_id: params.productId,
        schedule_id: params.scheduleId,
        tenant_id: params.tenantId,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        capacity_total: slot.capacity,
        status: 'open',
      })
    }
  }

  if (toInsert.length === 0) return 0

  const { error, count } = await supabase
    .from('experience_timeslots')
    .upsert(toInsert, { onConflict: 'product_id,start_at', ignoreDuplicates: true, count: 'exact' })

  if (error) throw error

  await supabase
    .from('experience_schedules')
    .update({ last_generated_at: new Date().toISOString() })
    .eq('id', params.scheduleId)

  return count ?? toInsert.length
}
