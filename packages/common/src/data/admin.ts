import DataModel from '../../../common/src/data/datamodel.base'

export type AdminProfile = {
  email: string
  enabled: boolean
  authUserId?: string
  adminForGroupIds: string[]
  adminForLocationIds: string[]
  adminForOrganizationId: string
  superAdminForOrganizationIds: string[]
  healthAdminForOrganizationIds: string[]
  nfcAdminForOrganizationIds: string[]
  nfcGateKioskAdminForOrganizationIds: string[]
  showReporting: boolean
  isOpnSuperAdmin: boolean
  isManagementDashboardAdmin: boolean
  isTestReportsAdmin: boolean
  isTestAppointmentsAdmin: boolean
  isLabAdmin: boolean
  isLabAppointmentsAdmin: boolean
  isLabResultsAdmin: boolean
  isTransportsRunsAdmin: boolean
  isReceivingAdmin: boolean
  isTestRunsAdmin: boolean
  isDueTodayAdmin: boolean
  isBulkUploadAdmin: boolean
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
