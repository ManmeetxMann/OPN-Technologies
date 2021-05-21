// NestJs
import {NestFactory} from '@nestjs/core'
import {MiddlewareConsumer, Module, RequestMethod} from '@nestjs/common'
import {FastifyAdapter, NestFastifyApplication} from '@nestjs/platform-fastify'

// Should be called before any v1 module import from v2
import {getDefaultPort, isJestTest} from '@opn-services/common/utils'
import {Config} from '@opn-common-v1/utils/config'
if (!isJestTest) {
  Config.useRootEnvFile()
}

// Common
import {AuthMiddleware, CorsMiddleware, CommonModule, createSwagger} from '@opn-services/common'
import {AllExceptionsFilter} from '@opn-services/common/exception'
import {OpnValidationPipe} from '@opn-services/common/pipes'

// Services
import {AppoinmentService} from '@opn-reservation-v1/services/appoinment.service'
import {UserService} from '@opn-common-v1/service/user/user-service'
import {UserCardService, StripeService} from '@opn-services/checkout/service'

// Controllers
import {CartController} from './controller/v1/public/cart.controller'
import {CartInternalController} from './controller/v1/internal/cart.controller'

@Module({
  imports: [CommonModule, StripeService, AppoinmentService, UserService],
  controllers: [CartController, CartInternalController],
  providers: [UserCardService, StripeService, AppoinmentService, UserService],
})
class App {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorsMiddleware, AuthMiddleware).forRoutes({
      path: '(.*)',
      method: RequestMethod.ALL,
    })
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(App, new FastifyAdapter())
  app.useGlobalPipes(
    new OpnValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    }),
  )
  app.setGlobalPrefix('checkout')
  app.useGlobalFilters(new AllExceptionsFilter())

  const defaultPort = getDefaultPort()
  await app.listen(defaultPort)
  createSwagger(app)
}

if (!isJestTest) {
  bootstrap()
}

export {App}
