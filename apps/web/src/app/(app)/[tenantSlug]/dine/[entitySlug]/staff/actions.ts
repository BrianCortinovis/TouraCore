'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { z } from 'zod'

const StaffSchema = z.object({
  restaurantId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  fullName: z.string().min(1).max(120),
  role: z.enum([
    'chef', 'sous_chef', 'line_cook', 'pastry_chef', 'dishwasher',
    'maitre', 'waiter', 'runner', 'sommelier', 'barman', 'host',
  ]),
  pinCode: z.string().min(4).max(10).optional(),
  hourlyRate: z.number().min(0).optional(),
})

const ShiftSchema = z.object({
  restaurantId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  staffId: z.string().uuid(),
  startAt: z.string(),
  endAt: z.string(),
  role: z.string(),
  notes: z.string().optional(),
})

const ClockSchema = z.object({
  restaurantId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  pinCode: z.string(),
  action: z.enum(['in', 'out']),
})

const TipPoolSchema = z.object({
  restaurantId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  totalAmount: z.number().min(0),
  ruleType: z.enum(['egalitarian', 'weighted_role', 'seniority']).default('egalitarian'),
})

function pathFor(p: { tenantSlug: string; entitySlug: string }) {
  return `/${p.tenantSlug}/dine/${p.entitySlug}/staff`
}

export async function createStaff(input: z.infer<typeof StaffSchema>) {
  const parsed = StaffSchema.parse(input)
  const admin = await createServiceRoleClient()
  const { error } = await admin.from('restaurant_staff').insert({
    restaurant_id: parsed.restaurantId,
    full_name: parsed.fullName,
    role: parsed.role,
    pin_code: parsed.pinCode ?? null,
    hourly_rate: parsed.hourlyRate ?? null,
  })
  if (error) throw new Error(error.message)
  revalidatePath(pathFor(parsed))
}

export async function createShift(input: z.infer<typeof ShiftSchema>) {
  const parsed = ShiftSchema.parse(input)
  const admin = await createServiceRoleClient()
  const { error } = await admin.from('staff_shifts').insert({
    restaurant_id: parsed.restaurantId,
    staff_id: parsed.staffId,
    start_at: parsed.startAt,
    end_at: parsed.endAt,
    role: parsed.role,
    notes: parsed.notes ?? null,
  })
  if (error) throw new Error(error.message)
  revalidatePath(pathFor(parsed))
}

export async function clockInOut(input: z.infer<typeof ClockSchema>) {
  const parsed = ClockSchema.parse(input)
  const admin = await createServiceRoleClient()

  const { data: staff } = await admin
    .from('restaurant_staff')
    .select('id, full_name')
    .eq('restaurant_id', parsed.restaurantId)
    .eq('pin_code', parsed.pinCode)
    .eq('active', true)
    .maybeSingle()

  if (!staff) throw new Error('PIN errato')

  if (parsed.action === 'in') {
    await admin.from('time_clock_entries').insert({
      staff_id: staff.id,
      clock_in: new Date().toISOString(),
      source: 'pin',
    })
    return { staffName: staff.full_name as string, action: 'in' as const }
  }

  // Find open entry
  const { data: open } = await admin
    .from('time_clock_entries')
    .select('id')
    .eq('staff_id', staff.id)
    .is('clock_out', null)
    .order('clock_in', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!open) throw new Error('Nessun clock-in aperto')

  await admin
    .from('time_clock_entries')
    .update({ clock_out: new Date().toISOString() })
    .eq('id', open.id)

  return { staffName: staff.full_name as string, action: 'out' as const }
}

export async function createTipPool(input: z.infer<typeof TipPoolSchema>) {
  const parsed = TipPoolSchema.parse(input)
  const admin = await createServiceRoleClient()

  const { data: pool, error } = await admin
    .from('tip_pools')
    .insert({
      restaurant_id: parsed.restaurantId,
      period_start: parsed.periodStart,
      period_end: parsed.periodEnd,
      total_amount: parsed.totalAmount,
      rule_type: parsed.ruleType,
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  // Calc distribution
  const { data: clockEntries } = await admin
    .from('time_clock_entries')
    .select('staff_id, clock_in, clock_out, break_minutes, restaurant_staff!inner(restaurant_id, full_name, role, active)')
    .eq('restaurant_staff.restaurant_id', parsed.restaurantId)
    .eq('restaurant_staff.active', true)
    .gte('clock_in', `${parsed.periodStart}T00:00:00Z`)
    .lte('clock_in', `${parsed.periodEnd}T23:59:59Z`)
    .not('clock_out', 'is', null)

  const hoursPerStaff = new Map<string, number>()
  for (const e of clockEntries ?? []) {
    const start = new Date(e.clock_in as string).getTime()
    const end = new Date(e.clock_out as string).getTime()
    const minutes = Math.max(0, (end - start) / 60000 - (e.break_minutes as number))
    const hours = minutes / 60
    hoursPerStaff.set(e.staff_id as string, (hoursPerStaff.get(e.staff_id as string) ?? 0) + hours)
  }

  const totalHours = Array.from(hoursPerStaff.values()).reduce((sum, h) => sum + h, 0)
  if (totalHours === 0) {
    revalidatePath(pathFor(parsed))
    return { poolId: pool.id }
  }

  const distributions = Array.from(hoursPerStaff.entries()).map(([staffId, hours]) => ({
    pool_id: pool.id,
    staff_id: staffId,
    amount: +(parsed.totalAmount * (hours / totalHours)).toFixed(2),
    hours_worked: +hours.toFixed(2),
    weight: +(hours / totalHours).toFixed(4),
  }))

  await admin.from('tip_distributions').insert(distributions)
  await admin.from('tip_pools').update({ status: 'distributed' }).eq('id', pool.id)

  revalidatePath(pathFor(parsed))
  return { poolId: pool.id }
}
