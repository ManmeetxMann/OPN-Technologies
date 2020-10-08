import DataStore from '../../../common/src/data/datastore'
import {User, UserGroup, UserOrganization} from '../models/user'
import {CreateUserRequest} from '../types/create-user-request'
import {UpdateUserRequest} from '../types/update-user-request'
import {UserRepository} from '../repository/user.repository'
import {ResourceAlreadyExistsException} from '../../../common/src/exceptions/resource-already-exists-exception'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {UserOrganizationRepository} from '../repository/user-organization.repository'
import {UserDependencyRepository} from '../repository/user-dependency.repository'
import {flattern} from '../../../common/src/utils/utils'
import * as _ from 'lodash'
import {OrganizationGroup} from '../models/organization'
import {UserGroupRepository} from '../repository/user-group.repository'

export class UserService {
  private dataStore = new DataStore()
  private userRepository = new UserRepository(this.dataStore)
  private userOrganizationRepository = new UserOrganizationRepository(this.dataStore)
  private userGroupRepository = new UserGroupRepository(this.dataStore)
  private userDependencyRepository = new UserDependencyRepository(this.dataStore)

  create(source: CreateUserRequest): Promise<User> {
    return this.getByEmail(source.email).then((existedUser) => {
      if (!!existedUser) throw new ResourceAlreadyExistsException(source.email)
      return this.userRepository.add({...source, active: false} as User)
    })
  }

  update(id: string, source: UpdateUserRequest): Promise<User> {
    return this.getById(id).then((target) =>
      this.userRepository.update({
        ...target,
        firstName: source.firstName ?? target.firstName,
        lastName: source.lastName ?? target.lastName,
        photo: source.photo ?? target.photo,
      }),
    )
  }

  getById(id: string): Promise<User> {
    return this.userRepository.get(id).then((target) => {
      if (target) return target
      throw new ResourceNotFoundException(`Cannot find user [${id}]`)
    })
  }

  getByEmail(email: string): Promise<User> {
    return this.userRepository.findWhereEqual('email', email).then((results) => results[0])
  }

  getAllByIds(userIds: string[]): Promise<User[]> {
    return Promise.all(
      _.chunk(userIds, 10).map((chunk) => this.userRepository.findWhereIdIn(chunk)),
    ).then((results) => flattern(results as User[][]))
  }

  activate(user: User): Promise<User> {
    return this.userRepository.update({...user, active: true})
  }

  getAllConnectedOrganizationIds(userId: string): Promise<string[]> {
    return this.userOrganizationRepository
      .findWhereEqual('userId', userId)
      .then((results) => results.map(({organizationId}) => organizationId))
  }

  getDirectDependents(userId: string): Promise<User[]> {
    return this.userDependencyRepository
      .findWhereEqual('parentUserId', userId)
      .then((results) => results.map(({userId}) => userId))
      .then((userIds) => this.getAllByIds(userIds))
  }

  getParents(userId: string): Promise<User[]> {
    return this.userDependencyRepository
      .findWhereEqual('userId', userId)
      .then((results) => results.map(({parentUserId}) => parentUserId))
      .then((userIds) => this.getAllByIds(userIds))
  }

  connectOrganization(userId: string, organizationId: string): Promise<UserOrganization> {
    return this.findOneUserOrganizationBy(userId, organizationId).then((existing) =>
      existing
        ? existing
        : this.userOrganizationRepository.add({organizationId, userId} as UserOrganization),
    )
  }

  disconnectOrganization(userId: string, organizationId: string): Promise<void> {
    return this.findOneUserOrganizationBy(organizationId, userId).then((existing) => {
      if (existing) return this.userOrganizationRepository.delete(existing.id)

      throw new ResourceNotFoundException(
        `User [${userId}] is connected to organization [${organizationId}]`,
      )
    })
  }

  connectGroups(userId: string, groups: OrganizationGroup[]): Promise<UserGroup[]> {
    const groupIds = new Set(groups.map(({id}) => id))
    return Promise.all(
      _.chunk(groupIds, 10)
        .map((chunk) => this.findUserGroupsBy(userId, chunk))
        .then((results) =>
          flattern(results as UserGroup[][]).filter(({groupId}) => !groupIds.has(groupId)),
        )
        .then((toConnect) => this.userGroupRepository.addAll(toConnect)),
    )
  }

  disconnectGroups(userId: string, groups: OrganizationGroup[]): Promise<void> {
    const groupIds = new Set(groups.map(({id}) => id))
    return Promise.all(
      _.chunk(groupIds, 10).map((chunk) =>
        this.findUserGroupsBy(userId, chunk).then((targets) =>
          this.userGroupRepository
            .collection()
            .bulkDelete(targets.map(({id}) => id))
            .then(() => {
              console.log(
                `Deleted [${targets.length}/${chunk.length}] user-group relation for user ${userId}`,
              )
            }),
        ),
      ),
    ).then()
  }

  private findOneUserOrganizationBy(
    userId: string,
    organizationId: string,
  ): Promise<UserOrganization> {
    return this.userOrganizationRepository
      .collection()
      .where('userId', '==', userId)
      .where('organizationId', '==', organizationId)
      .fetch()
      .then((results) => results[0])
  }

  private findUserGroupsBy(userId: string, groupIds: string[]): Promise<UserGroup[]> {
    return this.userGroupRepository
      .collection()
      .where('userId', '==', userId)
      .where('groupId', 'in', groupIds)
      .fetch()
  }
}
