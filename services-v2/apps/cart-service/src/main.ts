// NestJs
import {NestFactory} from '@nestjs/core'
import {MiddlewareConsumer, Module, RequestMethod, ValidationPipe} from '@nestjs/common'
import {FastifyAdapter, NestFastifyApplication} from '@nestjs/platform-fastify'

// Common
import {AuthMiddleware, CommonModule, createSwagger} from '@opn-services/common'

// Services
import {corsOptions} from '@opn-services/common/configuration/cors.configuration'
import {AppoinmentService} from '@opn-reservation-v1/services/appoinment.service'
import {UserService} from '@opn-common-v1/service/user/user-service'
import {UserCardService} from '@opn-services/cart/service/user-cart.service'
import {StripeService} from '@opn-services/cart/service/stripe.service'

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
    consumer.apply(AuthMiddleware).forRoutes({
      path: '*',
      method: RequestMethod.ALL,
    })
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(App, new FastifyAdapter())
  app.enableCors(corsOptions)

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    }),
  )

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
