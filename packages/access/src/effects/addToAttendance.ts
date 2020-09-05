import type {Access} from '../models/access'
import {AttendanceRepository} from '../repository/attendance.repository'
import DataStore from '../../../common/src/data/datastore'
import {FieldValue} from '@google-cloud/firestore'
import moment from 'moment'
import {UserDependantModel} from '../../../common/src/data/user'

const ACCESS_KEY = 'accesses'
const USER_MEMO_KEY = 'accessingUsers'

// assumes that groups always arrive together
const getEntryTime = (access: Access) => {
  if (access.enteredAt) {
    return access.enteredAt
  }
  return access.dependants[Object.keys(access.dependants)[0]].enteredAt
}

const dateOf = (access: Access): string => {
  // @ts-ignore it's a timestamp, not a string
  return moment(getEntryTime(access).toDate()).format('YYYY-MM-DD')
}

export default class AccessListener {
  repo: AttendanceRepository
  dataStore: DataStore
  constructor(dataStore: DataStore) {
    this.repo = new AttendanceRepository(dataStore)
    this.dataStore = dataStore
  }

  async addEntry(access: Access): Promise<unknown> {
    if (!getEntryTime(access)) {
      throw new Error('called addEntry on an access which never entered')
    }
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

    const dependantsById = {}
    if (peopleEntering.length) {
      // look this up here so we can access it in attendance without n queries at once
      const dependants = await new UserDependantModel(this.dataStore, access.userId).fetchAll()
      dependants.forEach((dependant) => (dependantsById[dependant.id] = dependant))
    }

    if (access.includesGuardian) {
      peopleEntering.push(null)
    }
    const toAdd = peopleEntering.map((dependantId) => ({
      userId: access.userId,
      enteredAt: getEntryTime(access),
      dependant: dependantId ? dependantsById[dependantId] : null,
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
    if (!getEntryTime(access)) {
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

    const dependantsById = {}
    if (peopleExiting.length) {
      // look this up here so we can access it in attendance without n queries at once
      const dependants = await new UserDependantModel(this.dataStore, access.userId).fetchAll()
      dependants.forEach((dependant) => (dependantsById[dependant.id] = dependant))
    }

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
          pastAccess.enteredAt.isEqual(getEntryTime(access)) &&
          pastAccess.dependantId === dependantId,
      )
      if (existingAccess) {
        toRemove.push(existingAccess)
      }
      toAdd.push({
        userId: access.userId,
        enteredAt: getEntryTime(access),
        exitAt: dependantId ? access.dependants[dependantId].exitAt : access.exitAt,
        dependant: dependantId ? dependantsById[dependantId] : null,
        dependantId,
      })
    })
    if (toRemove.length) {
      await this.repo.updateProperties(
        record.id,
        {
          [ACCESS_KEY]: FieldValue.arrayRemove(...toRemove),
        },
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
