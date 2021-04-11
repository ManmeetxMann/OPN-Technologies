import * as _ from 'lodash'
import moment from 'moment'
import {firestore} from 'firebase-admin'

import DataStore from '../../../common/src/data/datastore'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {IdentifiersModel} from '../../../common/src/data/identifiers'
import {UserService} from '../../../common/src/service/user/user-service'
// import {OPNPubSub} from '../../../common/src/service/google/pub_sub'
import {now} from '../../../common/src/utils/times'
import {Config} from '../../../common/src/utils/config'
import {isPassed, safeTimestamp} from '../../../common/src/utils/datetime-util'

import {Passport, PassportModel, PassportStatus, PassportStatuses} from '../models/passport'

import {TemperatureStatuses} from '../../../reservation/src/models/temperature'

import {Enterprise} from '../adapter/enterprise'
import {ResultTypes} from '../../../reservation/src/models/appointment'

const mapDates = ({validFrom, validUntil, ...passport}: Passport): Passport => ({
  ...passport,
  //@ts-ignore
  validFrom: typeof validFrom === 'string' ? validFrom : validFrom.toDate().toISOString(),
  //@ts-ignore
  validUntil: typeof validUntil === 'string' ? validUntil : validUntil.toDate().toISOString(),
})

export class PassportService {
  private dataStore = new DataStore()
  private userService = new UserService()
  // private pubsub = new OPNPubSub(Config.get('PASSPORT_TOPIC'))
  private passportRepository = new PassportModel(this.dataStore)
  private identifierRepository = new IdentifiersModel(this.dataStore)
  private enterprise = new Enterprise()

  private async postPassport(passport: Passport) {
    await this.enterprise.postPassport(passport)
    // this.pubsub.publish(
    //   {
    //     id: passport.id,
    //     status: passport.status,
    //     expiry: safeTimestamp(passport.validUntil).toISOString(),
    //   },
    //   {
    //     userId: passport.userId,
    //     organizationId: passport.organizationId,
    //     actionType: 'created',
    //   },
    // )
  }

  async findTheLatestValidPassports(
    userIds: string[],
    dependantIds: string[] = [],
    nowDate: Date = now(),
  ): Promise<Record<string, Passport>> {
    const latestPassportsByUserId: Record<string, Passport> = {}
    const timeZone = Config.get('DEFAULT_TIME_ZONE')
    await Promise.all(
      _.chunk([...new Set(userIds)], 10).map((chunk) =>
        this.passportRepository
          .collection()
          .where('userId', 'in', chunk)
          .where('validUntil', '>', moment(nowDate).tz(timeZone).toDate())
          .fetch(),
      ),
    ).then((results) =>
      _.flatten(results as Passport[][])?.forEach((source) => {
        const passport = mapDates(source)
        const validFrom = passport.validFrom
        const latestUserPassport = latestPassportsByUserId[passport.userId]
        if (
          passport.includesGuardian &&
          (!latestUserPassport || moment(validFrom).isAfter(latestUserPassport.validFrom))
        ) {
          latestPassportsByUserId[passport.userId] = passport
        }

        // Handle Dependants
        const matchingDependantIds = _.intersection(dependantIds, passport.dependantIds ?? [])
        matchingDependantIds.forEach((dependantId) => {
          const latestDependantPassport = latestPassportsByUserId[dependantId]
          const isDependantsLatest =
            !latestDependantPassport || moment(validFrom).isAfter(latestDependantPassport.validFrom)
          if (isDependantsLatest) {
            latestPassportsByUserId[dependantId] = {
              ...passport,
              userId: dependantId,
              parentUserId: passport.userId,
            }
          }
        })
      }),
    )

    return latestPassportsByUserId
  }

  async create(
    status: PassportStatus,
    userId: string,
    dependantIds: string[],
    includesGuardian: boolean,
    organizationId: string,
    isPCR = false, // whether or not to use the long duration for PROCEED
    pcrResultType?: ResultTypes,
  ): Promise<Passport> {
    if (dependantIds.length) {
      const allDependants = (await this.userService.getAllDependants(userId)).map(({id}) => id)
      const invalidIds = dependantIds.filter((depId) => !allDependants.includes(depId))
      if (invalidIds.length) {
        throw new Error(`${userId} is not the guardian of ${invalidIds.join(', ')}`)
      }
    }

    const validFromDate = now()
    const validUntilDate = this.shortestTime(
      status as PassportStatuses,
      validFromDate,
      isPCR,
      pcrResultType,
    )

    return this.identifierRepository
      .getUniqueValue('status')
      .then((statusToken) =>
        this.passportRepository.add({
          status,
          statusToken,
          userId,
          organizationId,
          dependantIds,
          validFrom: firestore.Timestamp.fromDate(validFromDate),
          validUntil: firestore.Timestamp.fromDate(validUntilDate),
          includesGuardian,
        }),
      )
      .then(mapDates)
      .then(async (passport) => {
        await this.postPassport(passport)
        return passport
      })
  }

  findOneByToken(token: string, requireValid = false): Promise<Passport> {
    return this.passportRepository
      .findWhereEqual('statusToken', token)
      .then((results) => {
        if (results.length > 0) {
          if (results.length > 1) {
            console.warn(`multiple passport found, ${results.length}, ${token}`)
          }
          if (!requireValid) {
            return results[0]
          }
          const validPassports = results.filter((result) => !isPassed(result.validUntil))
          if (!validPassports.length) {
            throw new ResourceNotFoundException(`passport ${token} is expired`)
          }
          return validPassports[0]
        }
        throw new ResourceNotFoundException(`Cannot find passport with token [${token}]`)
      })
      .then(mapDates)
  }

  async findLatestPassport(
    userId: string,
    parentUserId: string | null = null,
    requiredStatus: PassportStatus = null,
    organizationId: string | null = null,
    nowDate: Date = now(),
  ): Promise<Passport> {
    const timeZone = Config.get('DEFAULT_TIME_ZONE')
    const directPassports = await this.passportRepository
      .collection()
      .where('userId', '==', userId)
      .where('organizationId', '==', organizationId)
      .where('validUntil', '>', moment(nowDate).tz(timeZone).toDate())
      .orderBy('validUntil', 'desc')
      .fetch()
    const indirectPassports = parentUserId
      ? (
          await this.passportRepository
            .collection()
            .where('userId', '==', parentUserId)
            .where('organizationId', '==', organizationId)
            .where('validUntil', '>', moment(nowDate).tz(timeZone).toDate())
            .orderBy('validUntil', 'desc')
            .fetch()
        ).filter((ppt) => ppt.dependantIds?.includes(userId))
      : []

    const passports = [...directPassports, ...indirectPassports].filter((ppt) =>
      requiredStatus ? ppt.status === requiredStatus : ppt.status !== PassportStatuses.Pending,
    )
    // Deal with the bad
    if (!passports || passports.length == 0) {
      return null
    }

    // Get the Latest validFrom Passport
    const momentDate = moment(nowDate)
    let selectedPassport: Passport = null
    for (const passport of passports) {
      if (!momentDate.isSameOrAfter(safeTimestamp(passport.validFrom))) {
        continue
      }
      if (!selectedPassport) {
        selectedPassport = passport
        continue
      }
      if (
        moment(safeTimestamp(passport.validFrom)).isSameOrAfter(
          safeTimestamp(selectedPassport.validFrom),
        )
      ) {
        selectedPassport = passport
      }
    }
    return selectedPassport
  }

  // find a user's active status  at a moment in time (default now)
  async findLatestDirectPassport(
    userId: string,
    organizationId: string,
    nowDate: Date = now(),
  ): Promise<Passport | null> {
    const timeZone = Config.get('DEFAULT_TIME_ZONE')
    const passports = await this.passportRepository
      .collection()
      .where('userId', '==', userId)
      .where('organizationId', '==', organizationId)
      .where('validFrom', '<', moment(nowDate).tz(timeZone).toDate())
      .orderBy('validFrom', 'desc')
      .limit(1)
      .fetch()
    if (!passports.length) {
      return null
    }
    return passports[0]
  }

  // utility to determine if a passport can be used
  passportAllowsEntry(passport: Passport | null, attestationRequired = true): boolean {
    if (attestationRequired) {
      // must have a passport
      if (!passport) {
        return false
      }
      // must be proceed
      if (passport.status !== PassportStatuses.Proceed) {
        return false
      }
      // must not be expired
      if (moment(now()).isAfter(safeTimestamp(passport.validUntil))) {
        return false
      }
      return true
    } else {
      // no passport is allowed
      if (!passport) {
        return true
      }
      // expired passports are allowed
      if (moment(now()).isAfter(safeTimestamp(passport.validUntil))) {
        return true
      }
      // valid passports must not be red
      if (passport.status == PassportStatuses.Stop) {
        return false
      }
      if (passport.status == PassportStatuses.Caution) {
        return false
      }
      return true
    }
  }

  /**
   * shortestTime
   * Calculates the shortest time to an end of day or elapsed time.
   * Ex: end of day: 3am at night and 12 hours – we'd pick which is closer to now()
   */
  shortestTime(
    passportStatus: PassportStatuses | TemperatureStatuses,
    validFrom: Date,
    isPCR: boolean,
    pcrResultType?: ResultTypes,
  ): Date {
    if (
      [PassportStatuses.Stop, PassportStatuses.Caution, TemperatureStatuses.Stop].includes(
        passportStatus,
      )
    ) {
      if (pcrResultType == ResultTypes.Inconclusive) {
        return moment(validFrom)
          .add(Config.get('STOP_PASSPORT_EXPIRY_INCONCLUSIVE_HOURS'), 'hours')
          .toDate()
      }

      const weeksToAdd = parseInt(Config.get('STOP_PASSPORT_EXPIRY_DURATION_MAX_IN_WEEKS'))
      // TODO: end of day?
      return moment(validFrom).add(weeksToAdd, 'weeks').toDate()
    }
    // valid passes remain until they are this old
    const expiryDuration = parseInt(
      Config.get(isPCR ? 'PASSPORT_EXPIRY_PCR_HOURS' : 'PASSPORT_EXPIRY_DURATION_MAX_IN_HOURS'),
    )
    const byDuration = moment(validFrom).add(expiryDuration, 'hours')

    if (isPCR) {
      // PCR passports don't expire every day
      return byDuration.toDate()
    }

    // all valid passes expire at this time of day, regardless of age
    const expiryMax = parseInt(Config.get('PASSPORT_EXPIRY_TIME_DAILY_IN_HOURS'))

    const lookAtNextDay = moment(validFrom).hours() < expiryMax ? 0 : 1
    const byMax = moment(validFrom)
      .startOf('day')
      .add(lookAtNextDay, 'days')
      .add(expiryMax, 'hours')
    const earlier = byMax.isBefore(byDuration) ? byMax : byDuration

    return earlier.toDate()
  }
}
