import {EntityRepository, Repository} from 'typeorm'
import {OrganizationGroup} from '../model/organization/group.entity'

@EntityRepository(OrganizationGroup)
export class GroupRepository extends Repository<OrganizationGroup>{

}
