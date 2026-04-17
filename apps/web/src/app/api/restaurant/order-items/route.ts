import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@touracore/db/server'

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('orderId')
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('order_items')
    .select('id, item_name, qty, unit_price, modifier_delta, status, course_number')
    .eq('order_id', orderId)
    .order('created_at')

  return NextResponse.json(data ?? [])
}
