import {
  CursoredRequestFilter,
  OrganizationRequestFilter,
  PageableRequestFilter,
} from '../../../common/src/types/request'

export type ConnectOrganizationRequest = {
  organizationId: string
}

export type UsersByOrganizationRequest = PageableRequestFilter & {
  organizationId?: string
  searchQuery?: string
}

export type CursoredUsersRequestFilter = CursoredRequestFilter & OrganizationRequestFilter
