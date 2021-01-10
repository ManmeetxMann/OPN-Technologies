export type InternalAdminApprovalCreateRequest = {
  email: string
  organizationId?: string
  superAdminForOrganizationIds?: string[]
  healthAdminForOrganizationIds?: string[]
  nfcAdminForOrganizationIds?: string[]
  nfcGateKioskAdminForOrganizationIds?: string[]
  locationIds: string[]
  showReporting: boolean
  groupIds: string[]
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
