import DataModel from './datamodel.base'
import DataStore from './datastore'

export enum RegistrationType {
  User = 'User',
  Admin = 'Admin',
}

export interface RegistrationSchema {
  id: string
  type: RegistrationType
  pushToken: string
}

export class RegistrationModel extends DataModel<RegistrationSchema> {
  readonly rootPath = 'registration'
  readonly zeroSet = []
  constructor(ds: DataStore) {
    super(ds)
  }
}
