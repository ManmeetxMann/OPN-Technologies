import {NewUser} from '../types/new-user'
import {AuthUser} from '../../../common/src/data/user'
import {UpdateUserByAdminRequest, UpdateUserRequest} from '../types/update-user-request'
import {UserGroup, UserOrganizationProfile} from '../models/user'
import {CursoredUsersRequestFilter} from '../types/user-organization-request'

export interface UserServiceInterface {
  create(source: NewUser): Promise<AuthUser>
  update(id: string, source: UpdateUserRequest): Promise<AuthUser>
  updateByAdmin(id: string, source: UpdateUserByAdminRequest): Promise<AuthUser>
  getById(id: string): Promise<AuthUser>
  searchByQueryAndOrganizationId(organizationId: string, query: string): Promise<AuthUser[]>
  findAllUsers({
    organizationId,
    from,
    limit,
    query,
  }: CursoredUsersRequestFilter): Promise<AuthUser[]>
  getAllByOrganizationId(organizationId: string, page: number, perPage: number): Promise<AuthUser[]>
  getByEmail(email: string): Promise<AuthUser>
  getAllByIds(userIds: string[]): Promise<AuthUser[]>
  activate(user: AuthUser): Promise<AuthUser>
  addDependents(dependents: AuthUser[], parentUserId: string): Promise<AuthUser[]>
  removeUser(userId: string): Promise<void>
  removeDependent(dependentId: string, parentUserId: string): Promise<void>
  getDirectDependents(userId: string): Promise<AuthUser[]>
  getParents(userId: string): Promise<AuthUser[]>
  connectOrganization(userId: string, organizationId: string): void
  disconnectOrganization(userId: string, organizationId: string): Promise<void>
  getAllGroupIdsForUser(userId: string): Promise<Set<string>>
  connectGroups(userId: string, groupIds: string[]): Promise<UserGroup[]>
  disconnectGroups(userId: string, groupIds: Set<string>): Promise<void>
  disconnectAllGroups(userId: string): Promise<void>
  updateGroup(userId: string, fromGroupId: string, toGroupId: string): Promise<void>
  createOrganizationProfile(
    userId: string,
    organizationId: string,
    memberId: string,
  ): Promise<UserOrganizationProfile>
}
