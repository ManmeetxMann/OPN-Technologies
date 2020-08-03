import DataStore from '../../../common/src/data/datastore'
import {Organization, OrganizationLocation, OrganizationType} from '../models/organization'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {
  OrganizationKeySequenceModel,
  OrganizationLocationModel,
  OrganizationModel,
} from '../repository/organization.repository'

const notFoundMessage = (organizationId: string, identifier?: string) =>
  `Cannot find organization with ${identifier ?? 'ID'} [${organizationId}]`

export class OrganizationService {
  private dataStore = new DataStore()
  private organizationRepository = new OrganizationModel(this.dataStore)
  private organizationKeySequenceRepository = new OrganizationKeySequenceModel(this.dataStore)

  create(organization: Organization): Promise<Organization> {
    return this.generateNewKey().then((key) =>
      this.organizationRepository.add({
        ...organization,
        key,
        type: organization.type ?? OrganizationType.Default,
        allowDependants: organization.allowDependants ?? false,
      }),
    )
  }

  addLocations(
    organizationId: string,
    locations: OrganizationLocation[],
  ): Promise<OrganizationLocation[]> {
    return this.getOrganization(organizationId).then(() =>
      new OrganizationLocationModel(this.dataStore, organizationId).addAll(locations),
    )
  }

  getLocations(organizationId: string): Promise<OrganizationLocation[]> {
    return this.organizationRepository.get(organizationId).then((organization) => {
      if (!organization) {
        throw new ResourceNotFoundException(notFoundMessage(organizationId))
      }
      return new OrganizationLocationModel(this.dataStore, organizationId).fetchAll()
    })
  }

  findOneByKey(key: number): Promise<Organization> {
    return this.organizationRepository.findWhereEqual('key', key).then((results) => {
      if (results?.length === 0) {
        throw new ResourceNotFoundException(notFoundMessage(String(key), 'Key'))
      }
      return results[0]
    })
  }
  findOneById(id: string): Promise<Organization> {
    return this.organizationRepository.get(id)
  }

  // TODO: To be replaced with a proper solution that generates a 5 digits code for by user and organization with an expiry
  private generateNewKey(): Promise<number> {
    const sequenceId = 'default'
    return this.organizationKeySequenceRepository
      .get(sequenceId)
      .then((sequence) =>
        !!sequence
          ? this.organizationKeySequenceRepository.increment(sequenceId, 'value', 1)
          : this.organizationKeySequenceRepository.add({id: sequenceId, value: 10000}),
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
}
