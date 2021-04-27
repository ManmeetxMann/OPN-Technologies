import {Controller, Post, Headers, UnauthorizedException} from '@nestjs/common'
import {ApiTags, ApiHeader} from '@nestjs/swagger'
import {ResponseWrapper} from '@opn-services/common/dto/response-wrapper'

import {UserCardService} from '@opn-services/cart/service/user-cart.service'

import {ConfigService} from '@nestjs/config'

@ApiTags('CartInternal')
@Controller('internal/api/v1/cart')
export class CartController {
  constructor(private userCardService: UserCardService, private configService: ConfigService) {}

  @Post('/remove-expired-items')
  @ApiHeader({
    name: 'organizationid',
  })
  @ApiHeader({
    name: 'opn-scheduler-key',
  })
  async add(@Headers('opn-scheduler-key') opnSchedulerKey: string): Promise<ResponseWrapper<void>> {
    if (opnSchedulerKey !== this.configService.get('OPN_SCHEDULER_KEY')) {
      throw new UnauthorizedException('Invalid Scheduler Key')
    }
    await this.userCardService.cleanupUserCart()
    return ResponseWrapper.actionSucceed(null)
  }
}
