import {NestFactory} from '@nestjs/core'
import {Module} from '@nestjs/common'
import {CommonModule} from '@opn/common'

@Module({
  imports: [CommonModule],
  controllers: [],
  providers: [],
})
class App {}

async function bootstrap() {
  const app = await NestFactory.create(App)
  await app.listen(3000)
}
bootstrap()

export {App}
