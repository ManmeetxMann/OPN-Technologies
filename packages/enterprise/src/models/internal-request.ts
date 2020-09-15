export type InternalAdminApprovalCreateRequest = {
  email: string
  organizationId?: string
  superAdminForOrganizationIds?: string[]
  locationIds: string[]
  showReporting: boolean
  groupIds: string[]
}
