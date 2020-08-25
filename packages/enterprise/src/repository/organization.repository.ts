import GroupDataModel from '../../../common/src/data/collectionGroupDatamodel.base'
import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {Organization, OrganizationKeySequence, OrganizationLocation} from '../models/organization'

export class OrganizationModel extends GroupDataModel<Organization, OrganizationLocation> {
  public readonly rootPath = 'organizations'
  readonly zeroSet = []
  groupId = 'locations'

  // retrieve a location by id, and include the id of the organization it belongs to
  public async getLocation(
    id: string,
  ): Promise<null | (OrganizationLocation & {organizationId: string})> {
    const item = await this.groupGetWhereEqual('locationId', id)
    // can't query actual ids in a collectionGroup
    return {
      ...item.value,
      organizationId: item.path[1],
    }
  }
}

export class OrganizationLocationModel extends DataModel<OrganizationLocation> {
  public rootPath
  readonly zeroSet = []
  constructor(dataStore: DataStore, organizationId: string) {
    super(dataStore)
    this.rootPath = `organizations/${organizationId}/locations`
  }
}

export class OrganizationKeySequenceModel extends DataModel<OrganizationKeySequence> {
  public readonly rootPath = 'organizations/keys/sequence'
  readonly zeroSet = []
}
