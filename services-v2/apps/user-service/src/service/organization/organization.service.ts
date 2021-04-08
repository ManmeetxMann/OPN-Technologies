import {Injectable} from '@nestjs/common'
import {OrganizationRepository} from '../../repository/organization.repository'
import {Organization} from '../../model/organization/organization.entity'
import {Page, PageableRequestFilter} from '@opn/common/dto'
import {ResourceNotFoundException} from '@opn/common/exception'

@Injectable()
export class OrganizationService {
  constructor(private organizationRepository: OrganizationRepository) {}

  /**
   * Create an organization
   * @param organization
   */
  create(organization: Organization): Promise<Organization> {
    return this.organizationRepository.save(organization)
  }

  /**
   * Update an organization
   * @param id the targeted organization ID
   * @param organization
   */
  update(id: string, organization: Organization): Promise<Organization> {
    return this.getOne(id).then(() => this.organizationRepository.save(organization))
  }

  /**
   * Find all organizations with pagination
   * @param filter the pagination-filter
   */
  findAll({page, perPage}: PageableRequestFilter): Promise<Page<Organization>> {
    return this.organizationRepository
      .findAndCount({skip: page * perPage, take: perPage})
      .then(([data, totalItems]) => Page.of(data, page, perPage, totalItems))
  }

  /**
   * Find one organization by ID
   * @param id
   */
  findOne(id: string): Promise<Organization> {
    return this.organizationRepository.findOne(id)
  }

  /**
   * Find one organization by ID and throw an error when not found
   * @param id
   * @throws ResourceNotFoundException
   */
  getOne(id: string): Promise<Organization> {
    return this.findOne(id).then((target) => {
      if (target) return target

      throw new ResourceNotFoundException(`Cannot find organization with id ${id}`)
    })
  }
}
