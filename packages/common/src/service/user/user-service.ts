import DataStore from '../../data/datastore'
import {User, UserModel} from '../../data/user'

export class UserService {
  private dataStore = new DataStore()
  private userRepository = new UserModel(this.dataStore)

  create(user: User): Promise<User> {
    return this.userRepository.add(user)
  }

  async update(user: User): Promise<void> {
    await this.userRepository.update(user)
  }

  async updateProperty(id: string, fieldName: string, fieldValue: string): Promise<void> {
    await this.userRepository.updateProperty(id, fieldName, fieldValue)
  }

  findOne(id: string): Promise<User> {
    return this.userRepository.get(id)
  }

  async findOneById(id: string): Promise<User> {
    const user = await this.userRepository.get(id)
    return !user ? null : user
  }

  async findOneByAuthUserId(authUserid: string): Promise<User> {
    const results = await this.userRepository.findWhereEqual('authUserId', authUserid)
    return results.length > 0 ? results.shift() : null
  }
}
