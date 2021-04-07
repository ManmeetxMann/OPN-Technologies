import {FieldValue} from '@google-cloud/firestore'
import moment from 'moment-timezone'

import type {Access} from '../models/access'
import {AttendanceRepository} from '../repository/attendance.repository'

import DataStore from '../../../common/src/data/datastore'
import {UserService} from '../../../common/src/service/user/user-service'
import {Config} from '../../../common/src/utils/config'
import {safeTimestamp} from '../../../common/src/utils/datetime-util'

const ACCESS_KEY = 'accesses'
const USER_MEMO_KEY = 'accessingUsers'

const timeZone = Config.get('DEFAULT_TIME_ZONE')

const getEntryTime = (access: Access) => {
  if (access.enteredAt) {
    return access.enteredAt
  }
  return access.dependants[Object.keys(access.dependants)[0]].enteredAt
}

const getExitTime = (access: Access) => {
  if (access.exitAt) {
    return access.exitAt
  }
  return access.dependants[Object.keys(access.dependants)[0]].exitAt
}

const dateOfEntry = (access: Access): string => {
  // @ts-ignore it's a timestamp, not a string
  return moment(getEntryTime(access).toDate()).tz(timeZone).format('YYYY-MM-DD')
}
const dateOfExit = (access: Access): string => {
  // @ts-ignore it's a timestamp, not a string
  return moment(getExitTime(access).toDate()).tz(timeZone).format('YYYY-MM-DD')
}

export default class AccessListener {
  repo: AttendanceRepository
  dataStore: DataStore
  userService: UserService
  constructor(dataStore: DataStore) {
    this.repo = new AttendanceRepository(dataStore)
    this.dataStore = dataStore
    this.userService = new UserService()
  }

  async processAccess(access: Access): Promise<unknown> {
    if (access.enteredAt) {
      throw new Error('called processAccess on an access which never entered')
    }
    if (!access.exitAt) {
      throw new Error('called processAccess on an access which never exited')
    }
    if (access.dependants?.length || !access.includesGuardian) {
      throw new Error('called processAccess on a legacy access')
    }
    const date = dateOfEntry(access)
    const path = `${access.locationId}/daily-reports`
    // TODO: this theoretically allows for duplicates. move to making date an id
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
      enteredAt: safeTimestamp(access.enteredAt),
      exitAt: safeTimestamp(access.exitAt),
      dependant: null,
      dependantId: null,
    }
    const existingAccess = record.accesses.find(
      (pastAccess) =>
        pastAccess.userId === access.userId &&
        pastAccess.includesGuardian &&
        !pastAccess.dependantId &&
        pastAccess.enteredAt &&
        safeTimestamp(pastAccess.enteredAt).valueOf() === safeTimestamp(access.enteredAt).valueOf(),
    )
    if (existingAccess) {
      await this.repo.updateProperties(
        record.id,
        {
          [ACCESS_KEY]: FieldValue.arrayRemove(existingAccess),
        },
        path,
      )
    }

    return this.repo.updateProperties(
      record.id,
      {
        [ACCESS_KEY]: FieldValue.arrayUnion(toAdd),
        accessingUsers: FieldValue.arrayUnion(access.userId),
      },
      path,
    )
  }

  async addEntry(access: Access): Promise<unknown> {
    if (!getEntryTime(access)) {
      throw new Error('called addEntry on an access which never entered')
    }
    if (access.exitAt) {
      throw new Error('called addEntry on an access which already exited')
    }

    const date = dateOfEntry(access)
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
      const dependants = await this.userService.getAllDependants(access.userId)
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
    const date = dateOfExit(access)
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
      const dependants = await this.userService.getAllDependants(access.userId)
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
          pastAccess.enteredAt &&
          !pastAccess.exitAt &&
          pastAccess.dependantId === dependantId,
      )
      if (existingAccess) {
        toRemove.push(existingAccess)
      }
      const startTime = existingAccess ? existingAccess.enteredAt : null
      toAdd.push({
        userId: access.userId,
        enteredAt: startTime,
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
