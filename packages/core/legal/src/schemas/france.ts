import { z } from 'zod'

// Placeholder. Fiscalità francese (SIRET, TVA, RCS) sarà implementata in futuro.
export const FrancePlaceholderSchema = z.object({}).passthrough()

export type FranceData = z.infer<typeof FrancePlaceholderSchema>
