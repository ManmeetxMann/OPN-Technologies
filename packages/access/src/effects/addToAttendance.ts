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

    const peopleEntering = Object.keys(access.dependants)
    if (access.includesGuardian) {
      peopleEntering.push(null)
    }
    const toAdd = peopleEntering.map((dependantId) => ({
      userId: access.userId,
      enteredAt: access.enteredAt,
      dependantId,
    }))
    return this.repo.updateProperties(
      record.id,
      {
        [ACCESS_KEY]: FieldValue.arrayUnion(...toAdd),
        accessingUsers: FieldValue.arrayUnion(access.userId),
      },
      path,
    )
  }

  async addExit(
    access: Access,
    includesGuardian: boolean,
    dependantIds: string[],
  ): Promise<unknown> {
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
    const peopleExiting = [...(dependantIds ?? [])]
    if (includesGuardian) {
      peopleExiting.push(null)
    }

    const toRemove = []
    const toAdd = []
    peopleExiting.forEach((dependantId) => {
      const existingAccess = record.accesses.find(
        (pastAccess) =>
          pastAccess.userId === access.userId &&
          // @ts-ignore it's a Timestamp, not a string
          pastAccess.enteredAt.isEqual(access.enteredAt) &&
          pastAccess.dependantId === dependantId,
      )
      if (existingAccess) {
        toRemove.push(existingAccess)
      }
      toAdd.push({
        userId: access.userId,
        enteredAt: access.enteredAt,
        exitAt: dependantId ? access.dependants[dependantId].exitAt : access.exitAt,
        dependantId,
      })
    })
    if (toRemove.length) {
      // removing first and then replacing means we can avoid copying the entire array
      await this.repo.updateProperty(
        record.id,
        ACCESS_KEY,
        FieldValue.arrayRemove(...toRemove),
        path,
      )
    }
    // use array union to avoid race conditions
    return this.repo.updateProperties(
      record.id,
      {
        [ACCESS_KEY]: FieldValue.arrayUnion(...toAdd),
        accessingUsers: FieldValue.arrayUnion(access.userId),
      },
      path,
    )
  }
}
