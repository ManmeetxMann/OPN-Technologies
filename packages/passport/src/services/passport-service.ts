import {Passport, PassportModel, PassportStatus, PassportStatuses} from '../models/passport'
import DataStore from '../../../common/src/data/datastore'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {IdentifiersModel} from '../../../common/src/data/identifiers'
import {UserService} from '../../../common/src/service/user/user-service'
import {now, serverTimestamp} from '../../../common/src/utils/times'
import moment from 'moment'
import {firestore} from 'firebase-admin'
import * as _ from 'lodash'
import {Config} from '../../../common/src/utils/config'
import {isPassed} from '../../../common/src/utils/datetime-util'

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
  private passportRepository = new PassportModel(this.dataStore)
  private identifierRepository = new IdentifiersModel(this.dataStore)

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
  ): Promise<Passport> {
    if (dependantIds.length) {
      const allDependants = (await this.userService.getAllDependants(userId)).map(({id}) => id)
      const invalidIds = dependantIds.filter((depId) => !allDependants.includes(depId))
      if (invalidIds.length) {
        throw new Error(`${userId} is not the guardian of ${invalidIds.join(', ')}`)
      }
    }
    return this.identifierRepository
      .getUniqueValue('status')
      .then((statusToken) =>
        this.passportRepository.add({
          status,
          statusToken,
          userId,
          dependantIds,
          validFrom: serverTimestamp(),
          validUntil: null,
          includesGuardian,
        }),
      )
      .then(({validFrom, validUntil, ...passport}) => ({
        ...passport,
        validFrom,
        validUntil: firestore.Timestamp.fromDate(
          // @ts-ignore
          this.shortestTime(passport.status, validFrom.toDate()),
        ),
      }))
      .then((passport) => this.passportRepository.update(passport))
      .then(mapDates)
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
    nowDate: Date = now(),
  ): Promise<Passport> {
    const timeZone = Config.get('DEFAULT_TIME_ZONE')
    const directPassports = await this.passportRepository
      .collection()
      .where('userId', '==', userId)
      .where('validUntil', '>', moment(nowDate).tz(timeZone).toDate())
      .orderBy('validUntil', 'desc')
      .fetch()
    const indirectPassports = parentUserId
      ? await this.passportRepository
          .collection()
          .where('userId', '==', parentUserId)
          .where('dependantIds', 'array-contains', userId)
          .where('validUntil', '>', moment(nowDate).tz(timeZone).toDate())
          .orderBy('validUntil', 'desc')
          .fetch()
      : []

    const passports = [...directPassports, ...indirectPassports]

    // Deal with the bad
    if (!passports || passports.length == 0) {
      return null
    }

    // Get the Latest validForm Passport
    const momentDate = moment(nowDate)
    let selectedPassport: Passport = null
    for (const passport of passports) {
      if (
        // @ts-ignore
        momentDate.isSameOrAfter(passport.validFrom.toDate()) &&
        // @ts-ignore
        (!selectedPassport ||
          // @ts-ignore
          moment(passport.validFrom.toDate()).isSameOrAfter(selectedPassport.validFrom.toDate()))
      ) {
        selectedPassport = passport
      }
    }

    return selectedPassport
  }

  /**
   * shortestTime
   * Calculates the shortest time to an end of day or elapsed time.
   * Ex: end of day: 3am at night and 12 hours – we'd pick which is closer to now()
   */
  private shortestTime(passportStatus: PassportStatuses, validFrom: Date): Date {
    const expiryDuration = parseInt(Config.get('PASSPORT_EXPIRY_DURATION_MAX_IN_HOURS'))
    const expiryMax = parseInt(Config.get('PASSPORT_EXPIRY_TIME_DAILY_IN_HOURS'))
    const expiryDurationForRedPassports = parseInt(
      Config.get('STOP_PASSPORT_EXPIRY_DURATION_MAX_IN_WEEKS'),
    )

    const date = validFrom.toISOString()
    const byDuration =
      passportStatus === PassportStatuses.Stop
        ? moment(date).add(expiryDurationForRedPassports, 'weeks')
        : moment(date).add(expiryDuration, 'hours')
    const lookAtNextDay = validFrom.getHours() < expiryMax ? 0 : 1
    const byMax = moment(date).startOf('day').add(lookAtNextDay, 'day').add(expiryMax, 'hours')
    const shorter = byMax.isBefore(byDuration) ? byMax : byDuration

    return shorter.toDate()
  }
}
