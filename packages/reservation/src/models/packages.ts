import {PageableRequestFilter} from '../../../common/src/types/request'

export type PackageBase = {
  id: string
  packageCode: string
  organizationId: string | null
}

export type PackageByOrganizationRequest = PageableRequestFilter & {
  organizationId?: string
  dateOfAppointment?: Date
}

export type SavePackageAndOrganizationRequest = {
  organizationId?: string
  packageCode?: string
}
