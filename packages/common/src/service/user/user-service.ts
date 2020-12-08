import DataStore from '../../data/datastore'
import {User, UserDependant, UserFilter, UserModel, LegacyDependant} from '../../data/user'
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

  findAllBy({userIds}: UserFilter): Promise<User[]> {
    return this.userRepository.findWhereIdIn(userIds)
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

  async findAllByAuthUserId(authUserId: string): Promise<User[]> {
    const results = await this.userRepository.findWhereEqual('authUserId', authUserId)
    return results.length > 0 ? results : null
  }

  getAllDependants(userId: string, skipUserCheck = false): Promise<UserDependant[]> {
    return Promise.all([
      this.userRepository.findWhereArrayContains('delegates', userId),
      // make sure the user exists. Skippable for efficiency if the user is already known to exist
      skipUserCheck ? () => Promise.resolve() : this.findOne(userId).then(() => null),
    ]).then(([dependants]) => dependants)
  }

  async getDependantAndParentByParentId(
    parentId: string,
    dependantId: string,
  ): Promise<{parent: User; dependant: UserDependant}> {
    const [parent, dependant] = await Promise.all([
      this.findOne(parentId),
      this.findOne(dependantId),
    ])
    if (!dependant.delegates?.includes(parentId)) {
      throw new ResourceNotFoundException(`${parentId} not a delegate of ${dependantId}`)
    }
    return {
      parent,
      dependant,
    }
  }

  getUserAndDependants(userId: string): Promise<{guardian: User; dependants: UserDependant[]}> {
    return Promise.all([this.getAllDependants(userId, true), this.findOne(userId)]).then(
      ([dependants, guardian]) => ({
        guardian,
        dependants,
      }),
    )
  }

  async updateDependantProperties(
    parentId: string,
    dependantId: string,
    fields: Record<string, unknown>,
  ): Promise<void> {
    const dependant = await this.findOne(dependantId)
    if (!dependant.delegates?.includes(parentId)) {
      throw new ResourceNotFoundException(`${parentId} not a delegate of ${dependantId}`)
    }
    await this.userRepository.updateProperties(dependantId, fields)
  }
  // TODO: validate this
  async addDependants(
    userId: string,
    dependants: (UserDependant | LegacyDependant)[],
  ): Promise<UserDependant[]> {
    const parent = await this.findOne(userId)
    const dependantsToAdd = dependants.map((dependant) => ({
      firstName: dependant.firstName,
      lastName: dependant.lastName,
      delegates: [userId],
      registrationId: '',
      base64Photo: '',
      organizationIds: parent.organizationIds,
    }))
    // @ts-ignore no id needed
    return Promise.all(dependantsToAdd.map((dependant) => this.create(dependant)))
  }

  async removeDependant(parentId: string, dependantId: string): Promise<void> {
    const dependant = await this.findOne(dependantId)
    if (!dependant.delegates?.includes(parentId)) {
      throw new ResourceNotFoundException(`${parentId} not a delegate of ${dependantId}`)
    }
    return this.userRepository.delete(dependantId)
  }

  findHealthAdminsForOrg(organizationId: string): Promise<User[]> {
    return this.userRepository.findWhereArrayInMapContains(
      'admin',
      'healthAdminForOrganizationIds',
      organizationId,
    )
  }

  getAdminsForGroup(groupId: string): Promise<User[]> {
    return this.userRepository.findWhereArrayInMapContains('admin', 'adminForGroupIds', groupId)
  }
}
