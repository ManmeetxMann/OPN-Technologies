import DataStore from '../../../common/src/data/datastore'
import {Config} from '../../../common/src/utils/config'
import {
  Organization,
  OrganizationGroup,
  OrganizationLocation,
  OrganizationType,
  OrganizationUsersGroup,
  RegistrationQuestion,
} from '../models/organization'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {
  OrganizationGroupModel,
  OrganizationKeySequenceModel,
  OrganizationLocationModel,
  OrganizationModel,
  OrganizationUsersGroupModel,
} from '../repository/organization.repository'

const notFoundMessage = (organizationId: string, identifier?: string) =>
  `Cannot find organization with ${identifier ?? 'ID'} [${organizationId}]`

// autofill default fields for registration question
const parsePartialQuestion = (question: RegistrationQuestion): RegistrationQuestion => ({
  ...question,
  questionType: question.questionType || 'text',
  placeholder: question.placeholder || '',
  options: question.options || [],
})

const HANDLE_LEGACY_LOCATIONS =
  Config.get('FEATURE_PARENT_LOCATION_ID_MAY_BE_MISSING') === 'enabled'

export class OrganizationService {
  private dataStore = new DataStore()
  private organizationRepository = new OrganizationModel(this.dataStore)
  private organizationKeySequenceRepository = new OrganizationKeySequenceModel(this.dataStore)

  create(organization: Organization): Promise<Organization> {
    return this.generateKey().then((key) =>
      this.organizationRepository.add({
        ...organization,
        key,
        type: organization.type ?? OrganizationType.Default,
        allowDependants: organization.allowDependants ?? false,
        registrationQuestions: (organization.registrationQuestions ?? []).map(parsePartialQuestion),
      }),
    )
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
          questionnaireId: parent.questionnaireId,
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
          const locationsWithId = locs.map((loc) => ({
            ...loc,
            locationId: loc.id,
          }))
          return new OrganizationLocationModel(this.dataStore, organizationId).updateAll(
            locationsWithId,
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
          .then((results) => results.filter((location) => !location.parentLocationId))
      }
      return new OrganizationLocationModel(this.dataStore, organizationId).findWhereEqual(
        'parentLocationId',
        parentLocationId || null,
      )
    })
  }

  getLocation(organizationId: string, locationId: string): Promise<OrganizationLocation> {
    return this.getOrganization(organizationId)
      .then(() => new OrganizationLocationModel(this.dataStore, organizationId).get(locationId))
      .then((location) => {
        if (location) return location
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
  async getLocationById(locationId: string): ReturnType<OrganizationModel['getLocation']> {
    const location = await this.organizationRepository.getLocation(locationId)
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

  findOneById(id: string): Promise<Organization> {
    return this.organizationRepository.get(id)
  }

  addGroup(organizationId: string, group: OrganizationGroup): Promise<OrganizationGroup> {
    return this.getGroupsRepositoryFor(organizationId).add(group)
  }

  addGroups(organizationId: string, groups: OrganizationGroup[]): Promise<OrganizationGroup[]> {
    return this.getOrganization(organizationId).then(() =>
      Promise.all(groups.map((group) => this.addGroup(organizationId, group))),
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
          throw new ResourceNotFoundException(`Cannot find organization-group with id [${groupId}]`)
        }),
    )
  }

  getUsersGroups(
    organizationId: string,
    groupId?: string,
    userIds?: string[],
  ): Promise<OrganizationUsersGroup[]> {
    // Firestore doesn't give enough "where" operators to have optional query filters
    // To have a query-builder, we need here to re-assign the query declaration (of type Collection) with a WhereClause Query
    // Therefor the TS transpiler complains because of the types conflicts...

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

  updateGroupForUser(
    organizationId: string,
    groupId: string,
    userId: string,
    newGroupId: string,
  ): Promise<OrganizationUsersGroup> {
    return this.getOneUsersGroup(organizationId, groupId, userId).then((target) => {
      if (target)
        return this.getUsersGroupRepositoryFor(organizationId).updateProperty(
          target.id,
          'groupId',
          newGroupId,
        )

      throw new ResourceNotFoundException(
        `Cannot find relation user-group for groupId [${groupId}] and userId [${userId}]`,
      )
    })
  }

  removeUserFromGroup(organizationId: string, groupId: string, userId: string): Promise<void> {
    return this.getOneUsersGroup(organizationId, groupId, userId).then((target) => {
      if (target) return this.getUsersGroupRepositoryFor(organizationId).delete(target.id)

      throw new ResourceNotFoundException(
        `Cannot find relation user-group for groupId [${groupId}] and userId [${userId}]`,
      )
    })
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

  private getOneUsersGroup(
    organizationId: string,
    groupId?: string,
    userId?: string,
  ): Promise<OrganizationUsersGroup | undefined> {
    return this.getUsersGroups(
      organizationId,
      groupId,
      userId ? [userId] : undefined,
    ).then((results) => (results.length > 0 ? results[0] : undefined))
  }
}
