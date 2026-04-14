'use server'

import {
  getReportKPIs,
  getMonthlyRevenue,
  getMonthlyOccupancy,
  getRevenueBySource,
  getRevenueByRoomType,
  getTopGuests,
} from '@touracore/hospitality/src/queries/reports'

interface ReportActionResult {
  success: boolean
  error?: string
  data?: {
    kpis: {
      totalRevenue: number
      revpar: number
      adr: number
      occupancyRate: number
      totalNightsSold: number
      totalGuests: number
    }
    monthlyRevenue: Array<{ month: string; revenue: number; rooms: number; fb: number }>
    monthlyOccupancy: Array<{ month: string; occupancy: number }>
    bySource: Array<{ name: string; value: number; percentage: number }>
    byRoomType: Array<{ type: string; revenue: number; rooms_sold: number }>
    topGuests: Array<{ rank: number; name: string; stays: number; nights: number; revenue: number }>
  }
}

export async function loadReportsAction(
  filters: { year?: number } = {},
): Promise<ReportActionResult> {
  const year = filters.year ?? new Date().getFullYear()

  try {
    const [kpis, monthlyRevenue, monthlyOccupancy, bySource, byRoomType, topGuests] =
      await Promise.all([
        getReportKPIs(),
        getMonthlyRevenue(year),
        getMonthlyOccupancy(year),
        getRevenueBySource(),
        getRevenueByRoomType(),
        getTopGuests(10),
      ])

    return {
      success: true,
      data: {
        kpis,
        monthlyRevenue,
        monthlyOccupancy,
        bySource,
        byRoomType,
        topGuests,
      },
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Errore caricamento report',
    }
  }
}
