import {TypeOrmModule} from '@nestjs/typeorm'
import {
  UserGroupRepository,
  UserOrganizationRepository,
  UserRepository,
} from '../repository/user.repository'
import {OrganizationRepository} from '../repository/organization.repository'
import {LocationRepository} from '../repository/location.repository'
import {GroupRepository} from '../repository/group.repository'
import {DefaultDatabaseConfiguration} from '@opn/common/configuration/database.configuration'

export const DatabaseConfiguration = DefaultDatabaseConfiguration('user')

export const RepositoryConfiguration = TypeOrmModule.forFeature([
  UserRepository,
  UserOrganizationRepository,
  UserGroupRepository,

  OrganizationRepository,
  LocationRepository,
  GroupRepository,
])
