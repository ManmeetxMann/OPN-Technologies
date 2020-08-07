import {Passport, PassportModel, PassportStatuses} from '../models/passport'
import DataStore from '../../../common/src/data/datastore'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {IdentifiersModel} from '../../../common/src/data/identifiers'
import {UserDependantModel} from '../../../common/src/data/user'
import moment from 'moment'
import {firestore} from 'firebase-admin'

const ATTESTATION_SECONDS = 24 * 60 * 60

export class PassportService {
  private dataStore = new DataStore()
  private passportRepository = new PassportModel(this.dataStore)
  private identifierRepository = new IdentifiersModel(this.dataStore)

  async create(
    status: PassportStatuses = PassportStatuses.Pending,
    userId: string,
    includesGuardian: boolean,
    dependantIds: string[],
  ): Promise<Passport> {
    if (!includesGuardian && dependantIds.length === 0) {
      throw new Error('passport must be for at least one person')
    }
    if (dependantIds.length) {
      const depModel = new UserDependantModel(this.dataStore, userId)
      const allDependants = (await depModel.fetchAll()).map(({id}) => id)
      const invalidIds = dependantIds.filter((depId) => allDependants.includes(depId))
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
          includesGuardian,
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
        validUntil: new firestore.Timestamp(
          // @ts-ignore
          validFrom.seconds + ATTESTATION_SECONDS,
          // @ts-ignore
          validFrom.nanoseconds,
        )
          .toDate()
          .toISOString(),
      }))
      .then((passport) => this.passportRepository.update(passport))
  }

  findOneByToken(token: string): Promise<Passport> {
    return this.passportRepository.findWhereEqual('statusToken', token).then((results) => {
      if (results.length > 0) {
        return results[0]
      }
      throw new ResourceNotFoundException(`Cannot find passport with token [${token}]`)
    })
  }
}
