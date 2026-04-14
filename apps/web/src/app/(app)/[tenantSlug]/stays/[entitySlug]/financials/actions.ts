'use server'

import { requireCurrentEntity } from '@touracore/hospitality/src/auth/access'
import {
  getFinancialSummary,
  getMonthlyFinancials,
  getChannelBreakdown,
  getDirectVsOtaComparison,
} from '@touracore/hospitality/src/queries/finance'

interface ActionResult {
  success: boolean
  error?: string
  data?: Record<string, unknown>
}

export async function loadFinancialDashboardAction(
  dateFrom?: string,
  dateTo?: string,
): Promise<ActionResult> {
  try {
    const { property } = await requireCurrentEntity()

    const [summary, monthly, channels, directVsOta] = await Promise.all([
      getFinancialSummary(property.id, dateFrom, dateTo),
      getMonthlyFinancials(property.id, dateFrom, dateTo),
      getChannelBreakdown(property.id, dateFrom, dateTo),
      getDirectVsOtaComparison(property.id, dateFrom, dateTo),
    ])

    return {
      success: true,
      data: {
        summary,
        monthly,
        channels,
        directVsOta,
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}
