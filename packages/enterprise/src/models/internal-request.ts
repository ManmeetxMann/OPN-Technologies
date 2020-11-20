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
}
