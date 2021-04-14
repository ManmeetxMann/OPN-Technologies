import {Module} from '@nestjs/common'
import {OpnServicesController} from './opn-services.controller'
import {OpnServicesService} from './opn-services.service'

@Module({
  imports: [],
  controllers: [OpnServicesController],
  providers: [OpnServicesService],
})
export class OpnServicesModule {}
