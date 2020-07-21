import DataModel from '../../../common/src/data/datamodel.base'
import {AccessStats} from '../models/access-stats'
import {firestore} from 'firebase-admin'

export type AccessStatsModel = AccessStats & {
  id
  locationId: string
  createdAt: firestore.Timestamp
}
export class AccessStatsRepository extends DataModel<AccessStatsModel> {
  public readonly rootPath = 'access-stats'
  readonly zeroSet = []
}
