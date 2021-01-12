import DataStore from '../../data/datastore'
import {User, UserDependant, UserFilter, UserModel, LegacyDependant} from '../../data/user'
import {ResourceNotFoundException} from '../../exceptions/resource-not-found-exception'
import {cleanStringField} from '../../../../common/src/utils/utils'
import {DataModelFieldMapOperatorType} from '../../../../common/src/data/datamodel.base'

export class UserService {
  private dataStore = new DataStore()
  private userRepository = new UserModel(this.dataStore)

  create(user: User): Promise<User> {
    return this.userRepository.add(this.cleanUserData(user))
  }

  async update(user: User): Promise<void> {
    await this.userRepository.update(this.cleanUserData(user))
  }

  async updateProperty(id: string, fieldName: string, fieldValue: unknown): Promise<void> {
    // Clean inputs first (note: this is ugly)
    const value =
      fieldName === 'firstName' || fieldName === 'lastName'
        ? cleanStringField(fieldValue as string)
        : fieldValue
    await this.userRepository.updateProperty(id, fieldName, value)
  }

  async updateProperties(id: string, fields: Record<string, unknown>): Promise<void> {
    // Clean inputs first (note: this is ugly)
    if ('firstName' in fields) fields['firstName'] = cleanStringField(fields['firstName'] as string)
    if ('lastName' in fields) fields['lastName'] = cleanStringField(fields['lastName'] as string)
    await this.userRepository.updateProperties(id, fields)
  }

  private cleanUserData(user: User): User {
    const cleanUser = user
    cleanUser.firstName = cleanStringField(user.firstName)
    cleanUser.lastName = cleanStringField(user.lastName)
    if (cleanUser.email) cleanUser.email = cleanStringField(user.email)
    return cleanUser
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
    if (results.length > 1) {
      console.warn(`${results.length} users found with authUserId ${authUserId}`)
    }
    return results.length > 0 ? results.shift() : null
  }

  async findOneByAdminAuthUserId(authUserId: string): Promise<User> {
    const results = await this.userRepository.findWhereEqualInMap([
      {
        map: 'admin',
        key: 'authUserId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: authUserId,
      },
    ])
    if (results.length > 1) {
      console.warn(`${results.length} users found with admin.authUserId ${authUserId}`)
    }
    return results.length > 0 ? results.shift() : null
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

  async addDependants(
    userId: string,
    dependants: (UserDependant | LegacyDependant)[],
    organizationId: string,
  ): Promise<UserDependant[]> {
    const dependantsToAdd = dependants.map((dependant) => ({
      firstName: cleanStringField(dependant.firstName),
      lastName: cleanStringField(dependant.lastName),
      delegates: [userId],
      registrationId: '',
      base64Photo: '',
      organizationIds: [organizationId],
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
