import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'
import { authenticate, apiSuccess, finalizeAudit, apiError } from '../_auth'

export async function GET(req: NextRequest) {
  const start = Date.now()
  const { ctx, error } = await authenticate(req, 'listings:read')
  if (error) return error

  const url = new URL(req.url)
  const kind = url.searchParams.get('kind')

  const supabase = await createServiceRoleClient()
  let q = supabase
    .from('entities')
    .select('id, slug, name, kind, description, short_description, country_override')
    .eq('tenant_id', ctx.partner.tenant_id)
    .eq('is_active', true)

  if (kind) q = q.eq('kind', kind)

  const { data, error: dbErr } = await q
  if (dbErr) {
    await finalizeAudit(ctx, req, 500, Date.now() - start, 'db_error')
    return apiError(500, 'db_error', dbErr.message)
  }

  const res = apiSuccess({
    tenant_id: ctx.partner.tenant_id,
    total: (data ?? []).length,
    listings: data ?? [],
  })
  await finalizeAudit(ctx, req, 200, Date.now() - start)
  return res
}
