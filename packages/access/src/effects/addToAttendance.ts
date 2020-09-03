import type {Access} from '../models/access'
import {AttendanceRepository} from '../repository/attendance.repository'
import DataStore from '../../../common/src/data/datastore'
import {FieldValue} from '@google-cloud/firestore'
import moment from 'moment'

const ACCESS_KEY = 'accesses'
const USER_MEMO_KEY = 'accessingUsers'

const dateOf = (access: Access): string => {
  // @ts-ignore it's a timestamp, not a string
  return moment(access.enteredAt.toDate()).format('YYYY-MM-DD')
}

export default class AccessListener {
  repo: AttendanceRepository
  constructor(dataStore: DataStore) {
    this.repo = new AttendanceRepository(dataStore)
  }

  async addEntry(access: Access): Promise<unknown> {
    if (access.exitAt) {
      throw new Error('called addEntry on an access which already exited')
    }
    const date = dateOf(access)
    const path = `${access.locationId}/daily-reports`
    const record = await this.repo.findWhereEqual('date', date, path).then((existing) => {
      if (existing.length) {
        return existing[0]
      }
      return this.repo.add(
        {
          date,
          [ACCESS_KEY]: [],
          [USER_MEMO_KEY]: [],
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
      console.warn('This access was already added to the attendance report')
      return
    }
    // use array union to avoid race conditions
    return this.repo.updateProperties(
      record.id,
      {
        [ACCESS_KEY]: FieldValue.arrayUnion(toAdd),
        accessingUsers: FieldValue.arrayUnion(access.userId),
      },
      path,
    )
  }

  async addExit(access: Access): Promise<unknown> {
    if (!access.exitAt) {
      throw new Error('called addExit with a non-exiting Access')
    }
    if (!access.enteredAt) {
      throw new Error('called addExit with an access which never entered')
    }
    const date = dateOf(access)
    const path = `${access.locationId}/daily-reports`
    const record = await this.repo.findWhereEqual('date', date, path).then((existing) => {
      if (existing.length) {
        return existing[0]
      }
      return this.repo.add(
        {
          date,
          [ACCESS_KEY]: [],
          [USER_MEMO_KEY]: [],
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
      await this.repo.updateProperty(record.id, ACCESS_KEY, FieldValue.arrayRemove(toRemove), path)
    } else {
      console.warn('user is exiting but did not enter on this date')
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
        [ACCESS_KEY]: FieldValue.arrayUnion(toAdd),
        accessingUsers: FieldValue.arrayUnion(access.userId),
      },
      path,
    )
  }
}
