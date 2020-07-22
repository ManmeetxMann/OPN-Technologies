import DataModel from './datamodel.base'

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
}
