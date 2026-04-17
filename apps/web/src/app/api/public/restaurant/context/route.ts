import type { NextRequest } from 'next/server'
import { jsonWithCors, loadRestaurantBySlug } from '../_shared'

export async function OPTIONS(req: NextRequest) {
  return jsonWithCors({}, { status: 204, origin: req.headers.get('origin') })
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  const origin = req.headers.get('origin')
  if (!slug) return jsonWithCors({ error: 'slug required' }, { status: 400, origin })

  const ctx = await loadRestaurantBySlug(slug)
  if (!ctx) return jsonWithCors({ error: 'Not found' }, { status: 404, origin })

  return jsonWithCors(ctx, { status: 200, origin })
}
