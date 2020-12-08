import * as _ from 'lodash'
import {nanoid} from 'nanoid'
import moment from 'moment'

import {
  User,
  UserDependency,
  UserGroup,
  UserOrganization,
  UserOrganizationProfile,
} from '../models/user'
import {NewUser, LegacyProfile} from '../types/new-user'
import {UpdateUserByAdminRequest, UpdateUserRequest} from '../types/update-user-request'
import {UserRepository} from '../repository/user.repository'

import DataStore from '../../../common/src/data/datastore'
import {UserModel} from '../../../common/src/data/user'

import {ResourceAlreadyExistsException} from '../../../common/src/exceptions/resource-already-exists-exception'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'

import {UserOrganizationRepository} from '../repository/user-organization.repository'
import {UserOrganizationProfileRepository} from '../repository/user-organization-profile.repository'
import {UserDependencyRepository} from '../repository/user-dependency.repository'
import {UserGroupRepository} from '../repository/user-group.repository'
import {OrganizationUsersGroupModel} from '../repository/organization.repository'

import {RegistrationService} from '../../../common/src/service/registry/registration-service'

import {isEmail} from '../../../common/src/utils/utils'

export class UserService {
  private dataStore = new DataStore()
  private userRepository = new UserRepository(this.dataStore)
  private userOrganizationRepository = new UserOrganizationRepository(this.dataStore)
  private userOrganizationProfileRepository = new UserOrganizationProfileRepository(this.dataStore)
  private userGroupRepository = new UserGroupRepository(this.dataStore)
  private userDependencyRepository = new UserDependencyRepository(this.dataStore)
  private registrationService = new RegistrationService()

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
        memberId: source.memberId ?? null,
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

  updateByAdmin(id: string, source: UpdateUserByAdminRequest): Promise<User> {
    return this.getById(id).then((target) =>
      this.userRepository.update({
        ...target,
        firstName: source.firstName ?? target.firstName,
        lastName: source.lastName ?? target.lastName,
        photo: source.photo ?? target.photo ?? null,
        registrationId: source.registrationId ?? target.registrationId ?? null,
        phone: source.phone ?? target.phone ?? null,
        memberId: source.memberId ?? target.memberId ?? null,
      }),
    )
  }

  getById(id: string): Promise<User> {
    return this.userRepository.get(id).then((target) => {
      if (target) return target
      throw new ResourceNotFoundException(`Cannot find user [${id}]`)
    })
  }

  searchByQueryAndOrganizationId(organizationId: string, query: string): Promise<User[]> {
    const searchArray = query.split(' ')
    const searchPromises = []
    const email = searchArray.find((string) => isEmail(string))

    if (searchArray.length === 1) {
      if (email) {
        searchPromises.push(
          this.userRepository
            .getQueryFindWhereArrayContains('organizationIds', organizationId)
            .where('email', '==', searchArray[0])
            .fetch(),
        )
      } else {
        searchPromises.push(
          this.userRepository
            .getQueryFindWhereArrayContains('organizationIds', organizationId)
            .where('firstName', '==', searchArray[0])
            .fetch(),
          this.userRepository
            .getQueryFindWhereArrayContains('organizationIds', organizationId)
            .where('lastName', '==', searchArray[0])
            .fetch(),
        )
      }
    } else if (searchArray.length === 2) {
      if (email) {
        searchArray.splice(searchArray.indexOf(email), 1)

        searchPromises.push(
          this.userRepository
            .getQueryFindWhereArrayContains('organizationIds', organizationId)
            .where('email', '==', email)
            .where('firstName', '==', searchArray[0])
            .fetch(),
          this.userRepository
            .getQueryFindWhereArrayContains('organizationIds', organizationId)
            .where('email', '==', email)
            .where('lastName', '==', searchArray[0])
            .fetch(),
        )
      } else {
        searchPromises.push(
          this.userRepository
            .getQueryFindWhereArrayContains('organizationIds', organizationId)
            .where('firstName', '==', searchArray[0])
            .where('lastName', '==', searchArray[1])
            .fetch(),
          this.userRepository
            .getQueryFindWhereArrayContains('organizationIds', organizationId)
            .where('firstName', '==', searchArray[1])
            .where('lastName', '==', searchArray[0])
            .fetch(),
        )
      }
    } else if (searchArray.length === 3) {
      if (email) {
        searchArray.splice(searchArray.indexOf(email), 1)
        searchPromises.push(
          this.userRepository
            .getQueryFindWhereArrayContains('organizationIds', organizationId)
            .where('email', '==', email)
            .where('firstName', '==', searchArray[1])
            .where('lastName', '==', searchArray[0])
            .fetch(),
          this.userRepository
            .getQueryFindWhereArrayContains('organizationIds', organizationId)
            .where('email', '==', email)
            .where('firstName', '==', searchArray[0])
            .where('lastName', '==', searchArray[1])
            .fetch(),
        )
      } else {
        searchPromises.push(
          this.userRepository
            .getQueryFindWhereArrayContains('organizationIds', organizationId)
            .where('firstName', '==', searchArray[1])
            .where('lastName', '==', searchArray[0])
            .fetch(),
          this.userRepository
            .getQueryFindWhereArrayContains('organizationIds', organizationId)
            .where('firstName', '==', searchArray[0])
            .where('lastName', '==', searchArray[1])
            .fetch(),
          this.userRepository
            .getQueryFindWhereArrayContains('organizationIds', organizationId)
            .where('firstName', '==', searchArray[1])
            .where('lastName', '==', searchArray[2])
            .fetch(),
          this.userRepository
            .getQueryFindWhereArrayContains('organizationIds', organizationId)
            .where('firstName', '==', searchArray[2])
            .where('lastName', '==', searchArray[1])
            .fetch(),
          this.userRepository
            .getQueryFindWhereArrayContains('organizationIds', organizationId)
            .where('firstName', '==', searchArray[2])
            .where('lastName', '==', searchArray[0])
            .fetch(),
          this.userRepository
            .getQueryFindWhereArrayContains('organizationIds', organizationId)
            .where('firstName', '==', searchArray[0])
            .where('lastName', '==', searchArray[2])
            .fetch(),
        )
      }
    }

    return Promise.all(searchPromises)
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
    ).then((results) => _.flatten(results as User[][]))
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

  createOrganizationProfile(
    userId: string,
    organizationId: string,
    memberId: string,
  ): Promise<UserOrganizationProfile> {
    return this.userOrganizationProfileRepository.add({
      userId,
      organizationId,
      memberId,
    } as UserOrganizationProfile)
  }

  async generateAndSaveShortCode(userId: string): Promise<string> {
    const code = nanoid(6)
    const expiresAt = moment().add(1, 'hours')
    const [registration] = await this.registrationService.findForUserIds([userId])

    if (registration) {
      await this.registrationService.updateProperty(registration.id, 'shortCode', {
        code,
        expiresAt,
      })

      return code
    }

    throw new ResourceNotFoundException('Registration for this user not found')
  }

  async isShortCodeValid(userId: string, code: string): Promise<boolean> {
    const [registration] = await this.registrationService.findForUserIds([userId])

    return (
      moment().isAfter(registration.shortCode.expiresAt) && code === registration.shortCode.code
    )
  }

  async clearShortCode(userId: string): Promise<void> {
    const [registration] = await this.registrationService.findForUserIds([userId])
    await this.registrationService.updateProperty(registration.id, 'shortCode', {})
  }
}
