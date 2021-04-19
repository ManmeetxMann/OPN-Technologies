import {NestFactory} from '@nestjs/core'
import {Module} from '@nestjs/common'
import {CommonModule} from '@opn-services/common'

@Module({
  imports: [CommonModule],
  controllers: [],
  providers: [],
})
class App {}

async function bootstrap() {
  const app = await NestFactory.create(App)
  await app.listen(process.env.PORT || 8080)
}
bootstrap()

export {App}
