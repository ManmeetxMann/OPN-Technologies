import {Passport, PassportModel, PassportStatuses} from '../models/passport'
import DataStore from '../../../common/src/data/datastore'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {IdentifiersModel} from '../../../common/src/data/identifiers'
import {UserDependantModel} from '../../../common/src/data/user'
import {now, serverTimestamp} from '../../../common/src/utils/times'
import moment from 'moment'
import {firestore} from 'firebase-admin'
import * as _ from 'lodash'
import {flattern} from '../../../common/src/utils/utils'
import {Config} from '../../../common/src/utils/config'

const mapDates = ({validFrom, validUntil, ...passport}: Passport): Passport => ({
  ...passport,
  //@ts-ignore
  validFrom: typeof validFrom === 'string' ? validFrom : validFrom.toDate().toISOString(),
  //@ts-ignore
  validUntil: typeof validUntil === 'string' ? validUntil : validUntil.toDate().toISOString(),
})

export class PassportService {
  private dataStore = new DataStore()
  private passportRepository = new PassportModel(this.dataStore)
  private identifierRepository = new IdentifiersModel(this.dataStore)

  async findLatestForUserIds(
    userIds: string[],
    dependantIds: string[] = [],
  ): Promise<Record<string, Passport>> {
    const latestPassportsByUserId: Record<string, Passport> = {}
    const timeZone = Config.get('DEFAULT_TIME_ZONE')
    const today = moment(now()).tz(timeZone).startOf('day').toDate()
    await Promise.all(
      _.chunk([...new Set(userIds)], 10).map((chunk) =>
        this.passportRepository
          .collection()
          .where('userId', 'in', chunk)
          .where('validFrom', '>=', today)
          .fetch(),
      ),
    ).then((results) =>
      flattern(results as Passport[][])?.forEach((source) => {
        const passport = mapDates(source)
        const validFrom = passport.validFrom
        const latestUserPassport = latestPassportsByUserId[passport.userId]
        if (!latestUserPassport || moment(validFrom).isAfter(latestUserPassport.validFrom)) {
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
    status: PassportStatuses = PassportStatuses.Pending,
    userId: string,
    dependantIds: string[],
    includesGuardian: boolean,
  ): Promise<Passport> {
    if (dependantIds.length) {
      const depModel = new UserDependantModel(this.dataStore, userId)
      const allDependants = (await depModel.fetchAll()).map(({id}) => id)
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
          this.shortestTime(validFrom.toDate()),
        ),
      }))
      .then((passport) => this.passportRepository.update(passport))
      .then(mapDates)
  }

  findOneByToken(token: string): Promise<Passport> {
    return this.passportRepository
      .findWhereEqual('statusToken', token)
      .then((results) => {
        if (results.length > 0) {
          return results[0]
        }
        throw new ResourceNotFoundException(`Cannot find passport with token [${token}]`)
      })
      .then(mapDates)
  }

  /**
   * shortestTime
   * Calculates the shortest time to an end of day or elapsed time.
   * Ex: end of day: 3am at night and 12 hours – we'd pick which is closer to now()
   */
  private shortestTime(validFrom: Date): Date {
    const expiryDuration = parseInt(Config.get('PASSPORT_EXPIRY_DURATION_MAX_IN_HOURS'))
    const expiryMax = parseInt(Config.get('PASSPORT_EXPIRY_TIME_DAILY_IN_HOURS'))

    const date = validFrom.toISOString()
    const byDuration = moment(date).add(expiryDuration, 'hours')
    const lookAtNextDay = validFrom.getHours() < expiryMax ? 0 : 1
    const byMax = moment(date).startOf('day').add(lookAtNextDay, 'day').add(expiryMax, 'hours')
    const shorter = byMax.isBefore(byDuration) ? byMax : byDuration

    return shorter.toDate()
  }
}
