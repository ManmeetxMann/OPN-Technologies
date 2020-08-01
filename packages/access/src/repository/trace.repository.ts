import DataStore from '../../../common/src/data/datastore'
import {Trace} from '../models/trace'
import {Attendance} from '../models/attendance'
import {Query} from '@firestore-simple/admin'
import {firestore} from 'firebase-admin'

export type TraceModel = Trace & {
  id: string
}

type CollisionReport = Attendance & {
  locationId: string
  reportId: string
}

const digest = (doc: firestore.QueryDocumentSnapshot): CollisionReport => {
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

  async getAccesses(userId: string): Promise<CollisionReport[]> {
    const results = await this.getQuery()
      .where('accessingUsers', 'array-contains', userId)
      .where('date', '>', '1')
      .get()
    return results.docs.map(digest)
  }
}
