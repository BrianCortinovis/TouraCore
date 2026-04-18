'use server'

import { headers } from 'next/headers'
import { validateCredit } from '@touracore/vouchers/server'

export async function validateVoucherAction(input: {
  code: string
  tenantId: string
  amount: number
  vertical: 'bike_rental'
  entityId: string
}): Promise<{
  success: boolean
  amount_applied?: number
  balance_remaining?: number
  kind?: string
  error?: string
  credit_instrument_id?: string
}> {
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined

  const r = await validateCredit(
    {
      code: input.code,
      tenantId: input.tenantId,
      amount: input.amount,
      vertical: input.vertical,
      entityId: input.entityId,
      actorIp: ip,
    },
    { useServiceRole: true },
  )

  if (!r.success) {
    return { success: false, error: r.error_message ?? 'Codice non valido' }
  }

  return {
    success: true,
    amount_applied: r.amount_applied ?? 0,
    balance_remaining: r.balance_remaining ?? 0,
    kind: r.kind ?? undefined,
    credit_instrument_id: r.credit_instrument_id ?? undefined,
  }
}
