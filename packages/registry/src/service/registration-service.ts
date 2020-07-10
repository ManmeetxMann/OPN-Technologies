import DataStore from '../../../common/src/data/datastore'
import {Registration, RegistrationModel} from '../models/registration'
import {HttpException} from '../../../common/src/exceptions/httpexception'

export class RegistrationService {
  private dataStore = new DataStore()

  create(registration: Registration): Promise<Registration> {
    const model = new RegistrationModel(this.dataStore)
    return model
      .add(registration)
      .then((id) => model.get(id))
      .catch((error) => {
        console.error(error)
        throw new HttpException()
      })
  }
}
