import DataStore from '../../data/datastore'
import {User, UserDependant, UserDependantModel, UserModel} from '../../data/user'
import {ResourceNotFoundException} from '../../exceptions/resource-not-found-exception'

export class UserService {
  private dataStore = new DataStore()
  private userRepository = new UserModel(this.dataStore)

  private digestRecord(user: User, includeResponses = false): User {
    if (includeResponses) {
      return user
    }
    return {
      ...user,
      registrationAnswers: [[]],
    }
  }

  async create(user: User): Promise<User> {
    const result = await this.userRepository.add(user)
    return this.digestRecord(result)
  }

  async update(user: User): Promise<void> {
    await this.userRepository.update(user)
  }

  async updateProperty(id: string, fieldName: string, fieldValue: unknown): Promise<void> {
    await this.userRepository.updateProperty(id, fieldName, fieldValue)
  }

  async updateProperties(id: string, fields: Record<string, unknown>): Promise<void> {
    await this.userRepository.updateProperties(id, fields)
  }

  async findOne(id: string, includeResponses = false): Promise<User> {
    return this.userRepository.get(id).then((user) => {
      if (!!user) return this.digestRecord(user, includeResponses)
      throw new ResourceNotFoundException(`Cannot find user with id [${id}]`)
    })
  }

  async findOneById(id: string, includeResponses = false): Promise<User> {
    const user = await this.userRepository.get(id)
    return !user ? null : this.digestRecord(user, includeResponses)
  }

  async findOneByAuthUserId(authUserId: string): Promise<User> {
    const results = await this.userRepository.findWhereEqual('authUserId', authUserId)
    return results.length > 0 ? results.shift() : null
  }

  getAllDependants(userId: string): Promise<UserDependant[]> {
    return this.findOne(userId).then(() =>
      new UserDependantModel(this.dataStore, userId).fetchAll(),
    )
  }

  addDependants(userId: string, members: UserDependant[]): Promise<UserDependant[]> {
    return this.findOne(userId).then(() =>
      new UserDependantModel(this.dataStore, userId).addAll(members),
    )
  }

  removeDependant(userId: string, dependantId: string): Promise<void> {
    return this.findOne(userId).then(() =>
      new UserDependantModel(this.dataStore, userId).delete(dependantId),
    )
  }
}
