import DataStore from '../../../common/src/data/datastore'
import {
  ConnectionStatus,
  ConnectionStatuses,
  User,
  UserDependency,
  UserGroup,
  UserMatcher,
  UserOrganization,
} from '../models/user'
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
import {nanoid} from 'nanoid'

export class UserService {
  private dataStore = new DataStore()
  private userRepository = new UserRepository(this.dataStore)
  private userOrganizationRepository = new UserOrganizationRepository(this.dataStore)
  private userGroupRepository = new UserGroupRepository(this.dataStore)
  private userDependencyRepository = new UserDependencyRepository(this.dataStore)

  create(source: CreateUserRequest): Promise<User> {
    return this.getByEmail(source.email).then((existedUser) => {
      if (!!existedUser) throw new ResourceAlreadyExistsException(source.email)
      return this.userRepository.add({
        ...source,
        identifier: source.email,
        authUserId: null,
        active: false,
      } as User)
    })
  }

  update(id: string, source: UpdateUserRequest): Promise<User> {
    return this.getById(id).then((target) =>
      this.userRepository.update({
        ...target,
        firstName: source.firstName ?? target.firstName,
        lastName: source.lastName ?? target.lastName,
        photo: source.photo ?? target.photo ?? null,
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

  async addDependents(dependents: User[], parentUserId: string): Promise<User[]> {
    const existingDependentIds = new Set(
      (await this.getDirectDependents(parentUserId)).map(({id}) => id),
    )
    // Add or link existing user who matches (firstName, lastName, identifier)
    // Generate an OPN identifier if none provided to avoid discovering user with same FirstName and LastName
    // If a matching record is found (firstName|lastName|identifier) a pending link will be created
    // An approval process will be required to approve/reject user-dependent relation
    return Promise.all(
      dependents
        // Normalize
        .map(({identifier, email, ...dependent}) => ({
          ...dependent,
          email: email ?? null,
          identifier: identifier ?? email ?? `OPN-${nanoid(5)}`,
          photo: null,
          active: true,
          authUserId: null,
        }))
        .map(({firstName, lastName, identifier, email, ...dependent}) =>
          this.findUsersBy({firstName, lastName, identifier, email}).then((results) => {
            // No matching record
            if (results.length === 0) {
              return this.userRepository
                .add({...dependent, firstName, lastName, identifier, email})
                .then((user) =>
                  this.userDependencyRepository
                    .add({
                      parentUserId,
                      userId: user.id,
                      status: ConnectionStatuses.Approved,
                    } as UserDependency)
                    .then(() => user),
                )
            }

            // Matching record
            return existingDependentIds.has(results[0].id)
              ? results[0]
              : this.userDependencyRepository
                  .add({
                    parentUserId,
                    userId: results[0].id,
                    status: ConnectionStatuses.Pending,
                  } as UserDependency)
                  .then(() => results[0])
          }),
        ),
    )
  }

  removeUser(userId: string): Promise<void> {
    return this.userRepository.delete(userId)
  }

  removeDependent(dependentId: string, parentUserId: string): Promise<void> {
    return this.userDependencyRepository
      .collection()
      .where('userId', '==', dependentId)
      .where('parentUserId', '==', parentUserId)
      .fetch()
      .then((results) => {
        if (results.length === 0)
          throw new ResourceNotFoundException(
            `User [${dependentId}] is not a dependent of user [${parentUserId}]`,
          )
        return this.userDependencyRepository.delete(results[0].id)
      })
  }

  getDirectDependents(userId: string, statuses?: ConnectionStatus[]): Promise<User[]> {
    let query = this.userDependencyRepository.collection().where('parentUserId', '==', userId)

    if (statuses?.length) {
      query = query.where('status', 'in', statuses)
    }

    return query
      .fetch()
      .then((results) => results.map(({userId}) => userId))
      .then((userIds) => this.getAllByIds(userIds))
  }

  getParents(userId: string, statuses?: ConnectionStatus[]): Promise<User[]> {
    let query = this.userDependencyRepository.collection().where('userId', '==', userId)

    if (statuses?.length) {
      query = query.where('status', 'in', statuses)
    }

    return query
      .fetch()
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

  disconnectOrganization(
    userId: string,
    organizationId: string,
    groupIds: Set<string>,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return this.dataStore.firestoreORM.runTransaction((_transaction) => {
      return this.disconnectGroups(userId, groupIds).then(() =>
        this.findOneUserOrganizationBy(userId, organizationId).then((existing) => {
          if (existing) return this.userOrganizationRepository.delete(existing.id)

          throw new ResourceNotFoundException(
            `User [${userId}] is not connected to organization [${organizationId}]`,
          )
        }),
      )
    })
  }

  getAllGroupIdsForUser(userId: string): Promise<Set<string>> {
    return this.userGroupRepository
      .findWhereEqual('userId', userId)
      .then((results) => new Set(results?.map(({groupId}) => groupId)))
  }

  connectGroups(userId: string, groups: OrganizationGroup[]): Promise<UserGroup[]> {
    const groupIds = groups.map(({id}) => id)
    return this.getAllGroupIdsForUser(userId)
      .then((existingGroupIds) => groupIds.filter((id) => !existingGroupIds.has(id)))
      .then((groupIdsToConnect) =>
        this.userGroupRepository.addAll(
          groupIdsToConnect.map((groupId) => ({userId, groupId} as UserGroup)),
        ),
      )
  }

  disconnectGroups(userId: string, groupIds: Set<string>): Promise<void> {
    return Promise.all(
      _.chunk([...groupIds], 10).map((chunk) =>
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

  disconnectAllGroups(userId: string): Promise<void> {
    return this.findUserGroupsBy(userId).then((targets) =>
      this.userGroupRepository
        .collection()
        .bulkDelete(targets.map(({id}) => id))
        .then(() => {
          console.log(`Deleted all user-group relation for user ${userId}`)
        }),
    )
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

  private findUserGroupsBy(userId: string, groupIds?: string[]): Promise<UserGroup[]> {
    let query = this.userGroupRepository.collection().where('userId', '==', userId)
    if (groupIds?.length) {
      query = query.where('groupId', 'in', groupIds)
    }
    return query.fetch()
  }

  private findUsersBy({firstName, lastName, identifier, email}: UserMatcher): Promise<User[]> {
    let query = this.userRepository
      .collection()
      .where('firstName', '==', firstName)
      .where('lastName', '==', lastName)

    if (identifier) {
      query = query.where('identifier', '==', identifier)
    }

    if (email) {
      query = query.where('email', '==', email)
    }

    return query.fetch()
  }
}
