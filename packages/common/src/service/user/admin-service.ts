import DataStore from '../../data/datastore'
import {AdminProfile, AdminApproval, AdminApprovalModel} from '../../data/admin'

export class AdminApprovalService {
  private dataStore = new DataStore()
  private adminApprovalRepository = new AdminApprovalModel(this.dataStore)

  create(profile: AdminProfile): Promise<AdminApproval> {
    return this.adminApprovalRepository
    .add({
        expired: false,
        profile: profile
    })
  }

  findOneByEmail(email: string) : Promise<AdminApproval> {
    return this.adminApprovalRepository
    .findWhereMapHasKeyValueEqual('profile', 'email', email)
    .then((results) => (results.length > 0 ? results[0] : null))
  }

  updateExpiry(id: string, expired: boolean) : Promise<AdminApproval> {
    return this.adminApprovalRepository.updateProperty(id, "expired", expired)
  }
}