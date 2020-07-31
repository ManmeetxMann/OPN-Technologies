import DataModel from '../../../common/src/data/datamodel.base'
import {AdminProfile} from './admin'
import {FieldValue} from '../utils/firebase'
import DataStore from './datastore'

export type User = {
  id: string
  firstName: string
  lastNameInitial: string
  birthYear: number
  base64Photo: string
  organizationIds?: string[]
  admin?: AdminProfile | FieldValue
  authUserId?: string | FieldValue
}

export type UserDependant = {
  id: string
  firstName: string
  lastNameInitial: string
  relation: UserDependantRelation
}

export type UserDependantRelation = 'child' | 'spouse' | 'parent' | 'grandparent'

export class UserModel extends DataModel<User> {
  public readonly rootPath = 'users'
  readonly zeroSet = []
}

export class UserDependantModel extends DataModel<UserDependant> {
  public rootPath
  readonly zeroSet = []
  constructor(dataStore: DataStore, userId: string) {
    super(dataStore)
    this.rootPath = `users/${userId}/dependants`
  }
}
