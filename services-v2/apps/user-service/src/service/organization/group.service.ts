import {Injectable} from '@nestjs/common'
import {Organization} from '../../model/organization/organization.entity'
import {Page} from '@opn/common/dto'
import {ResourceNotFoundException} from '@opn/common/exception'
import {GroupRepository} from '../../repository/group.repository'
import {OrganizationGroup} from '../../model/organization/group.entity'
import {GroupCreateRequest, GroupFilter, GroupUpdateRequest} from '../../dto/group'
import {isNotNull, likeIgnoreCase, QueryMatcher} from '@opn/common/model'

@Injectable()
export class GroupService {
  constructor(private groupRepository: GroupRepository) {}

  /**
   * Create a group
   * @param group
   * @param organization
   */
  create(
    group: Omit<GroupCreateRequest, 'organizationId'>,
    organization: Organization,
  ): Promise<OrganizationGroup> {
    return this.groupRepository.save({...group, organization})
  }

  /**
   * Update a group
   * @param id the targeted group ID
   * @param group
   */
  update(id: string, group: GroupUpdateRequest): Promise<OrganizationGroup> {
    return this.getOne(id).then(target => this.groupRepository.save({...target, group}))
  }

  /**
   * Find all groups with pagination
   * @param filter the group pagination-filter
   */
  findAll({query, organizationId, page, perPage}: GroupFilter): Promise<Page<OrganizationGroup>> {
    const queryMatcher: QueryMatcher<OrganizationGroup> = {
      name: likeIgnoreCase(query),
      'group.organizationId': organizationId ?? isNotNull(),
    }
    return this.groupRepository
      .findAndCount({
        where: queryMatcher,
        skip: page * perPage,
        take: perPage,
      })
      .then(([data, totalItems]) => Page.of(data, page, perPage, totalItems))
  }

  /**
   * Find one group by ID
   * @param id
   */
  findOne(id: string): Promise<OrganizationGroup> {
    return this.groupRepository.findOne(id)
  }

  /**
   * Find one group by ID and throw an error when not found
   * @param id
   * @throws ResourceNotFoundException
   */
  getOne(id: string): Promise<OrganizationGroup> {
    return this.findOne(id).then(target => {
      if (target) return target

      throw new ResourceNotFoundException(`Cannot find group with id ${id}`)
    })
  }
}
