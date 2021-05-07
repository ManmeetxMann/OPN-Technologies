// NestJs
import {NestFactory} from '@nestjs/core'
import {FastifyAdapter} from '@nestjs/platform-fastify'
import {MiddlewareConsumer, Module} from '@nestjs/common'

// Should be called before any v1 module import from v2
import {Config} from '@opn-common-v1/utils/config'
Config.useRootEnvFile()

// Common
import {AuthMiddleware, CommonModule, createSwagger} from '@opn-services/common'
import {AllExceptionsFilter} from '@opn-services/common/exception'
import {OpnValidationPipe} from '@opn-services/common/pipes'

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

import {RapidHomeController} from './controller/v1/public/rapid-home.controller'
import {corsOptions} from '@opn-services/common/configuration/cors.configuration'

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
  app.useGlobalPipes(
    new OpnValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    }),
  )
  app.useGlobalFilters(new AllExceptionsFilter())

  // Each worker process is assigned a unique id (index-based that starts with 1)
  const nodeEnv = process.env.NODE_ENV
  const jestWorkerId = process.env.JEST_WORKER_ID
  if (nodeEnv === 'test') {
    await app.listen(8080 + parseInt(jestWorkerId))
    return
  }

  await app.listen(process.env.PORT || 8080)
  createSwagger(app)
}
bootstrap()

export {App}
