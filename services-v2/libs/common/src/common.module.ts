import {Module} from '@nestjs/common'
import {CommonService} from './common.service'
import {ConfigModule} from '@nestjs/config'

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [CommonService],
  exports: [CommonService, ConfigModule.forRoot()],
})
export class CommonModule {}
