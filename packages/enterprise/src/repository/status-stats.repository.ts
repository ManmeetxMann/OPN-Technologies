import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {firestore} from 'firebase-admin'

import {StatusStats} from '../models/status-stats'
import {PassportStatuses} from '../../../passport/src/models/passport'

type StatusStatsStorable = StatusStats & {id: string}
export class StatusStatsRepository extends DataModel<StatusStatsStorable> {
  public rootPath: string
  public orgId: string
  public groupId: string
  readonly zeroSet = []
  constructor(dataStore: DataStore, orgId: string, groupId: string) {
    super(dataStore)
    this.orgId = orgId
    this.groupId = groupId
    this.rootPath = `org-status-stats/${orgId}/groups/${groupId}/stats-for-date`
  }

  recordStatus(
    date: string,
    userId: string,
    status: PassportStatuses,
  ): Promise<StatusStatsStorable> {
    const base = {
      id: date, // forces date to be unique
      date,
      organization: this.orgId,
      group: this.groupId,
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

  initializeStatuses(
    date: string,
    stopUsers: string[],
    cautionUsers: string[],
  ): Promise<StatusStatsStorable> {
    const base = {
      id: date,
      date,
      organization: this.orgId,
      group: this.groupId,
      [PassportStatuses.Stop]: [] as string[] | firestore.FieldValue,
      [PassportStatuses.Caution]: [] as string[] | firestore.FieldValue,
      [PassportStatuses.Proceed]: [] as string[] | firestore.FieldValue,
      [PassportStatuses.TemperatureCheckRequired]: [] as string[] | firestore.FieldValue,
    }
    if (stopUsers.length) {
      base[PassportStatuses.Stop] = firestore.FieldValue.arrayUnion(...stopUsers)
    }
    if (cautionUsers.length) {
      base[PassportStatuses.Caution] = firestore.FieldValue.arrayUnion(...cautionUsers)
    }
    // actually adds or sets
    // @ts-ignore
    return this.add(base)
  }

  async getLatest(): Promise<StatusStatsStorable> {
    const results = await this.collection().orderBy('date', 'desc').limit(1).fetch()
    if (results && results[0]) {
      return results[0]
    }
    return null
  }
}
