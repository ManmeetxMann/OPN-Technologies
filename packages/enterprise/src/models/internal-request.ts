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
  isLabUser: boolean
  isLabAppointmentsAdmin: boolean
  isLabResultsAdmin: boolean
  isTransportsRunsAdmin: boolean
  isReceivingAdmin: boolean
  isTestRunsAdmin: boolean
  isDueTodayAdmin: boolean
  isBulkUploadAdmin: boolean
  isIDBarCodesAdmin: boolean
  isSingleResultSendAdmin: boolean
  isConfirmResultAdmin: boolean
  isPackageAdmin: boolean
  isCheckInAdmin: boolean
  isGenerateAdmin: boolean
  isLookupAdmin: boolean
  adminForLabIds: string[]
  isClinicUser: boolean
  isRapidResultSenderAdmin: boolean
}
