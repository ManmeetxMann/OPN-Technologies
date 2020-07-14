import DataModel from '../../../common/src/data/datamodel.base'

export type AdminProfile = {
  approvalUsed: boolean
  email: string
  enabled: boolean
  adminForLocationIds: string[]
  superAdminForOrganizationIds: string[]
}

export type User = {
  id: string
  firstName: string
  lastNameInitial: string
  birthYear: number
  base64Photo: string
  organizationIds?: string[]
  admin?: AdminProfile
  authUserId?: string
}

export class UserModel extends DataModel<User> {
  public readonly rootPath = 'users'
  readonly zeroSet = []
}