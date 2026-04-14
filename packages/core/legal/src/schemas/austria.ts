import { z } from 'zod'

// Placeholder. Fiscalità austriaca sarà implementata in futuro.
export const AustriaPlaceholderSchema = z.object({}).passthrough()

export type AustriaData = z.infer<typeof AustriaPlaceholderSchema>
