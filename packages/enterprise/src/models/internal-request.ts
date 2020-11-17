export type InternalAdminApprovalCreateRequest = {
  email: string
  organizationId?: string
  superAdminForOrganizationIds?: string[]
  healthAdminForOrganizationIds?: string[]
  nfcAdminForOrganizationIds?: string[]
  locationIds: string[]
  showReporting: boolean
  groupIds: string[]
}
