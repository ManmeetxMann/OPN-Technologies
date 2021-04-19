// NestJs
import {NestFactory} from '@nestjs/core'
import {Module, ValidationPipe} from '@nestjs/common'

import {CartController} from './controller/public/v1/cart.controller'

import {CommonModule, createSwagger} from '@opn-services/common'

@Module({
  imports: [CommonModule],
  controllers: [CartController],
  providers: [],
})
class App {}

async function bootstrap() {
  const app = await NestFactory.create(App)

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
