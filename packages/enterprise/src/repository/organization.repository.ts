import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {Organization, OrganizationKeySequence, OrganizationLocation} from '../models/organization'

export class OrganizationModel extends DataModel<Organization> {
  public readonly rootPath = 'organizations'
  readonly zeroSet = []
  constructor(ds: DataStore) {
    super(ds)
  }
}

export class OrganizationLocationModel extends DataModel<OrganizationLocation> {
  public rootPath
  readonly zeroSet = []
  constructor(ds: DataStore, organizationId: string) {
    super(ds)
    this.rootPath = `organizations/${organizationId}/locations`
  }
}

export class OrganizationKeySequenceModel extends DataModel<OrganizationKeySequence> {
  public readonly rootPath = 'organizations/keys/sequence'
  readonly zeroSet = []
  constructor(ds: DataStore) {
    super(ds)
  }
}
