import {PageableRequestFilter} from '../../../common/src/types/request'

export type PackageBase = {
  id: string
  packageCode: string
  organizationId: string
}

export type PackageByOrganizationRequest = PageableRequestFilter & {
  organizationId?: string
  dateOfAppointment?: Date
}

export type SavePackageAndOrganizationRequest = {
  organizationId?: string
  packageCode?: string
}

export type Certificate = {
  id: number
  certificate: string
  productID: number
  orderID: number
  appointmentTypeIDs: number[]
  appointmentTypes: Record<string, string>
  name: string
  email: string
  type: string
  remainingCounts?: Record<string, number>
  remainingMinutes?: number
  remainingValue?: string
  remainingValueLocal?: string
  expiration?: Date
}

export type PackageListItem = {
  packageCode: number
  name: string
  remainingCounts: number
  organization: string
}
