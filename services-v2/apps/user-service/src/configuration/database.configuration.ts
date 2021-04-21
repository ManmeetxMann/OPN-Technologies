import {TypeOrmModule} from '@nestjs/typeorm'
import {
  UserGroupRepository,
  UserOrganizationRepository,
  UserRepository,
} from '../repository/user.repository'
import * as PatientRepositories from '../repository/patient.repository'
import {OrganizationRepository} from '../repository/organization.repository'
import {LocationRepository} from '../repository/location.repository'
import {GroupRepository} from '../repository/group.repository'
import {DefaultDatabaseConfiguration} from '@opn-services/common/configuration/database.configuration'

export const DatabaseConfiguration = DefaultDatabaseConfiguration('user')

const repositories = [
  UserRepository,
  UserOrganizationRepository,
  UserGroupRepository,

  OrganizationRepository,
  LocationRepository,
  GroupRepository,
  ...Object.keys(PatientRepositories).map(key => PatientRepositories[key]),
]

export const RepositoryConfiguration = TypeOrmModule.forFeature(repositories)
