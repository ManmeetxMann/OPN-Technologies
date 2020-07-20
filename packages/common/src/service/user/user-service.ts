import DataStore from '../../data/datastore'
import {User, UserModel} from '../../data/user'

export class UserService {
  private dataStore = new DataStore()
  private userRepository = new UserModel(this.dataStore)

  create(user: User): Promise<User> {
    return this.userRepository.add(user)
  }

  findOne(id: string): Promise<User> {
    return this.userRepository.get(id)
  }
}
