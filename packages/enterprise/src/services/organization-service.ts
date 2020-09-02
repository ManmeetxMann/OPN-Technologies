import DataStore from '../../../common/src/data/datastore'
import {
  Organization,
  RegistrationQuestion,
  OrganizationGroup,
  OrganizationLocation,
  OrganizationType,
  OrganizationUsersGroup,
} from '../models/organization'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {
  OrganizationGroupModel,
  OrganizationKeySequenceModel,
  OrganizationLocationModel,
  OrganizationModel,
  OrganizationUsersGroupModel,
} from '../repository/organization.repository'
import {QuerySnapshot} from '@google-cloud/firestore'

const notFoundMessage = (organizationId: string, identifier?: string) =>
  `Cannot find organization with ${identifier ?? 'ID'} [${organizationId}]`

// autofill default fields for registration question
const parsePartialQuestion = (question: RegistrationQuestion): RegistrationQuestion => ({
  ...question,
  questionType: question.questionType || 'text',
  placeholder: question.placeholder || '',
  options: question.options || [],
})

export class OrganizationService {
  private dataStore = new DataStore()
  private organizationRepository = new OrganizationModel(this.dataStore)
  private organizationKeySequenceRepository = new OrganizationKeySequenceModel(this.dataStore)

  create(organization: Organization): Promise<Organization> {
    return this.generateKey()
      .then((key) =>
        this.organizationRepository.add({
          ...organization,
          key,
          type: organization.type ?? OrganizationType.Default,
          allowDependants: organization.allowDependants ?? false,
          registrationQuestions: (organization.registrationQuestions ?? []).map(
            parsePartialQuestion,
          ),
        }),
      )
      .then((organization) => {
        const groupRepo = this.getGroupsRepositoryFor(organization.id)
        return groupRepo.count().then(async (results) => {
          if (!results) {
            const group = await this.addGroup(organization.id, {
              name: 'All',
              isDefault: true,
            } as OrganizationGroup)
            return {
              ...organization,
              organization_groups: [group],
            }
          } else {
            return organization
          }
        })
      })
  }

  addLocations(
    organizationId: string,
    locations: OrganizationLocation[],
  ): Promise<OrganizationLocation[]> {
    return this.getOrganization(organizationId).then(() =>
      new OrganizationLocationModel(this.dataStore, organizationId)
        .addAll(locations)
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

  getLocations(organizationId: string): Promise<OrganizationLocation[]> {
    return this.getOrganization(organizationId).then(() =>
      new OrganizationLocationModel(this.dataStore, organizationId).fetchAll(),
    )
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

  findOrganizationAndGroupByKey(
    key: number,
  ): Promise<{organization: Organization; group: OrganizationGroup}> {
    // TODO: to be refactored with `CollectionGroupModel` abstraction coming in PR #191
    // Here we use collection-groups to fetch all the groups (cross-organizations) matching the key
    // Then we retrieve the organization using the group parent path
    const fieldPath = new this.dataStore.firestoreAdmin.firestore.FieldPath('key')
    return this.dataStore.firestoreORM
      .collectionGroup({collectionId: OrganizationGroupModel.collectionId})
      .where(fieldPath, '==', key)
      .query.get()
      .then(async (snapshot: QuerySnapshot) => {
        if (snapshot.docs.length === 0)
          throw new ResourceNotFoundException(`Cannot find organization & group with key ${key}`)

        const doc = snapshot.docs[0]
        const organizationId = doc.ref.path.split('/')[1]
        const organization = await this.organizationRepository.get(organizationId)

        if (!organization) throw new Error(`Cannot find organization with id [${organizationId}]`)

        // For some reason Firestore decides to not give back the document.id when using CollectionGroup,
        // So we need here to re-fetch the `OrganizationGroup` document matching the key
        const group = await this.getGroupsRepositoryFor(organizationId)
          .findWhereEqual('key', key)
          .then((results) => results[0])

        if (!group)
          throw new Error(`Cannot find group with key [${key}] in organization [${organizationId}]`)

        return {organization, group}
      })
  }

  findOneById(id: string): Promise<Organization> {
    return this.organizationRepository.get(id)
  }

  addGroup(organizationId: string, group: OrganizationGroup): Promise<OrganizationGroup> {
    return this.generateKey()
      .then((key) => ({
        ...group,
        key,
        isDefault: group.isDefault ?? false,
      }))
      .then((remappedGroup) => this.getGroupsRepositoryFor(organizationId).add(remappedGroup))
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
    userId?: string,
  ): Promise<OrganizationUsersGroup[]> {
    // Firestore doesn't give enough "where" operators to have optional query filters
    // To have a query-builder, we need here to re-assign the query declaration (of type Collection) with a WhereClause Query
    // Therefor the TS transpiler complains because of the types conflicts...

    // @ts-ignore
    return this.getOrganization(organizationId).then(() => {
      let query = this.getUsersGroupRepositoryFor(organizationId).collection()

      if (groupId) {
        // @ts-ignore
        query = query.where('groupId', '==', groupId)
      }

      if (userId) {
        // @ts-ignore
        query = query.where('userId', '==', userId)
      }

      // @ts-ignore
      return query.fetch()
    })
  }

  addUsersToGroup(organizationId: string, groupId: string, userIds: string[]): Promise<void> {
    return this.getGroup(organizationId, groupId).then(async () => {
      for (const userId of userIds) {
        const existingEntry = await this.getOneUsersGroup(organizationId, groupId, userId)
        if (!existingEntry) {
          await this.getUsersGroupRepositoryFor(organizationId).add({userId, groupId})
        }
      }
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
    return this.getUsersGroups(organizationId, groupId, userId).then((results) =>
      results.length > 0 ? results[0] : undefined,
    )
  }
}
