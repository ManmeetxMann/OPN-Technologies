// NestJs
import {APP_GUARD, NestFactory} from '@nestjs/core'
import {FastifyAdapter} from '@nestjs/platform-fastify'
import {MiddlewareConsumer, Module, RequestMethod} from '@nestjs/common'

// Should be called before any v1 module import from v2
import {getDefaultPort, isJestTest} from '@opn-services/common/utils'
import {Config} from '@opn-common-v1/utils/config'
if (!isJestTest) {
  Config.useRootEnvFile()
}

// Common
import {CorsMiddleware, CommonModule, createSwagger, AuthGlobalGuard} from '@opn-services/common'
import {AllExceptionsFilter} from '@opn-services/common/exception'
import {OpnValidationPipe} from '@opn-services/common/pipes'
import {AuthShortCodeService} from '@opn-enterprise-v1/services/auth-short-code-service'

import {
  DatabaseConfiguration,
  RepositoryConfiguration,
} from './configuration/database.configuration'

import {AdminPatientController} from './controller/v1/admin/patient.controller'
import {PatientController} from './controller/v1/public/patient.controller'
import {PatientPubSubController} from './controller/v1/internal/patient-pubsub.controller'
import {RapidHomeKitCodeController} from './controller/v1/public/rapid-home-kit-code.controller'
import {TestResultController} from './controller/v1/public/test-result.controller'

import {OrganizationService} from './service/organization/organization.service'
import {LocationService} from './service/organization/location.service'
import {GroupService} from './service/organization/group.service'
import {PatientService} from './service/patient/patient.service'
import {RapidHomeKitCodeService} from './service/patient/rapid-home-kit-code.service'
import {TestResultService} from './service/patient/test-result.service'

import {RapidHomeController} from './controller/v1/public/rapid-home.controller'

@Module({
  imports: [CommonModule, AuthShortCodeService, DatabaseConfiguration, RepositoryConfiguration],
  controllers: [
    AdminPatientController,
    PatientController,
    PatientPubSubController,
    RapidHomeController,
    RapidHomeKitCodeController,
    TestResultController,
  ],
  providers: [
    OrganizationService,
    LocationService,
    GroupService,
    PatientService,
    RapidHomeKitCodeService,
    TestResultService,
    AuthShortCodeService,
    {
      provide: APP_GUARD,
      useClass: AuthGlobalGuard,
    },
  ],
})
class App {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorsMiddleware).forRoutes({
      path: '(.*)',
      method: RequestMethod.ALL,
    })
  }
}

async function bootstrap() {
  const app = await NestFactory.create(App, new FastifyAdapter())

  app.useGlobalPipes(
    new OpnValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    }),
  )
  app.setGlobalPrefix('user')
  app.useGlobalFilters(new AllExceptionsFilter())

  const defaultPort = getDefaultPort()
  await app.listen(process.env.PORT || defaultPort)
  createSwagger(app)
}
if (!isJestTest) {
  bootstrap()
}

export {App}
