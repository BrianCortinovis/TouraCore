// Stub — implement in M057 (manifest + check-in)
// Will query experience_manifest_view (migration 00119 next milestones)

export interface ManifestRow {
  timeslot_id: string
  product_name: string
  start_at: string
  capacity_booked: number
  capacity_total: number
  guests: Array<{ first_name: string; last_name: string; variant_code: string }>
}

export async function getManifestForDate(_tenantId: string, _date: string): Promise<ManifestRow[]> {
  return []
}
