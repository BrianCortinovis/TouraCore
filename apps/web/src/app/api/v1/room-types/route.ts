import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'
import { authenticateApiKey, createApiResponse, createErrorResponse } from '@touracore/api'

export async function GET(request: NextRequest) {
  const ctx = await authenticateApiKey(request.headers.get('authorization'))
  if (!ctx) return createErrorResponse('Unauthorized', 401)

  const entityId = request.nextUrl.searchParams.get('entity_id')

  const supabase = await createServiceRoleClient()

  const { data: properties } = await supabase
    .from('entities')
    .select('id')
    .eq('tenant_id', ctx.tenantId)

  const entityIds = (properties ?? []).map((p) => p.id)
  if (entityIds.length === 0) return createApiResponse([])

  let query = supabase
    .from('room_types')
    .select('*')
    .in('entity_id', entityIds)

  if (entityId && entityIds.includes(entityId)) {
    query = query.eq('entity_id', entityId)
  }

  const { data, error } = await query.order('sort_order', { ascending: true })

  if (error) return createErrorResponse(error.message, 500)
  return createApiResponse(data)
}
