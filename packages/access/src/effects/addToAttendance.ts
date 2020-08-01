import type {Access} from '../models/access'
import {AttendanceRepository} from '../repository/attendance.repository'
import DataStore from '../../../common/src/data/datastore'
import {FieldValue} from '@google-cloud/firestore'
import moment from 'moment'

// access, but with fields we might be able to avoid querying for
type Addable = {
  userId: string
} & Access

const dateOf = async (a: Addable): Promise<string> => {
  // @ts-ignore it's a timestamp, not a string
  return moment(a.enteredAt.toDate()).format('YYYY-MM-DD')
}

export default class AccessListener {
  repo: AttendanceRepository
  constructor(dataStore: DataStore) {
    this.repo = new AttendanceRepository(dataStore)
  }

  async addEntry(access: Addable): Promise<unknown> {
    if (access.exitAt) {
      console.warn('adding entry for an access with an exit time')
    }
    const date = await dateOf(access)
    // TODO - need to access orgID here?
    const path = `${access.locationId}/daily-reports`
    let record = (await this.repo.findWhereEqual('date', date, path))[0]
    if (!record) {
      record = await this.repo.add(
        {
          date,
          accessingUsers: [],
          accesses: [],
        },
        path,
      )
    }
    const toAdd = {
      userId: access.userId,
      enteredAt: access.enteredAt,
    }
    if (
      record.accesses.some(
        (pastAccess) =>
          pastAccess.userId === toAdd.userId && pastAccess.enteredAt === toAdd.enteredAt,
      )
    ) {
      console.warn('access already entered')
      return
    }
    // use array union to avoid race conditions
    return this.repo.updateProperties(
      record.id,
      {
        accesses: FieldValue.arrayUnion(toAdd),
        accessingUsers: FieldValue.arrayUnion(access.userId),
      },
      path,
    )
  }

  async addExit(access: Addable): Promise<unknown> {
    if (!access.exitAt) {
      throw new Error('called addExit with a non-exiting Access')
    }
    const date = await dateOf(access)
    // TODO - need to access orgID here?
    const path = `${access.locationId}/daily-reports`
    let record = (await this.repo.findWhereEqual('date', date, path))[0]
    if (!record) {
      // weird but plausible if they stayed overnight
      console.warn('user is exiting but did not enter on this date')
      record = await this.repo.add(
        {
          date,
          accessingUsers: [],
          accesses: [],
        },
        path,
      )
    }
    const toRemove = record.accesses.find(
      (pastAccess) =>
        // @ts-ignore it's a Timestamp, not a string
        pastAccess.userId === access.userId && pastAccess.enteredAt.isEqual(access.enteredAt),
    )
    if (toRemove) {
      // removing first and then replacing means we can avoid copying the entire array
      await this.repo.updateProperty(record.id, 'accesses', FieldValue.arrayRemove(toRemove), path)
    }
    const toAdd = {
      userId: access.userId,
      enteredAt: access.enteredAt,
      exitAt: access.exitAt,
    }
    // use array union to avoid race conditions
    return this.repo.updateProperties(
      record.id,
      {
        accesses: FieldValue.arrayUnion(toAdd),
        accessingUsers: FieldValue.arrayUnion(access.userId),
      },
      path,
    )
  }
}
