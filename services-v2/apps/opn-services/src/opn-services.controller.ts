import {Controller, Get} from '@nestjs/common'
import {OpnServicesService} from './opn-services.service'

@Controller()
export class OpnServicesController {
  constructor(private readonly opnServicesService: OpnServicesService) {}

  @Get()
  getHello(): string {
    return this.opnServicesService.getHello()
  }
}
