import DataModel from './datamodel.base'
import {Platform} from '../types/platform'
import {firestore} from 'firebase-admin'

export type Registration = {
  id: string
  platform: Platform
  osVersion: string
  pushToken?: string
  tokenSource: TokenSource
  userIds?: string[]
  timestamps?: {
    createdAt: firestore.Timestamp
  }
}

export enum TokenSource {
  FH = 'FH',
  OPN = 'OPN',
}

export type RegistrationUpdate = {
  registrationId: string
  pushToken: string
}

export class RegistrationModel extends DataModel<Registration> {
  public readonly rootPath = 'registration'
  readonly zeroSet = []
}
