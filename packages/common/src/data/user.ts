import DataModel from '../../../common/src/data/datamodel.base'
import {AdminProfile} from './admin'
import {FieldValue} from '../utils/firebase'
import DataStore from './datastore'

export type User = {
  id: string
  registrationId: string
  firstName: string
  lastName: string
  base64Photo: string
  organizationIds?: string[]
  admin?: AdminProfile | FieldValue
  authUserId?: string | FieldValue
}

export type UserWithGroup = {
  groupId?: string
} & User

export type UserEdit = {
  // id: string
  firstName: string
  lastName: string
  base64Photo?: string
  parentUserId?: string
  // groupId?: string
}

export type UserFilter = {
  userIds: string[]
}

export type UserDependant = {
  id: string
  firstName: string
  lastName: string
  groupId: string
}

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
