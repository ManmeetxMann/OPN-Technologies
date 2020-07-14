import DataModel from '../../../common/src/data/datamodel.base'
import {Access} from '../models/access'

export type AccessModel = Access & {
  id
}
export class AccessRepository extends DataModel<AccessModel> {
  public readonly rootPath = 'access'
  readonly zeroSet = []
}
