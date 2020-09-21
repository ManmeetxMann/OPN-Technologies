import DataStore from '../../data/datastore'
import {AdminProfile, AdminApproval, AdminApprovalModel} from '../../data/admin'
import {DataModelFieldMapOperatorType} from '../../data/datamodel.base'

export class AdminApprovalService {
  private dataStore = new DataStore()
  private adminApprovalRepository = new AdminApprovalModel(this.dataStore)

  create(profile: AdminProfile): Promise<AdminApproval> {
    return this.adminApprovalRepository.add({
      expired: false,
      profile,
    })
  }

  findOneByEmail(email: string): Promise<AdminApproval> {
    return this.adminApprovalRepository
      .findWhereMapHasKeyValueEqual([
        {
          map: 'profile',
          key: 'email',
          operator: DataModelFieldMapOperatorType.Equals,
          value: email,
        },
      ])
      .then((results) => (results.length > 0 ? results[0] : null))
  }

  async findAllByOrgAndGroup(organizationId: string, groupId: string): Promise<AdminApproval[]> {
    return await this.adminApprovalRepository.findWhereMapHasKeyValueEqual([
      {
        map: 'profile',
        key: 'adminForOrganizationId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: organizationId,
      },
      {
        map: 'profile',
        key: 'adminForGroupIds',
        operator: DataModelFieldMapOperatorType.ArrayContains,
        value: groupId,
      },
    ])
  }

  async findAllByOrgAndLocation(
    organizationId: string,
    locationId: string,
  ): Promise<AdminApproval[]> {
    return await this.adminApprovalRepository.findWhereMapHasKeyValueEqual([
      {
        map: 'profile',
        key: 'adminForOrganizationId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: organizationId,
      },
      {
        map: 'profile',
        key: 'adminForLocationIds',
        operator: DataModelFieldMapOperatorType.ArrayContains,
        value: locationId,
      },
    ])
  }

  updateExpiry(id: string, expired: boolean): Promise<AdminApproval> {
    return this.adminApprovalRepository.updateProperty(id, 'expired', expired)
  }
}
