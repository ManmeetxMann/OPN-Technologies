import {TypeOrmModule} from '@nestjs/typeorm'
import * as PatientRepositories from '../repository/patient.repository'
import {OrganizationRepository} from '../repository/organization.repository'
import {LocationRepository} from '../repository/location.repository'
import {GroupRepository} from '../repository/group.repository'
import {DefaultDatabaseConfiguration} from '@opn-services/common/configuration/database.configuration'

export const DatabaseConfiguration = DefaultDatabaseConfiguration()

const repositories = [
  OrganizationRepository,
  LocationRepository,
  GroupRepository,
  ...Object.keys(PatientRepositories).map(key => PatientRepositories[key]),
]

export const RepositoryConfiguration = TypeOrmModule.forFeature(repositories)
