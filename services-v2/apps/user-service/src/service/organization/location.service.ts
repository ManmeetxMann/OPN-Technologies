import {Injectable} from '@nestjs/common'
import {LocationRepository} from '../../repository/location.repository'
import {OrganizationLocation} from '../../model/organization/location.entity'
import {Page} from '@opn/common/dto'
import {ResourceNotFoundException} from '@opn/common/exception'
import {LocationFilter} from '../../dto/location'
import {isNotNull, likeIgnoreCase, QueryMatcher} from '@opn/common/model'

@Injectable()
export class LocationService {
  constructor(private locationRepository: LocationRepository) {}

  /**
   * Find all locations for an organization with pagination
   * @param filter
   */
  findAll(filter: LocationFilter): Promise<Page<OrganizationLocation>> {
    const {query, organizationId, page, perPage} = filter
    const queryMatcher: QueryMatcher<OrganizationLocation> = {
      title: likeIgnoreCase(query),
      streetAddress: likeIgnoreCase(query),
      organizationId: organizationId ?? isNotNull(),
    }
    return this.locationRepository
      .findAndCount({
        where: queryMatcher,
        skip: page * perPage,
        take: perPage,
      })
      .then(([data, totalItems]) => Page.of(data, page, perPage, totalItems))
  }

  /**
   * Add locations
   * @param locations
   */
  add(locations: OrganizationLocation[]): Promise<OrganizationLocation[]> {
    return this.locationRepository.save(locations)
  }

  /**
   * Find one location
   * @param locationId
   */
  findOne(locationId: string): Promise<OrganizationLocation> {
    return this.locationRepository.findOne(locationId)
  }

  /**
   * Find one location and throw Error if not found
   * @param locationId
   * @throws ResourceNotFoundException
   */
  getOne(locationId: string): Promise<OrganizationLocation> {
    return this.findOne(locationId).then(target => {
      if (target) return target

      throw new ResourceNotFoundException(`Cannot find location [${locationId}]`)
    })
  }
}
