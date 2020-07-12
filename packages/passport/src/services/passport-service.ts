import {Passport, PassportModel, PassportStatuses} from '../models/passport'
import DataStore from '../../../common/src/data/datastore'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {IdentifiersModel} from '../../../common/src/data/identifiers'
import moment from 'moment'

export class PassportService {
  private dataStore = new DataStore()
  private passportRepository = new PassportModel(this.dataStore)
  private identifierRepository = new IdentifiersModel(this.dataStore)

  create(status: PassportStatuses = PassportStatuses.Pending): Promise<Passport> {
    const now = moment()
    return this.identifierRepository.getUniqueValue('status').then((statusToken) =>
      this.passportRepository.add({
        status,
        statusToken,
        validFrom: now.toISOString(),
        validUntil: now.add(24, 'hours').toISOString(),
      }),
    )
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
