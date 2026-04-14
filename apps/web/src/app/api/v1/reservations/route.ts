import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'
import { authenticateApiKey, createApiResponse, createErrorResponse } from '@touracore/api'

export async function GET(request: NextRequest) {
  const ctx = await authenticateApiKey(request.headers.get('authorization'))
  if (!ctx) return createErrorResponse('Unauthorized', 401)

  const { searchParams } = request.nextUrl
  const entityId = searchParams.get('entity_id')
  const status = searchParams.get('status')
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const perPage = Math.min(100, Math.max(1, Number(searchParams.get('per_page')) || 20))

  const supabase = await createServiceRoleClient()

  const { data: properties } = await supabase
    .from('entities')
    .select('id')
    .eq('tenant_id', ctx.tenantId)

  const entityIds = (properties ?? []).map((p) => p.id)
  if (entityIds.length === 0) return createApiResponse([], { page, per_page: perPage, total: 0 })

  let query = supabase
    .from('reservations')
    .select('*', { count: 'exact' })
    .in('entity_id', entityIds)

  if (entityId && entityIds.includes(entityId)) {
    query = query.eq('entity_id', entityId)
  }
  if (status) {
    query = query.eq('status', status)
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (error) return createErrorResponse(error.message, 500)
  return createApiResponse(data, { page, per_page: perPage, total: count ?? 0 })
}
