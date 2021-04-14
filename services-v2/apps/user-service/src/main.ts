// NestJs
import {NestFactory} from '@nestjs/core'
import {Module} from '@nestjs/common'

import {
  DatabaseConfiguration,
  RepositoryConfiguration,
} from './configuration/database.configuration'

import {AdminV1UserController} from './controller/admin/v1/user.controller'

import {UserService} from './service/user/user.service'
import {OrganizationService} from './service/organization/organization.service'
import {LocationService} from './service/organization/location.service'
import {GroupService} from './service/organization/group.service'

import {CommonModule, createSwagger} from '@opn/common'

@Module({
  imports: [CommonModule, DatabaseConfiguration, RepositoryConfiguration],
  controllers: [AdminV1UserController],
  providers: [OrganizationService, LocationService, GroupService, UserService],
})
class App {}

async function bootstrap() {
  const app = await NestFactory.create(App)

  createSwagger(app)

  await app.listen(process.env.PORT || 8080)
}
bootstrap()

export {App}
