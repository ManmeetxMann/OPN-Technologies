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

import {OrganizationService} from './service/organization/organization.service'
import {LocationService} from './service/organization/location.service'
import {GroupService} from './service/organization/group.service'
import {PatientService} from './service/patient/patient.service'

import {AuthMiddleware, CommonModule, createSwagger} from '@opn-services/common'
import {corsOptions} from '@opn-services/common/configuration/cors.configuration'

@Module({
  imports: [CommonModule, DatabaseConfiguration, RepositoryConfiguration],
  controllers: [AdminPatientController, PatientController],
  providers: [OrganizationService, LocationService, GroupService, PatientService],
})
class App {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthMiddleware).forRoutes(AdminPatientController, PatientController)
  }
}

async function bootstrap() {
  const app = await NestFactory.create(App, new FastifyAdapter())
  app.enableCors(corsOptions)
  app.useGlobalPipes(new ValidationPipe())

  await app.listen(process.env.PORT || 8080)
  createSwagger(app)
}
bootstrap()

export {App}
