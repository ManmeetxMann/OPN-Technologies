// NestJs
import {NestFactory} from '@nestjs/core'
import {MiddlewareConsumer, Module, ValidationPipe} from '@nestjs/common'

import {
  DatabaseConfiguration,
  RepositoryConfiguration,
} from './configuration/database.configuration'

import {AdminV1UserController} from './controller/admin/v1/user.controller'
import {PatientController} from './controller/public/v1/patient.controller'

import {UserService} from './service/user/user.service'
import {OrganizationService} from './service/organization/organization.service'
import {LocationService} from './service/organization/location.service'
import {GroupService} from './service/organization/group.service'
import {PatientService} from './service/patient/patient.service'

import {AuthMiddleware, CommonModule, createSwagger} from '@opn-services/common'

@Module({
  imports: [CommonModule, DatabaseConfiguration, RepositoryConfiguration],
  controllers: [AdminV1UserController, PatientController],
  providers: [OrganizationService, LocationService, GroupService, UserService, PatientService],
})
class App {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthMiddleware).forRoutes(PatientController)
  }
}

async function bootstrap() {
  const app = await NestFactory.create(App)

  app.useGlobalPipes(new ValidationPipe())

  createSwagger(app)

  await app.listen(process.env.PORT || 8080)
}
bootstrap()

export {App}
