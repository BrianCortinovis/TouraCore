import { z } from 'zod'

// Placeholder. Fiscalità svizzera (UID, cantoni, IVA 8.1%) sarà implementata in futuro.
export const SwitzerlandPlaceholderSchema = z.object({}).passthrough()

export type SwitzerlandData = z.infer<typeof SwitzerlandPlaceholderSchema>
