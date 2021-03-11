import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {firestore} from 'firebase-admin'

import {StatusStats} from '../models/status-stats'
import {PassportStatuses} from '../models/passport'

type StatusStatsStorable = StatusStats & {id: string}
export class StatusStatsRepository extends DataModel<StatusStatsStorable> {
  public rootPath: string
  readonly zeroSet = []
  constructor(dataStore: DataStore, orgId: string, groupId: string) {
    super(dataStore)
    this.rootPath = `org-status-stats/${orgId}/groups/${groupId}/dates`
  }

  async recordStatus(
    date: string,
    userId: string,
    status: PassportStatuses,
  ): Promise<StatusStatsStorable> {
    const base = {
      id: date,
      [PassportStatuses.Stop]: firestore.FieldValue.arrayRemove(userId),
      [PassportStatuses.Caution]: firestore.FieldValue.arrayRemove(userId),
      [PassportStatuses.Proceed]: firestore.FieldValue.arrayRemove(userId),
      [PassportStatuses.TemperatureCheckRequired]: firestore.FieldValue.arrayRemove(userId),
    }
    const writable = {
      ...base,
      [status]: firestore.FieldValue.arrayUnion(userId),
    }
    // actually adds or sets
    // @ts-ignore
    return this.add(writable)
  }
}
