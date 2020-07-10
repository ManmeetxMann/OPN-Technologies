import DataStore from '../../../common/src/data/datastore'
import {Registration, RegistrationModel} from '../models/registration'

export class RegistrationService {
  private repository = new RegistrationModel(new DataStore())

  create(registration: Registration): Promise<Registration> {
    return this.repository.add(registration).then((id) => this.repository.get(id))
  }

  findOneByToken(token: string): Promise<Registration> {
    return this.repository
      .findWhereEqual('pushToken', token)
      .then((results) => (results.length > 0 ? results[0] : null))
  }

  update(registration: Registration): Promise<Registration> {
    return this.repository.update(registration).then(() => this.repository.get(registration.id))
  }
}
