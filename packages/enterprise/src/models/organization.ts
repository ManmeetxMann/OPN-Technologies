import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'

export type Organization = {
  id: string
  key: number
  name: string
}

export type OrganizationLocation = {
  id: string
  title: string
  address: string
  city: string
  zip: string
  state: string
  country: string
  zones: OrganizationLocationZone[]
} & OrganizationConfiguration

export type OrganizationLocationZone = {
  id: string
  title: string
  address: string
} & OrganizationConfiguration

export type OrganizationQuestion = {
  id: string
  value: string
  type: 'boolean' | 'date'
}

export type OrganizationConfiguration = {
  attestationRequired: boolean
  questions: OrganizationQuestion[]
}

export type OrganizationKeySequence = {
  id: string
  value: number
}

export class OrganizationModel extends DataModel<Organization> {
  public readonly rootPath = 'organizations'
  readonly zeroSet = []
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
