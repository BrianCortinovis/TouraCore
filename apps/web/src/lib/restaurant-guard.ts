import 'server-only'
import { createServiceRoleClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'

export class RestaurantAccessError extends Error {
  constructor(message = 'Forbidden: restaurant access denied') {
    super(message)
    this.name = 'RestaurantAccessError'
  }
}

/**
 * Verifica che l'utente corrente abbia accesso al restaurant_id specificato.
 * Risolvendo: restaurant -> tenant_id -> memberships(user_id) o agency_tenant_links(agency_id) o platform_admin.
 * Throws se non autorizzato. Ritorna {restaurantId, tenantId} se OK.
 */
export async function assertUserOwnsRestaurant(restaurantId: string): Promise<{
  restaurantId: string
  tenantId: string
}> {
  const user = await getCurrentUser()
  if (!user) throw new RestaurantAccessError('Not authenticated')

  const admin = await createServiceRoleClient()

  const { data: rest } = await admin
    .from('restaurants')
    .select('id, tenant_id')
    .eq('id', restaurantId)
    .maybeSingle()

  if (!rest) throw new RestaurantAccessError('Restaurant not found')

  const tenantId = rest.tenant_id as string

  // 1. Platform admin?
  const { data: platformAdmin } = await admin
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (platformAdmin) return { restaurantId, tenantId }

  // 2. Membership diretto?
  const { data: membership } = await admin
    .from('memberships')
    .select('id')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .maybeSingle()
  if (membership) return { restaurantId, tenantId }

  // 3. Agency link?
  const { data: agencyLinks } = await admin
    .from('agency_memberships')
    .select('agency_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
  if (agencyLinks && agencyLinks.length > 0) {
    const agencyIds = agencyLinks.map((a) => a.agency_id as string)
    const { data: tenantLink } = await admin
      .from('agency_tenant_links')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('agency_id', agencyIds)
      .eq('status', 'active')
      .maybeSingle()
    if (tenantLink) return { restaurantId, tenantId }
  }

  throw new RestaurantAccessError()
}

/**
 * Verifica che order_id appartiene a restaurant accessibile dall'utente.
 * Ritorna restaurant_id + tenant_id.
 */
export async function assertUserOwnsOrder(orderId: string): Promise<{
  orderId: string
  restaurantId: string
  tenantId: string
}> {
  const admin = await createServiceRoleClient()
  const { data: order } = await admin
    .from('restaurant_orders')
    .select('restaurant_id')
    .eq('id', orderId)
    .maybeSingle()
  if (!order) throw new RestaurantAccessError('Order not found')

  const result = await assertUserOwnsRestaurant(order.restaurant_id as string)
  return { orderId, restaurantId: result.restaurantId, tenantId: result.tenantId }
}

/**
 * Verifica che reservation hospitality appartiene a stesso tenant del restaurant.
 * Per charge-to-room: previene cross-tenant linking.
 */
export async function assertSameTenantReservation(
  restaurantId: string,
  hospitalityReservationId: string,
): Promise<void> {
  const admin = await createServiceRoleClient()

  const { data: rest } = await admin
    .from('restaurants')
    .select('tenant_id')
    .eq('id', restaurantId)
    .maybeSingle()
  if (!rest) throw new RestaurantAccessError('Restaurant not found')

  const { data: res } = await admin
    .from('reservations')
    .select('entity_id, entities(tenant_id)')
    .eq('id', hospitalityReservationId)
    .maybeSingle()
  if (!res) throw new RestaurantAccessError('Stay reservation not found')

  const ent = Array.isArray(res.entities) ? res.entities[0] : res.entities
  const stayTenantId = (ent as { tenant_id?: string } | null)?.tenant_id

  if (!stayTenantId || stayTenantId !== rest.tenant_id) {
    throw new RestaurantAccessError('Tenant mismatch: stay reservation belongs to different tenant')
  }
}

/**
 * Verifica che table appartiene al restaurant.
 */
export async function assertTableInRestaurant(restaurantId: string, tableId: string): Promise<void> {
  const admin = await createServiceRoleClient()
  const { data } = await admin
    .from('restaurant_tables')
    .select('id')
    .eq('id', tableId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle()
  if (!data) throw new RestaurantAccessError('Table not found in restaurant')
}

/**
 * Verifica che room appartiene al restaurant.
 */
export async function assertRoomInRestaurant(restaurantId: string, roomId: string): Promise<void> {
  const admin = await createServiceRoleClient()
  const { data } = await admin
    .from('restaurant_rooms')
    .select('id')
    .eq('id', roomId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle()
  if (!data) throw new RestaurantAccessError('Room not found in restaurant')
}

/**
 * Verifica che ingredient appartiene al restaurant.
 */
export async function assertIngredientInRestaurant(restaurantId: string, ingredientId: string): Promise<void> {
  const admin = await createServiceRoleClient()
  const { data } = await admin
    .from('ingredients')
    .select('id')
    .eq('id', ingredientId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle()
  if (!data) throw new RestaurantAccessError('Ingredient not found in restaurant')
}
