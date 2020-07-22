import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {AdminProfile} from './admin'

export type User = {
  id: string
  firstName: string
  lastNameInitial: string
  birthYear: number
  base64Photo: string
  organizationIds?: string[]
  admin?: AdminProfile
  authUserId?: string
}

export class UserModel extends DataModel<User> {
  public readonly rootPath = 'users'
  readonly zeroSet = []
  constructor(ds: DataStore) {
    super(ds)
  }
}
