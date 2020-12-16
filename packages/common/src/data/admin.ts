import DataModel from '../../../common/src/data/datamodel.base'

export type AdminProfile = {
  email: string
  enabled: boolean
  adminForGroupIds: string[]
  adminForLocationIds: string[]
  adminForOrganizationId: string
  superAdminForOrganizationIds: string[]
  healthAdminForOrganizationIds: string[]
  nfcAdminForOrganizationIds: string[]
  nfcGateKioskAdminForOrganizationIds: string[]
  managementAdminForOrganizationId: string
  testReportsAdminForOrganizationId: string
  testAppointmentsAdminForOrganizationId: string
  showReporting: boolean
}

export type AdminApproval = {
  id: string
  expired: boolean
  profile: AdminProfile
}

export class AdminApprovalModel extends DataModel<AdminApproval> {
  public readonly rootPath = 'config/admin/approvals'
  readonly zeroSet = []
}
