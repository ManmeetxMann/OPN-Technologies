import {NestFactory} from '@nestjs/core'
import {OpnServicesModule} from './opn-services.module'

async function bootstrap() {
  const app = await NestFactory.create(OpnServicesModule)
  await app.listen(process.env.PORT || 8080)
}
bootstrap()
