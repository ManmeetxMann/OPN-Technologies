import {Passport, PassportModel, PassportStatuses} from '../models/passport'
import DataStore from '../../../common/src/data/datastore'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {IdentifiersModel} from '../../../common/src/data/identifiers'
import moment from 'moment'
import {firestore} from 'firebase-admin'

export class PassportService {
  private dataStore = new DataStore()
  private passportRepository = new PassportModel(this.dataStore)
  private identifierRepository = new IdentifiersModel(this.dataStore)

  create(status: PassportStatuses = PassportStatuses.Pending): Promise<Passport> {
    return this.identifierRepository
      .getUniqueValue('status')
      .then((statusToken) =>
        this.passportRepository.add({
          status,
          statusToken,
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
