import DataStore from '../../../common/src/data/datastore'
import {Registration, RegistrationModel} from '../models/registration'

export class RegistrationService {
  private repository = new RegistrationModel(new DataStore())

  create(registration: Registration): Promise<Registration> {
    return this.repository.add(registration)
  }

  findOneByToken(token: string): Promise<Registration> {
    return this.repository
      .findWhereEqual('pushToken', token)
      .then((results) => (results.length > 0 ? results[0] : null))
  }

  findForUserIds(userIds: string[]): Promise<Registration[]> {
    return this.repository.findWhereIn('userId', userIds)
  }

  update(registration: Registration): Promise<Registration> {
    return this.repository.update(registration)
  }
}
