'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { z } from 'zod'

const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  rotation: z.number().default(0),
})

export type TablePosition = z.infer<typeof PositionSchema>

const CreateRoomSchema = z.object({
  restaurantId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  name: z.string().min(1).max(100),
  zoneType: z.enum(['indoor', 'outdoor', 'private', 'bar', 'lounge']).default('indoor'),
})

const UpdateRoomSchema = z.object({
  roomId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  name: z.string().min(1).max(100).optional(),
  layout: z.object({ width: z.number(), height: z.number() }).optional(),
})

const DeleteRoomSchema = z.object({
  roomId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
})

const CreateTableSchema = z.object({
  restaurantId: z.string().uuid(),
  roomId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  code: z.string().min(1).max(20),
  shape: z.enum(['round', 'square', 'rect', 'custom']).default('square'),
  seatsMin: z.number().int().min(1).default(1),
  seatsMax: z.number().int().min(1).default(4),
  seatsDefault: z.number().int().min(1).default(4),
  position: PositionSchema,
})

const UpdateTablePositionSchema = z.object({
  tableId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  position: PositionSchema,
})

const UpdateTableSchema = z.object({
  tableId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  code: z.string().min(1).max(20).optional(),
  seatsMin: z.number().int().min(1).optional(),
  seatsMax: z.number().int().min(1).optional(),
  seatsDefault: z.number().int().min(1).optional(),
  attributes: z.array(z.string()).optional(),
  joinableWith: z.array(z.string().uuid()).optional(),
})

const DeleteTableSchema = z.object({
  tableId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
})

function pathFor(slugPair: { tenantSlug: string; entitySlug: string }): string {
  return `/${slugPair.tenantSlug}/dine/${slugPair.entitySlug}/floor-plan`
}

export async function createRoom(input: z.infer<typeof CreateRoomSchema>) {
  const parsed = CreateRoomSchema.parse(input)
  const admin = await createServiceRoleClient()
  const { data, error } = await admin
    .from('restaurant_rooms')
    .insert({
      restaurant_id: parsed.restaurantId,
      name: parsed.name,
      zone_type: parsed.zoneType,
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath(pathFor(parsed))
  return { roomId: data.id as string }
}

export async function updateRoom(input: z.infer<typeof UpdateRoomSchema>) {
  const parsed = UpdateRoomSchema.parse(input)
  const admin = await createServiceRoleClient()
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (parsed.name !== undefined) update.name = parsed.name
  if (parsed.layout !== undefined) update.layout = parsed.layout
  const { error } = await admin.from('restaurant_rooms').update(update).eq('id', parsed.roomId)
  if (error) throw new Error(error.message)
  revalidatePath(pathFor(parsed))
}

export async function deleteRoom(input: z.infer<typeof DeleteRoomSchema>) {
  const parsed = DeleteRoomSchema.parse(input)
  const admin = await createServiceRoleClient()
  const { error } = await admin.from('restaurant_rooms').update({ active: false }).eq('id', parsed.roomId)
  if (error) throw new Error(error.message)
  revalidatePath(pathFor(parsed))
}

export async function createTable(input: z.infer<typeof CreateTableSchema>) {
  const parsed = CreateTableSchema.parse(input)
  const admin = await createServiceRoleClient()
  const { data, error } = await admin
    .from('restaurant_tables')
    .insert({
      restaurant_id: parsed.restaurantId,
      room_id: parsed.roomId,
      code: parsed.code,
      shape: parsed.shape,
      seats_min: parsed.seatsMin,
      seats_max: parsed.seatsMax,
      seats_default: parsed.seatsDefault,
      position: parsed.position,
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath(pathFor(parsed))
  return { tableId: data.id as string }
}

export async function updateTablePosition(input: z.infer<typeof UpdateTablePositionSchema>) {
  const parsed = UpdateTablePositionSchema.parse(input)
  const admin = await createServiceRoleClient()
  const { error } = await admin
    .from('restaurant_tables')
    .update({ position: parsed.position, updated_at: new Date().toISOString() })
    .eq('id', parsed.tableId)
  if (error) throw new Error(error.message)
  revalidatePath(pathFor(parsed))
}

export async function updateTable(input: z.infer<typeof UpdateTableSchema>) {
  const parsed = UpdateTableSchema.parse(input)
  const admin = await createServiceRoleClient()
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (parsed.code !== undefined) update.code = parsed.code
  if (parsed.seatsMin !== undefined) update.seats_min = parsed.seatsMin
  if (parsed.seatsMax !== undefined) update.seats_max = parsed.seatsMax
  if (parsed.seatsDefault !== undefined) update.seats_default = parsed.seatsDefault
  if (parsed.attributes !== undefined) update.attributes = parsed.attributes
  if (parsed.joinableWith !== undefined) update.joinable_with = parsed.joinableWith
  const { error } = await admin.from('restaurant_tables').update(update).eq('id', parsed.tableId)
  if (error) throw new Error(error.message)
  revalidatePath(pathFor(parsed))
}

export async function deleteTable(input: z.infer<typeof DeleteTableSchema>) {
  const parsed = DeleteTableSchema.parse(input)
  const admin = await createServiceRoleClient()
  const { error } = await admin.from('restaurant_tables').update({ active: false }).eq('id', parsed.tableId)
  if (error) throw new Error(error.message)
  revalidatePath(pathFor(parsed))
}
