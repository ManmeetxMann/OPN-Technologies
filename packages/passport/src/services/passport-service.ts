import {Passport, PassportModel, PassportStatuses} from '../models/passport'
import DataStore from '../../../common/src/data/datastore'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {IdentifiersModel} from '../../../common/src/data/identifiers'
import {UserDependantModel} from '../../../common/src/data/user'
import moment from 'moment'
import {firestore} from 'firebase-admin'

// some clients rely on this being defined, but all passports
// must apply to the user who created them.
type LegacyPassport = Passport & {includesGuardian: true}

export class PassportService {
  private dataStore = new DataStore()
  private passportRepository = new PassportModel(this.dataStore)
  private identifierRepository = new IdentifiersModel(this.dataStore)

  async create(
    status: PassportStatuses = PassportStatuses.Pending,
    userId: string,
    dependantIds: string[],
  ): Promise<LegacyPassport> {
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
          validFrom: firestore.FieldValue.serverTimestamp(),
          validUntil: null,
        }),
      )
      .then(({validFrom, ...passport}) => ({
        ...passport,
        // @ts-ignore
        validFrom: new firestore.Timestamp(validFrom.seconds, validFrom.nanoseconds)
          .toDate()
          .toISOString(),
      }))
      .then(({validFrom, validUntil, ...passport}) => ({
        ...passport,
        validFrom,
        validUntil: moment(validFrom).add(24, 'hours').toISOString(),
      }))
      .then((passport) => this.passportRepository.update(passport))
      .then((passport) => ({...passport, includesGuardian: true}))
  }

  findOneByToken(token: string): Promise<LegacyPassport> {
    return this.passportRepository
      .findWhereEqual('statusToken', token)
      .then((results) => {
        if (results.length > 0) {
          return results[0]
        }
        throw new ResourceNotFoundException(`Cannot find passport with token [${token}]`)
      })
      .then((passport) => ({...passport, includesGuardian: true}))
  }
}
