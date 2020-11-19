import CollectionGroupModel from '../../../common/src/data/collectionGroupDatamodel.base'
import DataModel from '../../../common/src/data/datamodel.base'

import {Trace, ExposureReport} from '../models/trace'
import {Attendance} from '../models/attendance'

import {PassportStatuses} from '../../../passport/src/models/passport'

export type TraceModel = Trace & {
  id: string
}

type AugmentedAttendance = Attendance & {
  locationId: string
  reportId: string
}

export class TraceRepository extends DataModel<TraceModel> {
  public readonly rootPath = 'traces'
  readonly zeroSet = []
}

const digest = (record: {path: string[]; value: Attendance}): AugmentedAttendance => {
  const [, locationId, , reportId] = record.path
  const data = record.value
  return {
    locationId,
    reportId,
    date: data.date,
    accessingUsers: data.accessingUsers,
    accesses: data.accesses,
  }
}

// collection group for daily reports
export class DailyReportRepository extends CollectionGroupModel<Attendance> {
  groupId = 'daily-reports'
  async getAccesses(
    userId: string,
    earliestDate: string,
    latestDate: string,
  ): Promise<AugmentedAttendance[]> {
    const results = await this.groupGet([
      ['accessingUsers', 'array-contains', userId],
      ['date', '>=', earliestDate],
      ['date', '<=', latestDate],
    ])
    return results.map(digest)
  }

  async getAccessesForLocations(
    locationIds: string[],
    date: string,
  ): Promise<AugmentedAttendance[]> {
    const results = await this.groupGet([
      ['locationId', 'in', locationIds],
      ['date', '==', date],
    ])
    return results.map(digest)
  }
}

export default class extends DataModel<TraceModel> {
  zeroSet = []
  rootPath = 'traces'

  async saveTrace(
    reports: ExposureReport[],
    userId: string,
    includesGuardian: boolean,
    dependantIds: string[],
    passportStatus: PassportStatuses.Caution | PassportStatuses.Stop,
    date: string,
    duration: number,
    exposedIds: string[],
  ): Promise<void> {
    await this.add({
      date,
      duration,
      exposures: reports,
      userId,
      includesGuardian,
      dependantIds,
      passportStatus,
      exposedIds,
    })
  }
}
