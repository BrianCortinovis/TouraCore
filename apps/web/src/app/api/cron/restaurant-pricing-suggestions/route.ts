import { NextResponse, type NextRequest } from 'next/server'
import { verifyCronSecret } from "@/lib/cron-auth"
import { createServiceRoleClient } from '@touracore/db/server'
import { generateRestaurantSuggestions } from '@/lib/pricing-engine'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function authorize(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  if (req.headers.get('x-vercel-cron')) return true
  return verifyCronSecret(req)
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createServiceRoleClient()
  const { data: restaurants } = await admin.from('restaurants').select('id')

  let total = 0
  for (const r of restaurants ?? []) {
    try {
      const count = await generateRestaurantSuggestions(r.id as string, 30)
      total += count
    } catch (err) {
      console.error(`[restaurant-pricing] ${r.id} failed`, err)
    }
  }

  return NextResponse.json({ ok: true, restaurants: restaurants?.length ?? 0, suggestions: total })
}
