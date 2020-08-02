import {Query} from '@firestore-simple/admin'
import {firestore} from 'firebase-admin'

import DataStore from '../../../common/src/data/datastore'
import {Trace} from '../models/trace'
import {Attendance} from '../models/attendance'

export type TraceModel = Trace & {
  id: string
}

type AugmentedAttendance = Attendance & {
  locationId: string
  reportId: string
}

export type ExposureReport = {
  date: string
  locationId: string
  overlapping: {
    userId: string
    start: Date
    end: Date
  }[]
}

const digest = (doc: firestore.QueryDocumentSnapshot): AugmentedAttendance => {
  const [, locationId, , reportId] = doc.ref.path.split('/')
  const data = doc.data()
  return {
    locationId,
    reportId,
    date: data.date,
    accessingUsers: data.accessingUsers,
    accesses: data.accesses,
  }
}

export default class DailyReportAccess {
  private datastore: DataStore

  constructor(datastore: DataStore) {
    this.datastore = datastore
  }

  private getQuery(): firestore.Query {
    return this.datastore.firestoreAdmin.firestore().collectionGroup('daily-reports')
  }

  private getDAO(): firestore.CollectionReference {
    return this.datastore.firestoreAdmin.firestore().collection('traces')
  }

  async getAccesses(
    userId: string,
    earliestDate: string,
    latestDate: string,
  ): Promise<AugmentedAttendance[]> {
    const results = await this.getQuery()
      .where('accessingUsers', 'array-contains', userId)
      .where('date', '>=', earliestDate)
      .where('date', '<=', latestDate)
      .get()
    return results.docs.map(digest)
  }

  async saveTrace(
    reports: ExposureReport[],
    userId: string,
    severity: string,
  ): Promise<ExposureReport[]> {
    const result = await this.getDAO().add({
      exposures: reports,
      userId,
      severity,
    })
    const doc = await result.get()
    return doc.data().exposures
  }
}
