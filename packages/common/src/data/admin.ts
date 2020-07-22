import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'

export type AdminProfile = {
  email: string
  enabled: boolean
  adminForLocationIds: string[]
  superAdminForOrganizationIds: string[]
}

export type AdminApproval = {
  id: string
  expired: boolean
  profile: AdminProfile
}

export class AdminApprovalModel extends DataModel<AdminApproval> {
  public readonly rootPath = 'config/admin/approvals'
  readonly zeroSet = []
  constructor(ds: DataStore) {
    super(ds)
  }
}
