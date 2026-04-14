import { z } from 'zod'

export const EmailSchema = z.string().email()

export const IdSchema = z.string().uuid()

export const PaginationSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
})

export type Email = z.infer<typeof EmailSchema>
export type Id = z.infer<typeof IdSchema>
export type Pagination = z.infer<typeof PaginationSchema>
