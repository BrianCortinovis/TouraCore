import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from "@/lib/cron-auth"
import { createServiceRoleClient } from '@touracore/db/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function authorize(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  if (request.headers.get('x-vercel-cron')) return true
  return verifyCronSecret(request)
}

const ECB_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml'

interface EcbRate {
  currency: string
  rate: number
}

async function fetchEcbRates(): Promise<{ date: string; rates: EcbRate[] } | null> {
  const res = await fetch(ECB_URL, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) return null
  const xml = await res.text()
  const dateMatch = xml.match(/time="([^"]+)"/)
  const date = dateMatch?.[1] ?? new Date().toISOString().slice(0, 10)
  const rates: EcbRate[] = []
  const cubeRegex = /<Cube currency="(\w+)" rate="([\d.]+)"/g
  let m
  while ((m = cubeRegex.exec(xml)) !== null) {
    rates.push({ currency: m[1]!, rate: Number(m[2]) })
  }
  return { date, rates }
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await fetchEcbRates()
    if (!data) {
      return NextResponse.json({ error: 'Failed to fetch ECB rates' }, { status: 502 })
    }

    const supabase = await createServiceRoleClient()
    const rows = data.rates.map((r) => ({
      base_currency: 'EUR',
      quote_currency: r.currency,
      rate: r.rate,
      rate_date: data.date,
      source: 'ecb',
    }))

    if (rows.length > 0) {
      await supabase.from('fx_rates').upsert(rows, { onConflict: 'base_currency,quote_currency,rate_date' })
    }

    return NextResponse.json({ ok: true, date: data.date, rates_updated: rows.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
