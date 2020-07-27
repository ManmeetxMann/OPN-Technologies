import DataModel from '../../../common/src/data/datamodel.base'
import {AdminProfile} from './admin'
import {FieldValue} from '../utils/firebase'

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

export class UserModel extends DataModel<User> {
  public readonly rootPath = 'users'
  readonly zeroSet = []
}
