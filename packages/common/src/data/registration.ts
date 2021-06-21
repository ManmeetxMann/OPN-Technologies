import DataModel from './datamodel.base'
import {Platform} from '../types/platform'
import {firestore} from 'firebase-admin'

export enum OpnSources {
  FH_IOS = 'FH_IOS',
  FH_Android = 'FH_Android',
  OPN_IOS = 'OPN_IOS',
  OPN_Android = 'OPN_Android',
  Admin_Dashboard = 'Admin_Dashboard',
  FH_RapidHome_Web = 'FH_RapidHome_Web',
}

export type Registration = {
  id: string
  platform: Platform
  osVersion: string
  pushToken?: string
  tokenSource: OpnSources
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
