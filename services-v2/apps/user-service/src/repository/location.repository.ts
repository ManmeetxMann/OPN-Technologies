import {EntityRepository, Repository} from 'typeorm'
import {OrganizationLocation} from '../model/organization/location.entity'

@EntityRepository(OrganizationLocation)
export class LocationRepository extends Repository<OrganizationLocation> {}
