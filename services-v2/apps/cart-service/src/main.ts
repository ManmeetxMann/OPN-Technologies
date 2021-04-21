// NestJs
import {NestFactory} from '@nestjs/core'
import {Module, ValidationPipe, MiddlewareConsumer, RequestMethod} from '@nestjs/common'
import {FastifyAdapter, NestFastifyApplication} from '@nestjs/platform-fastify'

// Common
import {CommonModule, AuthMiddleware, createSwagger} from '@opn-services/common'

// Services
import {AppoinmentService} from '@opn-reservation-v1/services/appoinment.service'
import {UserService} from '@opn-common-v1/service/user/user-service'
import {UserCardService} from '@opn-services/cart/service/user-cart.service'
import {StripeService} from '@opn-services/cart/service/stripe.service'

// Controllers
import {CartController} from './controller/public/v1/cart.controller'

@Module({
  imports: [CommonModule, StripeService, AppoinmentService, UserService],
  controllers: [CartController],
  providers: [UserCardService, StripeService, AppoinmentService, UserService],
})
class App {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes({
      path: '*',
      method: RequestMethod.ALL,
    })
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(App, new FastifyAdapter())

  app.useGlobalPipes(
    new ValidationPipe({
      forbidUnknownValues: true,
    }),
  )

  createSwagger(app)

  await app.listen(process.env.PORT || 8080)
}
bootstrap()

export {App}
