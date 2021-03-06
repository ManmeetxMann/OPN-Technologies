import {NewUser} from '../types/new-user'
import {AuthUser} from '../../../common/src/data/user'
import {UpdateUserByAdminRequest, UpdateUserRequest} from '../types/update-user-request'
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
  connectOrganization(userId: string, organizationId: string): void
}
