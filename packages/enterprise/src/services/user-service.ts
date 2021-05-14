import * as _ from 'lodash'
import DataStore from '../../../common/src/data/datastore'
import {UserDependency, UserGroup, UserOrganizationProfile} from '../models/user'
import {NewUser} from '../types/new-user'
import {UpdateUserByAdminRequest, UpdateUserRequest} from '../types/update-user-request'
import {UserRepository} from '../repository/user.repository'
import {ResourceAlreadyExistsException} from '../../../common/src/exceptions/resource-already-exists-exception'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {UserDependencyRepository} from '../repository/user-dependency.repository'
import {UserGroupRepository} from '../repository/user-group.repository'
import {AuthUser, UserModel} from '../../../common/src/data/user'
import {isEmail, titleCase, cleanStringField} from '../../../common/src/utils/utils'
import {CursoredUsersRequestFilter} from '../types/user-organization-request'
import {UserServiceInterface} from '../interfaces/user-service-interface'

export class UserService implements UserServiceInterface {
  private dataStore = new DataStore()
  private userRepository = new UserRepository(this.dataStore)
  private userGroupRepository = new UserGroupRepository(this.dataStore)
  private userDependencyRepository = new UserDependencyRepository(this.dataStore)

  create(source: NewUser): Promise<AuthUser> {
    return this.getByEmail(source.email).then((existedUser) => {
      if (!!existedUser) throw new ResourceAlreadyExistsException(source.email)

      return this.userRepository.add({
        firstName: cleanStringField(source.firstName),
        lastName: cleanStringField(source.lastName),
        email: cleanStringField(source.email),
        photo: source.photo ?? null,
        phone: source.phone ?? null,
        registrationId: source.registrationId ?? null,
        authUserId: source.authUserId ?? null,
        active: source.active ?? false,
        organizationIds: [source.organizationId],
      } as AuthUser)
    })
  }

  update(id: string, source: UpdateUserRequest): Promise<AuthUser> {
    return this.getById(id).then((target) =>
      this.userRepository.update({
        ...target,
        firstName: cleanStringField(source.firstName ?? target.firstName),
        lastName: cleanStringField(source.lastName ?? target.lastName),
        photo: source.photo ?? target.photo ?? null,
      }),
    )
  }

  updateByAdmin(id: string, source: UpdateUserByAdminRequest): Promise<AuthUser> {
    return this.getById(id).then((target) =>
      this.userRepository.update({
        ...target,
        firstName: cleanStringField(source.firstName ?? target.firstName),
        lastName: cleanStringField(source.lastName ?? target.lastName),
        photo: source.photo ?? target.photo ?? null,
        registrationId: source.registrationId ?? target.registrationId ?? null,
        phone: source.phone ?? target.phone ?? null,
        memberId: source.memberId ?? target.memberId ?? null,
      }),
    )
  }

  getById(id: string): Promise<AuthUser> {
    return this.userRepository.get(id).then((target) => {
      if (target) return target
      throw new ResourceNotFoundException(`Cannot find user [${id}]`)
    })
  }

  searchByQueryAndOrganizationId(organizationId: string, query: string): Promise<AuthUser[]> {
    const searchArray = query.split(' ')
    const searchPromises = []
    const email = searchArray.find((string) => isEmail(string))

    const sa0lowercase = searchArray[0].toLowerCase()
    const sa0titlecase = titleCase(searchArray[0])
    const combinations = {
      names: ['firstName', 'lastName'],
      values: [
        sa0lowercase,
        `${sa0lowercase} `,
        ` ${sa0lowercase} `,
        sa0titlecase,
        `${sa0titlecase} `,
        ` ${sa0titlecase} `,
      ],
    }

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
          ...this.userRepository.searchQueryBuilder(organizationId, [], combinations),
        )
      }
    } else if (searchArray.length === 2) {
      if (email) {
        searchArray.splice(searchArray.indexOf(email), 1)

        searchPromises.push(
          ...this.userRepository.searchQueryBuilder(
            organizationId,
            [{name: 'email', value: email}],
            combinations,
          ),
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

  async findAllUsers({
    organizationId,
    from,
    limit,
    query,
  }: CursoredUsersRequestFilter): Promise<AuthUser[]> {
    // Pre-build organization-filtered query
    // That has to be a function to avoid mutating the same query object in the below for-loop
    const organizationContextualQuery = () =>
      this.userRepository.getQueryFindWhereArrayContains('organizationIds', organizationId)
    const fromSnapshot = from ? await this.userRepository.collection().docRef(from).get() : null
    // Handle no keyword filter
    if (!query) {
      const unfilteredQuery = fromSnapshot
        ? organizationContextualQuery().startAfter(fromSnapshot)
        : organizationContextualQuery()
      return unfilteredQuery.limit(limit).fetch()
    }

    // Build and fetch all query combinations
    const searchKeywords = query.split(' ')
    const filterableFields: (keyof Omit<AuthUser, 'id'>)[] = ['email', 'firstName', 'lastName']
    const combinationQueries = []
    for (const field of filterableFields) {
      for (const keyword of searchKeywords) {
        this.userRepository.collection()
        let combinationQuery = organizationContextualQuery().where(field, '==', keyword)
        if (fromSnapshot) combinationQuery = combinationQuery.startAfter(fromSnapshot)
        combinationQueries.push(combinationQuery.limit(limit).fetch())
      }
    }
    return Promise.all(combinationQueries).then((results) =>
      _.sortBy(_.flatten(results), 'id').slice(0, limit + 1),
    )
  }

  getAllByOrganizationId(
    organizationId: string,
    page: number,
    perPage: number,
  ): Promise<AuthUser[]> {
    const userIdsQuery = this.userRepository.getQueryFindWhereArrayContains(
      'organizationIds',
      organizationId,
    )
    return this.userRepository.fetchPage(userIdsQuery, page, perPage)
  }

  getByEmail(email: string): Promise<AuthUser> {
    return this.userRepository.findWhereEqual('email', email).then((results) => results[0])
  }

  getByPhoneNumber(phoneNumber: string): Promise<AuthUser> {
    return this.userRepository
      .findWhereEqual('phoneNumber', phoneNumber)
      .then((results) => results[0])
  }

  getAllByIds(userIds: string[]): Promise<AuthUser[]> {
    return Promise.all(
      _.chunk(userIds, 10).map((chunk) => this.userRepository.findWhereIdIn(chunk)),
    ).then((results) => _.flatten(results as AuthUser[][]))
  }

  activate(user: AuthUser): Promise<AuthUser> {
    return this.userRepository.update({...user, active: true})
  }

  getParents(userId: string): Promise<AuthUser[]> {
    return this.userDependencyRepository
      .collection()
      .where('userId', '==', userId)
      .fetch()
      .then((results) => this.getAllByIds(results.map(({parentUserId}) => parentUserId)))
  }

  connectOrganization(userId: string, organizationId: string): void {
    const userRepository = new UserModel(this.dataStore)
    userRepository
      .get(userId)
      .then((user) =>
        userRepository.updateProperty(
          userId,
          'organizationIds',
          Array.from(new Set([...(user.organizationIds ?? []), organizationId])),
        ),
      )
  }

  getAllGroupIdsForUser(userId: string): Promise<Set<string>> {
    return this.userGroupRepository
      .findWhereEqual('userId', userId)
      .then((results) => new Set(results?.map(({groupId}) => groupId)))
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

  private findUserGroupsBy(userId: string, groupIds?: string[]): Promise<UserGroup[]> {
    let query = this.userGroupRepository.collection().where('userId', '==', userId)
    if (groupIds?.length) {
      query = query.where('groupId', 'in', groupIds)
    }
    return query.fetch()
  }

}
