// NestJs
import {NestFactory} from '@nestjs/core'
import {FastifyAdapter} from '@nestjs/platform-fastify'
import {MiddlewareConsumer, Module, ValidationPipe} from '@nestjs/common'

import {
  DatabaseConfiguration,
  RepositoryConfiguration,
} from './configuration/database.configuration'

import {AdminPatientController} from './controller/v1/admin/patient.controller'
import {PatientController} from './controller/v1/public/patient.controller'
import {RapidHomeKitCodeController} from './controller/v1/public/rapid-home-kit-code.controller'

import {OrganizationService} from './service/organization/organization.service'
import {LocationService} from './service/organization/location.service'
import {GroupService} from './service/organization/group.service'
import {PatientService} from './service/patient/patient.service'
import {RapidHomeKitCodeService} from './service/patient/rapid-home-kit-code.service'

import {AuthMiddleware, CommonModule, createSwagger} from '@opn-services/common'
import {RapidHomeController} from './controller/v1/public/rapid-home.controller'
import {corsOptions} from '@opn-services/common/configuration/cors.configuration'
import {getDefaultPort, isJestTest} from '@opn-services/common/utils'
@Module({
  imports: [CommonModule, DatabaseConfiguration, RepositoryConfiguration],
  controllers: [
    AdminPatientController,
    PatientController,
    RapidHomeController,
    RapidHomeKitCodeController,
  ],
  providers: [
    OrganizationService,
    LocationService,
    GroupService,
    PatientService,
    RapidHomeKitCodeService,
  ],
})
class App {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(AdminPatientController, PatientController, RapidHomeController)
  }
}

async function bootstrap() {
  const app = await NestFactory.create(App, new FastifyAdapter())
  app.enableCors(corsOptions)
  app.useGlobalPipes(new ValidationPipe())

  const defaultPort = getDefaultPort()
  await app.listen(process.env.PORT || defaultPort)
  createSwagger(app)
}
if (!isJestTest) {
  bootstrap()
}

export {App}
