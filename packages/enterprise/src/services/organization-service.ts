import DataStore from '../../../common/src/data/datastore'
import {Config} from '../../../common/src/utils/config'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'

import {
  Organization,
  OrganizationGroup,
  OrganizationLocation,
  OrganizationLocationType,
  OrganizationType,
  OrganizationUsersGroup,
} from '../models/organization'
import {
  OrganizationGroupModel,
  OrganizationKeySequenceModel,
  OrganizationLocationModel,
  OrganizationModel,
  OrganizationUsersGroupModel,
  AllLocationsModel,
} from '../repository/organization.repository'

import organizationDbSchema from '../dbschemas/organization.schema'

import * as _ from 'lodash'

const notFoundMessage = (organizationId: string, identifier?: string) =>
  `Cannot find organization with ${identifier ?? 'ID'} [${organizationId}]`

const HANDLE_LEGACY_LOCATIONS =
  Config.get('FEATURE_PARENT_LOCATION_ID_MAY_BE_MISSING') === 'enabled'

export class OrganizationService {
  private dataStore = new DataStore()
  private organizationRepository = new OrganizationModel(this.dataStore)
  private allLocationsRepo = new AllLocationsModel(this.dataStore)
  private organizationKeySequenceRepository = new OrganizationKeySequenceModel(this.dataStore)

  async create(organization: Organization): Promise<Organization> {
    const key = await this.generateKey()

    const organizationData = {
      ...organization,
      key,
      type: organization.type ?? OrganizationType.Default,
      allowDependants: organization.allowDependants ?? false,
      dailyReminder: {
        enabled: organization.dailyReminder?.enabled ?? false,
        enabledOnWeekends: organization.dailyReminder?.enabledOnWeekends ?? false,
        timeOfDayMillis: organization.dailyReminder?.timeOfDayMillis ?? 0,
      },
    }

    const validDbData = await organizationDbSchema.validateAsync(organizationData)

    return this.organizationRepository.add(validDbData)
  }

  async getOrganizations(): Promise<Organization[]> {
    return this.organizationRepository.fetchAll()
  }

  async addLocations(
    organizationId: string,
    locations: OrganizationLocation[],
    parentLocationId?: string | null,
  ): Promise<OrganizationLocation[]> {
    const parent = parentLocationId
      ? await this.getLocation(organizationId, parentLocationId)
      : null

    // TODO: Exception type
    if (parent && locations.some((location) => !location.allowAccess)) {
      throw new ResourceNotFoundException('locations with parents must be accessible')
    }
    if (parent && (parent.allowAccess || parent.parentLocationId)) {
      throw new ResourceNotFoundException(
        'parent locations must not be accessible and must not have parents',
      )
    }

    const locationsToAdd = parent
      ? locations.map((location) => ({
          address: parent.address,
          city: parent.city,
          zip: parent.zip,
          state: parent.state,
          country: parent.country,
          ...location,
          parentLocationId: parentLocationId,
          allowAccess: true,
        }))
      : locations.map((location) => ({
          ...location,
          parentLocationId: null,
        }))
    return this.getOrganization(organizationId).then(() =>
      new OrganizationLocationModel(this.dataStore, organizationId)
        .addAll(locationsToAdd)
        .then((locs) => {
          // add this so we can query for locations by id contained in list
          const locationsWithoutId = locs
            // no need to waste writes on locations that already have ids
            // @ts-ignore this isn't officially part of the location schema
            .filter((loc) => !loc.locationId)
            .map((loc) => ({
              ...loc,
              locationId: loc.id,
            }))
          return new OrganizationLocationModel(this.dataStore, organizationId).updateAll(
            locationsWithoutId,
          )
        }),
    )
  }

  getLocations(
    organizationId: string,
    parentLocationId?: string | null,
  ): Promise<OrganizationLocation[]> {
    return this.getOrganization(organizationId).then(() => {
      if (!parentLocationId && HANDLE_LEGACY_LOCATIONS) {
        return new OrganizationLocationModel(this.dataStore, organizationId)
          .fetchAll()
          .then((results) => {
            return results
              .filter((location) => !location.parentLocationId)
              .map((location) => {
                return {
                  ...location,
                  type: location.type ? location.type : OrganizationLocationType.Default,
                }
              })
          })
      }
      return new OrganizationLocationModel(this.dataStore, organizationId).findWhereEqual(
        'parentLocationId',
        parentLocationId || null,
      )
    })
  }

  // get with or without parent id
  getAllLocations(organizationId: string): Promise<OrganizationLocation[]> {
    return new OrganizationLocationModel(this.dataStore, organizationId).fetchAll()
  }

  getLocation(organizationId: string, locationId: string): Promise<OrganizationLocation> {
    return this.getOrganization(organizationId)
      .then(() => new OrganizationLocationModel(this.dataStore, organizationId).get(locationId))
      .then((location) => {
        if (location)
          return {
            ...location,
            type: location.type ? location.type : OrganizationLocationType.Default,
          }
        throw new ResourceNotFoundException(
          `Cannot find location for organization-id [${organizationId}] and location-id [${locationId}]`,
        )
      })
  }

  updateLocations(
    organizationId: string,
    locations: OrganizationLocation[],
  ): Promise<OrganizationLocation[]> {
    return new OrganizationLocationModel(this.dataStore, organizationId).updateAll(locations)
  }

  // includes organization id
  async getLocationById(locationId: string): ReturnType<AllLocationsModel['getLocation']> {
    const location = await this.allLocationsRepo.getLocation(locationId)
    if (!location) {
      throw new ResourceNotFoundException(`Cannot find location for location-id [${locationId}]`)
    }
    return {
      ...location,
    }
  }

  findOrganizationByKey(key: number): Promise<Organization> {
    return this.organizationRepository.findWhereEqual('key', key).then((results) => {
      if (results.length) return results[0]
      throw new ResourceNotFoundException(`Cannot find organization with key ${key}`)
    })
  }

  updateReporting(id: string, hourToSendReport: number, dayShift: number): Promise<Organization> {
    return this.organizationRepository.updateProperties(id, {hourToSendReport, dayShift})
  }

  getByIdOrThrow(id: string): Promise<Organization> {
    return this.organizationRepository.get(id).then((target) => {
      if (target) return target
      throw new ResourceNotFoundException(`Cannot find organization with ID ${id}`)
    })
  }

  findOneById(id: string): Promise<Organization> {
    return this.organizationRepository.get(id)
  }

  addGroup(organizationId: string, group: OrganizationGroup): Promise<OrganizationGroup> {
    return this.getGroupsRepositoryFor(organizationId).add(group)
  }

  updateGroup(
    organizationId: string,
    groupId: string,
    groupData: {name: string; isPrivate: boolean},
  ): Promise<OrganizationGroup> {
    return this.getGroupsRepositoryFor(organizationId).updateProperties(groupId, {
      name: groupData.name,
      isPrivate: groupData.isPrivate,
    })
  }

  addGroups(organizationId: string, groups: OrganizationGroup[]): Promise<OrganizationGroup[]> {
    return this.getOrganization(organizationId).then(() =>
      Promise.all(groups.map((group) => this.addGroup(organizationId, group))),
    )
  }

  getPublicGroups(organizationId: string): Promise<OrganizationGroup[]> {
    return this.getOrganization(organizationId).then(() =>
      this.getGroupsRepositoryFor(organizationId).findWhereEqual('isPrivate', false),
    )
  }

  getGroups(organizationId: string): Promise<OrganizationGroup[]> {
    return this.getOrganization(organizationId).then(() =>
      this.getGroupsRepositoryFor(organizationId).fetchAll(),
    )
  }

  getGroup(organizationId: string, groupId: string): Promise<OrganizationGroup> {
    return this.getOrganization(organizationId).then(() =>
      this.getGroupsRepositoryFor(organizationId)
        .get(groupId)
        .then((target) => {
          if (target) return target
          throw new ResourceNotFoundException(
            `Cannot find organization-group [${groupId}] in organization [${organizationId}]`,
          )
        }),
    )
  }

  async getUserGroup(organizationId: string, userId: string): Promise<OrganizationGroup> {
    const groupsForUser = await this.getUsersGroups(organizationId, null, [userId])

    if (groupsForUser.length === 0) {
      throw new ResourceNotFoundException(
        `Cannot find organization-group for [${userId}] in organization [${organizationId}]`,
      )
    }

    return await this.getGroup(organizationId, groupsForUser[0].groupId)
  }

  async getUsersByGroup(
    organizationId: string,
    groupId: string,
    limit: number,
    from: string,
  ): Promise<{
    data: OrganizationUsersGroup[]
    last: string | null
    next: string | null
  }> {
    const userRepository = this.getOrganizationUsersGroupRepositoryFor(organizationId)

    const userGroupRepository = this.getUsersGroupRepositoryFor(organizationId)
    const userGroupQuery = userGroupRepository.getQueryFindWhereEqual('groupId', groupId)
    const fromSnapshot = from ? await userRepository.collection().docRef(from).get() : null

    return userGroupRepository.fetchByCursor(userGroupQuery, fromSnapshot, limit)
  }

  async getUsersGroups(
    organizationId: string,
    groupId?: string,
    allUserIds?: string[],
  ): Promise<OrganizationUsersGroup[]> {
    // Firestore doesn't give enough "where" operators to have optional query filters
    // To have a query-builder, we need here to re-assign the query declaration (of type Collection) with a WhereClause Query
    // Therefor the TS transpiler complains because of the types conflicts...
    const userIdPages = allUserIds ? _.chunk(allUserIds, 10) : [undefined]
    const pagedResults = await Promise.all(
      userIdPages.map((userIds: string[]) => {
        // @ts-ignore
        let query = this.getUsersGroupRepositoryFor(organizationId).collection()
        if (!!groupId) {
          // @ts-ignore
          query = query.where('groupId', '==', groupId)
        }
        if (userIds?.length) {
          // @ts-ignore
          query = query.where('userId', 'in', userIds)
        }
        // @ts-ignore
        // Cannot fetchAll on a `Query` object, only on `Collection`
        return groupId || userIds?.length > 0 ? query.fetch() : query.fetchAll()
      }),
    )
    return _.flatten(pagedResults)
  }

  async getUserGroupId(organizationId: string, userId: string): Promise<string> {
    const memberships = await this.getUsersGroups(organizationId, null, [userId])
    if (memberships?.length) {
      return memberships[0].groupId
    }
    return null
  }

  async getDependantGroups(
    organizationId: string,
    parentId: string,
    groupId?: string,
  ): Promise<OrganizationUsersGroup[]> {
    let query = this.getUsersGroupRepositoryFor(organizationId)
      .collection()
      .where('parentUserId', '==', parentId)
    if (!!groupId) {
      query = query.where('groupId', '==', groupId)
    }
    return query.fetch()
  }

  addUserToGroup(
    organizationId: string,
    groupId: string,
    userId: string,
    parentUserId: string = null,
  ): Promise<void> {
    return this.getGroup(organizationId, groupId).then(async () => {
      const existingEntry = await this.getOneUsersGroup(organizationId, groupId, userId)
      if (!existingEntry) {
        await this.getUsersGroupRepositoryFor(organizationId).add({userId, groupId, parentUserId})
      }
    })
  }

  async updateGroupForUser(
    organizationId: string,
    groupId: string,
    userId: string,
    newGroupId: string,
  ): Promise<OrganizationUsersGroup> {
    const allGroups = await this.getUsersGroups(organizationId, null, [userId])
    if (!allGroups.length) {
      throw new ResourceNotFoundException(
        `Cannot find any user-group in organization [${organizationId}] for userId [${userId}]`,
      )
    }
    if (allGroups.length > 0) {
      console.warn(
        `INVALID DATA DETECTED: found ${
          allGroups.length
        } user-groups in organization [${organizationId}] for userId [${userId}]: ${allGroups
          .map((membership) => membership.id)
          .join(', ')}`,
      )
    }
    const target =
      allGroups.length === 1
        ? allGroups[0]
        : allGroups.find((membership) => membership.groupId === groupId)
    if (target) {
      // check if data looks invalid
      if (target.groupId !== groupId) {
        // we still have a target, so we can make the change to a valid state, but should warn
        console.warn(
          `INVALID DATA DETECTED: updating user-group ${target.id} in organization ${organizationId} for userId ${userId} with groupId ${target.groupId} instead of ${groupId}`,
        )
      }

      const result = await this.getUsersGroupRepositoryFor(organizationId).updateProperty(
        target.id,
        'groupId',
        newGroupId,
      )

      return result
    }
    throw new ResourceNotFoundException(
      `userId [${userId}] has ${allGroups.length} user-groups in organization [${organizationId}], none with groupId ${groupId}`,
    )
  }

  async removeUserFromGroup(
    organizationId: string,
    groupId: string,
    userId: string,
  ): Promise<void> {
    const membership = await this.getOneUsersGroup(organizationId, groupId, userId)
    if (!membership) {
      throw new ResourceNotFoundException(
        `Cannot find relation user-group for groupId [${groupId}] and userId [${userId}] in org [${organizationId}]`,
      )
    }
    await this.getUsersGroupRepositoryFor(organizationId).delete(membership.id)
  }

  async removeUserFromAllGroups(organizationId: string, userId: string): Promise<void> {
    const allGroups = await this.getUsersGroups(organizationId, null, [userId])
    if (!allGroups.length) {
      console.warn(`Cannot find any user-group to delete for userId [${userId}]`)
      return
    }
    await Promise.all(
      allGroups.map((target) => this.getUsersGroupRepositoryFor(organizationId).delete(target.id)),
    )
  }

  async deleteGroup(organizationId: string, groupId: string): Promise<void> {
    const repo = this.getGroupsRepositoryFor(organizationId)
    const target = await repo.findOneById(groupId)
    if (target) {
      await repo.delete(groupId)
    } else {
      throw new ResourceNotFoundException(
        `Cannot find group [${groupId}] for organization [${organizationId}]`,
      )
    }
  }

  getAllByIds(organizationIds: string[]): Promise<Organization[]> {
    return Promise.all(
      _.chunk(organizationIds, 10).map((chunk) => this.organizationRepository.findWhereIdIn(chunk)),
    ).then((results) => _.flatten(results as Organization[][]))
  }

  // TODO: To be replaced with a proper solution that generates a 5 digits code for by user and organization with an expiry
  private generateKey(): Promise<number> {
    const sequenceId = 'default'
    const repository = this.organizationKeySequenceRepository
    return repository
      .get(sequenceId)
      .then((sequence) =>
        !!sequence
          ? repository.increment(sequenceId, 'value', 1)
          : repository.add({id: sequenceId, value: 10000}),
      )
      .then((sequence) => sequence.value)
  }

  private getOrganization(organizationId: string): Promise<Organization> {
    return this.organizationRepository.get(organizationId).then((organization) => {
      if (organization) {
        return organization
      }

      throw new ResourceNotFoundException(notFoundMessage(organizationId))
    })
  }

  private getGroupsRepositoryFor(organizationId: string) {
    return new OrganizationGroupModel(this.dataStore, organizationId)
  }

  private getUsersGroupRepositoryFor(organizationId: string) {
    return new OrganizationUsersGroupModel(this.dataStore, organizationId)
  }

  private getOrganizationUsersGroupRepositoryFor(organizationId: string) {
    return new OrganizationUsersGroupModel(this.dataStore, organizationId)
  }

  private getOneUsersGroup(
    organizationId: string,
    groupId?: string,
    userId?: string,
  ): Promise<OrganizationUsersGroup | undefined> {
    return this.getUsersGroups(organizationId, groupId, userId ? [userId] : undefined).then(
      (results) => {
        if (results.length > 1) {
          console.warn(`multiple groups found for ${organizationId}, ${groupId}, ${userId}`)
        }
        return results.length > 0 ? results[0] : undefined
      },
    )
  }

  async isTemperatureCheckEnabled(organizationId: string): Promise<boolean> {
    return (await this.findOneById(organizationId)).enableTemperatureCheck
  }
}
