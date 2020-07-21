import DataModel from '../../../common/src/data/datamodel.base'
import {AccessStats} from '../models/access-stats'

export type AccessStatsModel = AccessStats & {
  id
  locationId: string
  createdAt: unknown
}
export class AccessStatsRepository extends DataModel<AccessStatsModel> {
  public readonly rootPath = 'access-stats'
  readonly zeroSet = []
}
