import type {UserAccess} from '../models/attendance'
import {AttendanceRepository} from '../repository/attendance.repository'
import DataStore from '../../../common/src/data/datastore'
import {FieldValue} from '@google-cloud/firestore'
import moment from 'moment'


const ACC_KEY = 'accesses'

const dateOf = async (a: UserAccess): Promise<string> => {
  // @ts-ignore it's a timestamp, not a string
  return moment(a.enteredAt.toDate()).format('YYYY-MM-DD')
}

export default class AccessListener {
  repo: AttendanceRepository
  constructor(dataStore: DataStore) {
    this.repo = new AttendanceRepository(dataStore)
  }

  async addEntry(access: UserAccess): Promise<unknown> {
    if (access.exitAt) {
      console.warn('adding entry for an access with an exit time')
    }
    const date = await dateOf(access)
    // TODO - need to access orgID here?
    const path = `${access.locationId}/dates`
    const record = await this.repo.findWhereEqual('date', date, path).then((existing) => {
      if (existing.length) {
        return existing[0]
      }
      return this.repo.add(
        {
          date,
          [ACC_KEY]: [],
        },
        path,
      )
    })
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
    return this.repo.updateProperty(record.id, ACC_KEY, FieldValue.arrayUnion(toAdd), path)
  }

  async addExit(access: UserAccess): Promise<unknown> {
    if (!access.exitAt) {
      throw new Error('called addExit with a non-exiting Access')
    }
    const date = await dateOf(access)
    // TODO - need to access orgID here?
    const path = `${access.locationId}/dates`
    const record = await this.repo.findWhereEqual('date', date, path).then((existing) => {
      if (existing.length) {
        return existing[0]
      }
      return this.repo.add(
        {
          date,
          [ACC_KEY]: [],
        },
        path,
      )
    })
    const toRemove = record.accesses.find(
      (pastAccess) =>
        // @ts-ignore it's a Timestamp, not a string
        pastAccess.userId === access.userId && pastAccess.enteredAt.isEqual(access.enteredAt),
    )
    if (toRemove) {
      // removing first and then replacing means we can avoid copying the entire array
      await this.repo.updateProperty(record.id, ACC_KEY, FieldValue.arrayRemove(toRemove), path)
    } else {
      console.warn('user is exiting but did not enter on this date')
    }
    const toAdd = {
      userId: access.userId,
      enteredAt: access.enteredAt,
      exitAt: access.exitAt,
    }
    // use array union to avoid race conditions
    return this.repo.updateProperty(record.id, ACC_KEY, FieldValue.arrayUnion(toAdd), path)
  }
}
