import DataModel from '../../../common/src/data/datamodel.base'
import {Platform} from '../../../common/src/types/platform'

export type Registration = {
  id: string
  type: RegistrationType
  platform: Platform
  osVersion: string
  pushToken?: string
  userId: string
}

export type RegistrationType = 'user' | 'admin'

export enum RegistrationTypes {
  User = 'user',
  Admin = 'admin',
}

export class RegistrationModel extends DataModel<Registration> {
  public readonly rootPath = 'registration'
  readonly zeroSet = []
}
