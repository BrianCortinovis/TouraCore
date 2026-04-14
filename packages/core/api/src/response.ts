export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    page?: number
    per_page?: number
    total?: number
  }
}

export function createApiResponse<T>(data: T, meta?: ApiResponse['meta']): Response {
  const body: ApiResponse<T> = { success: true, data, meta }
  return Response.json(body, { status: 200 })
}

export function createErrorResponse(error: string, status = 400): Response {
  const body: ApiResponse = { success: false, error }
  return Response.json(body, { status })
}
