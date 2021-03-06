import GroupDataModel from '../../../common/src/data/collectionGroupDatamodel.base'
import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {
  Organization,
  OrganizationGroup,
  OrganizationKeySequence,
  OrganizationLocation,
  OrganizationUsersGroup,
} from '../models/organization'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'

export class OrganizationModel extends DataModel<Organization> {
  public readonly rootPath = 'organizations'
  readonly zeroSet = []
}

// used for retrieving locations with unknown organization ids
export class AllLocationsModel extends GroupDataModel<OrganizationLocation> {
  groupId = 'locations'
  // retrieve a location by id, and include the id of the organization it belongs to
  public async getLocation(
    id: string,
  ): Promise<null | (OrganizationLocation & {organizationId: string})> {
    const item = await this.groupGetWhereEqual('locationId', id)
    if (!item) {
      throw new ResourceNotFoundException(`Cannot find location with ${id}`)
    }
    // can't query actual ids in a collectionGroup
    return {
      ...item.value,
      organizationId: item.path[1],
      // @ts-ignore this doesn't officially exist
      id: item.value.locationId,
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

export class OrganizationGroupModel extends DataModel<OrganizationGroup> {
  public rootPath
  public static collectionId = 'organization_groups'
  readonly zeroSet = []
  constructor(dataStore: DataStore, organizationId: string) {
    super(dataStore)
    this.rootPath = `organizations/${organizationId}/${OrganizationGroupModel.collectionId}`
  }
}

export class OrganizationUsersGroupModel extends DataModel<OrganizationUsersGroup> {
  public rootPath
  readonly zeroSet = []
  constructor(dataStore: DataStore, organizationId: string) {
    super(dataStore)
    this.rootPath = `organizations/${organizationId}/users_groups`
  }
}

export class OrganizationKeySequenceModel extends DataModel<OrganizationKeySequence> {
  public readonly rootPath = 'organizations/keys/sequence'
  readonly zeroSet = []
}
