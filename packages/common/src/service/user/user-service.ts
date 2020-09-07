import DataStore from '../../data/datastore'
import {User, UserDependant, UserDependantModel, UserModel} from '../../data/user'
import {ResourceNotFoundException} from '../../exceptions/resource-not-found-exception'

export class UserService {
  private dataStore = new DataStore()
  private userRepository = new UserModel(this.dataStore)

  create(user: User): Promise<User> {
    return this.userRepository.add(user)
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

  findOne(id: string): Promise<User> {
    return this.findOneSilently(id).then((user) => {
      if (!!user) return user
      throw new ResourceNotFoundException(`Cannot find user with id [${id}]`)
    })
  }

  findOneSilently(id: string): Promise<User | undefined> {
    return this.userRepository.get(id)
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

  getDependantAndParentByParentId(
    parentId: string,
    dependantId: string,
  ): Promise<{parent: User; dependant: UserDependant}> {
    return this.findOne(parentId).then((parent) =>
      new UserDependantModel(this.dataStore, parentId).get(dependantId).then((dependant) => {
        if (!!dependant) return {parent, dependant}
        throw new ResourceNotFoundException(`Cannot find dependant with id ${dependantId}`)
      }),
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
