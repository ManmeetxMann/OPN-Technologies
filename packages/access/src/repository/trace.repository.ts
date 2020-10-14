import CollectionGroupModel from '../../../common/src/data/collectionGroupDatamodel.base'
import {PassportStatuses} from '../../../passport/src/models/passport'
import {Trace, ExposureReport} from '../models/trace'
import {Attendance} from '../models/attendance'
import DataModel from '../../../common/src/data/datamodel.base'

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

export default class DailyReportAccess extends CollectionGroupModel<TraceModel, Attendance> {
  groupId = 'daily-reports'
  zeroSet = []
  rootPath = 'traces'

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
