import type { NextRequest } from 'next/server'
import { authenticate, apiSuccess, finalizeAudit } from '../../_auth'

export async function GET(req: NextRequest) {
  const start = Date.now()
  const { ctx, error } = await authenticate(req, 'listings:read')
  if (error) return error
  const res = apiSuccess({
    partner: {
      id: ctx.partner.id,
      name: ctx.partner.name,
      slug: ctx.partner.slug,
      kind: ctx.partner.kind,
      status: ctx.partner.status,
      commission_pct_default: ctx.partner.commission_pct_default,
    },
    api_key: {
      id: ctx.apiKey.id,
      name: ctx.apiKey.name,
      scope: ctx.apiKey.scope,
      environment: ctx.apiKey.environment,
    },
  })
  await finalizeAudit(ctx, req, 200, Date.now() - start)
  return res
}
