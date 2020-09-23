import DataModel from './datamodel.base'
import {Platform} from '../types/platform'

export type Registration = {
  id: string
  type: RegistrationType
  platform: Platform
  osVersion: string
  pushToken?: string
  userIds?: string[]
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
