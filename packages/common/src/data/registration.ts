import DataModel from './datamodel.base'
import {Platform} from '../types/platform'

export type Registration = {
  id: string
  platform: Platform
  osVersion: string
  pushToken?: string
  userIds?: string[]
}

export class RegistrationModel extends DataModel<Registration> {
  public readonly rootPath = 'registration'
  readonly zeroSet = []
}
