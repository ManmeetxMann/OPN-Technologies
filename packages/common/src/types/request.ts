export type PageableRequestFilter = {
  page?: number
  perPage?: number
}

export type RequestFilter = {
  query?: string
}

export type CursoredRequestFilter = RequestFilter & {
  from: string // last document ID
  limit: number
}

export type OrganizationRequestFilter = {
  organizationId: string
}
