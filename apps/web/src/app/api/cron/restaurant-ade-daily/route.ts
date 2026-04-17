import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'

/**
 * Cron daily 23:55 — submit corrispettivi ADE per ogni restaurant
 * Cron entry da aggiungere a vercel.json
 */
export async function GET() {
  const admin = await createServiceRoleClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: restaurants } = await admin.from('restaurants').select('id')

  let submitted = 0
  for (const r of restaurants ?? []) {
    const { data: receipts } = await admin
      .from('fiscal_receipts')
      .select('amount_total, vat_total')
      .eq('restaurant_id', r.id)
      .eq('fiscal_date', today)

    if ((receipts ?? []).length === 0) continue

    const total = (receipts ?? []).reduce((s, x) => s + Number(x.amount_total), 0)
    const vat = (receipts ?? []).reduce((s, x) => s + Number(x.vat_total), 0)
    const count = (receipts ?? []).length

    const { data: xml } = await admin.rpc('build_ade_daily_xml', {
      p_restaurant_id: r.id,
      p_date: today,
    })

    await admin.from('ade_daily_submissions').upsert(
      {
        restaurant_id: r.id,
        submission_date: today,
        receipts_count: count,
        total_amount: total,
        total_vat: vat,
        xml_payload: xml ?? '',
        status: 'submitted',
        attempts: 1,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'restaurant_id,submission_date' },
    )
    submitted++
  }

  return NextResponse.json({ ok: true, submitted, date: today })
}
