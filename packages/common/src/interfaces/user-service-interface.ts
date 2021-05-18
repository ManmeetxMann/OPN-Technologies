import {LegacyDependant, User, UserDependant, UserFilter} from '../data/user'

export interface UserServiceInterface {
  create(user: Omit<User, 'id'>): Promise<User>

  update(user: User): Promise<void>

  updateProperty(id: string, fieldName: string, fieldValue: unknown): Promise<void>

  updateProperties(id: string, fields: Record<string, unknown>): Promise<void>

  cleanUserData(user: Omit<User, 'id'>): Omit<User, 'id'>

  findAllBy({userIds}: UserFilter): Promise<User[]>

  findOne(id: string): Promise<User>

  findOneByEmail(email: string): Promise<User>

  findOneByPhone(phone: string): Promise<User>

  findOneSilently(id: string): Promise<User | undefined>

  findOneByAuthUserId(authUserId: string): Promise<User>

  findOneByAdminAuthUserId(authUserId: string): Promise<User>

  getAllDependants(userId: string, skipUserCheck): Promise<UserDependant[]>

  getDependantAndParentByParentId(
    parentId: string,
    dependantId: string,
  ): Promise<{parent: User; dependant: UserDependant}>

  getUserAndDependants(userId: string): Promise<{guardian: User; dependants: UserDependant[]}>

  updateDependantProperties(
    parentId: string,
    dependantId: string,
    fields: Record<string, unknown>,
  ): Promise<void>

  addDependants(
    userId: string,
    dependants: (UserDependant | LegacyDependant)[],
    organizationId: string,
  ): Promise<UserDependant[]>

  removeDependant(parentId: string, dependantId: string): Promise<void>

  findHealthAdminsForOrg(organizationId: string): Promise<User[]>

  getAll(labId?: string): Promise<User[]>

  getAdminsForGroup(groupId: string): Promise<User[]>

  isParentForChild(parentId: string, childId: string): Promise<boolean>
}
