import DataStore from '../../../common/src/data/datastore'
import {User, UserDependency, UserGroup, UserOrganization} from '../models/user'
import {NewUser, LegacyProfile} from '../types/new-user'
import {UpdateUserRequest} from '../types/update-user-request'
import {UserRepository} from '../repository/user.repository'
import {ResourceAlreadyExistsException} from '../../../common/src/exceptions/resource-already-exists-exception'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {UserOrganizationRepository} from '../repository/user-organization.repository'
import {UserDependencyRepository} from '../repository/user-dependency.repository'
import {flattern} from '../../../common/src/utils/utils'
import * as _ from 'lodash'
import {UserGroupRepository} from '../repository/user-group.repository'
import {OrganizationUsersGroupModel} from '../repository/organization.repository'
import {UserModel} from '../../../common/src/data/user'

export class UserService {
  private dataStore = new DataStore()
  private userRepository = new UserRepository(this.dataStore)
  private userOrganizationRepository = new UserOrganizationRepository(this.dataStore)
  private userGroupRepository = new UserGroupRepository(this.dataStore)
  private userDependencyRepository = new UserDependencyRepository(this.dataStore)

  create(source: NewUser): Promise<User> {
    return this.getByEmail(source.email).then((existedUser) => {
      if (!!existedUser) throw new ResourceAlreadyExistsException(source.email)

      return this.userRepository.add({
        firstName: source.firstName,
        lastName: source.lastName,
        email: source.email,
        photo: source.photo ?? null,
        phone: source.phone ?? null,
        registrationId: source.registrationId ?? null,
        authUserId: source.authUserId ?? null,
        active: source.active ?? false,
      } as User)
    })
  }

  migrateExistingUser(legacyProfiles: LegacyProfile[], newUserId: string): Promise<void> {
    return Promise.all(
      legacyProfiles.map(async ({userId, organizationId, groupId, dependentIds}) => {
        // Create dependents
        const uniqueDependentIds = new Set(dependentIds)
        const migratedDependentIds: string[] = await this.userRepository
          .collection(`${userId}/dependants`)
          .fetchAll()
          .then((dependents: unknown[]) =>
            Promise.all(
              dependents
                .filter(({id}) => uniqueDependentIds.has(id))
                .map(({id, firstName, lastName}) =>
                  this.userRepository.add({id, firstName, lastName, active: true} as User),
                ),
            ),
          )
          .then((results) => results.map(({id}) => id))

        // Link dependents to principal user
        await this.userDependencyRepository.addAll(
          dependentIds.map((id) => ({userId: id, parentUserId: newUserId} as UserDependency)),
        )

        // Connect to organizations
        const userOrganizations = [newUserId, ...migratedDependentIds].map(
          (id) => ({userId: id, organizationId} as UserOrganization),
        )
        await this.userOrganizationRepository.addAll(userOrganizations)

        // Connect groups
        await this.userGroupRepository.add({userId: newUserId, groupId} as UserGroup)
        await new OrganizationUsersGroupModel(this.dataStore, organizationId)
          .findWhereIn('userId', migratedDependentIds)
          .then((targets) => targets.map(({userId, groupId}) => ({userId, groupId} as UserGroup)))
          .then((targets) => this.userGroupRepository.addAll(targets))
      }),
    ).then()
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

  getAllByOrganizationId(organizationId: string, page: number, perPage: number): Promise<User[]> {
    const userIdsQuery = this.userRepository.getQueryFindWhereArrayContains(
      'organizationIds',
      organizationId,
    )
    return this.userRepository.fetchPage(userIdsQuery, page, perPage)
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

  addDependents(dependents: User[], parentUserId: string): Promise<User[]> {
    return Promise.all(
      dependents
        // Normalize
        .map(({email, ...dependent}) => ({
          ...dependent,
          email: email ?? null,
          photo: null,
          active: true,
          authUserId: null,
        }))
        .map((dependent) =>
          (dependent.id
            ? this.getById(dependent.id)
            : this.userRepository.add(dependent)
          ).then((user) =>
            this.userDependencyRepository
              .add({parentUserId, userId: user.id} as UserDependency)
              .then(() => user),
          ),
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

  getDirectDependents(userId: string): Promise<User[]> {
    return this.userDependencyRepository
      .collection()
      .where('parentUserId', '==', userId)
      .fetch()
      .then((results) => this.getAllByIds(results.map(({userId}) => userId)))
  }

  getParents(userId: string): Promise<User[]> {
    return this.userDependencyRepository
      .collection()
      .where('userId', '==', userId)
      .fetch()
      .then((results) => this.getAllByIds(results.map(({parentUserId}) => parentUserId)))
  }

  connectOrganization(userId: string, organizationId: string): Promise<UserOrganization> {
    return (
      this.findOneUserOrganizationBy(userId, organizationId)
        .then((existing) =>
          existing
            ? existing
            : this.userOrganizationRepository.add({
                organizationId,
                userId,
              } as UserOrganization),
        )
        // TODO TO BE REMOVED: Support for legacy APIs
        .then((userGroup) => {
          const legacyUserRepository = new UserModel(this.dataStore)
          return legacyUserRepository
            .get(userId)
            .then((user) =>
              legacyUserRepository.updateProperty(
                userId,
                'organizationIds',
                Array.from(new Set([...(user.organizationIds ?? []), organizationId])),
              ),
            )
            .then(() => userGroup)
        })
    )
    // TODO: End of legacy support
  }

  disconnectOrganization(
    userId: string,
    organizationId: string,
    groupIds: Set<string>,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return this.dataStore.firestoreORM.runTransaction((_transaction) =>
      this.disconnectGroups(userId, groupIds).then(() =>
        this.findOneUserOrganizationBy(userId, organizationId).then((existing) => {
          if (existing) return this.userOrganizationRepository.delete(existing.id)

          throw new ResourceNotFoundException(
            `User [${userId}] is not connected to organization [${organizationId}]`,
          )
        }),
      ),
    )
  }

  getAllGroupIdsForUser(userId: string): Promise<Set<string>> {
    return this.userGroupRepository
      .findWhereEqual('userId', userId)
      .then((results) => new Set(results?.map(({groupId}) => groupId)))
  }

  connectGroups(userId: string, groupIds: string[]): Promise<UserGroup[]> {
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

  updateGroup(userId: string, fromGroupId: string, toGroupId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return this.dataStore.firestoreORM.runTransaction((_transaction) =>
      this.disconnectGroups(userId, new Set([fromGroupId]))
        .then(() => this.connectGroups(userId, [toGroupId]))
        .then(),
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
}
