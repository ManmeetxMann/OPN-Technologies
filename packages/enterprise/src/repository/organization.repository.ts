import GroupDataModel from '../../../common/src/data/collectionGroupDatamodel.base'
import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {Organization, OrganizationKeySequence, OrganizationLocation} from '../models/organization'

import {firestore} from 'firebase-admin'

export class OrganizationModel extends GroupDataModel<Organization, OrganizationLocation> {
  public readonly rootPath = 'organizations'
  readonly zeroSet = []
  groupId = 'locations'

  // retrieve a location by id, and include the id of the organization it belongs to
  // TODO: need to add id to location document
  public async getLocation(
    id: string,
  ): Promise<null | (OrganizationLocation & {organizationId: string})> {
    const items = await this.groupGet([['id', '==', id]])
    if (items.length == 0) {
      return null
    }
    if (items.length > 1) {
      console.warn(`multiple ${this.groupId} with id ${id}`)
      console.warn(items)
    }
    const item = items[0]
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
