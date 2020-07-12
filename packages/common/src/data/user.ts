import DataModel from '../../../common/src/data/datamodel.base'

export type User = {
  id: string
  firstName: string
  lastNameInitial: string
  birthYear: number
  base64Photo: string
  organizationIds?: string[]
}

export class UserModel extends DataModel<User> {
  public readonly rootPath = 'users'
  readonly zeroSet = []
}