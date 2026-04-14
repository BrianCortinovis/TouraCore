import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'
import { authenticateApiKey } from '@touracore/api'
import { createApiResponse, createErrorResponse } from '@touracore/api'

export async function GET(request: NextRequest) {
  const ctx = await authenticateApiKey(request.headers.get('authorization'))
  if (!ctx) return createErrorResponse('Unauthorized', 401)

  const supabase = await createServiceRoleClient()

  const { data, error } = await supabase
    .from('entities')
    .select('id, name, slug, type, city, province, country, is_active')
    .eq('tenant_id', ctx.tenantId)

  if (error) return createErrorResponse(error.message, 500)
  return createApiResponse(data)
}
