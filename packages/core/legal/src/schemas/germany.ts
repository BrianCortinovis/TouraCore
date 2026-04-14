import { z } from 'zod'

// Placeholder. Fiscalità tedesca sarà implementata in futuro.
export const GermanyPlaceholderSchema = z.object({}).passthrough()

export type GermanyData = z.infer<typeof GermanyPlaceholderSchema>
