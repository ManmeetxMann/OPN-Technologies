import {Controller, Headers, Post, UnauthorizedException, UseGuards} from '@nestjs/common'
import {ApiHeader, ApiTags} from '@nestjs/swagger'
import {ResponseWrapper} from '@opn-services/common/dto/response-wrapper'

import {UserCardService} from '@opn-services/cart/service/user-cart.service'

import {ConfigService} from '@nestjs/config'
import {Roles} from '@opn-services/common'
import {InternalAuthTypes, RequiredUserPermission} from '@opn-services/common/types/authorization'
import {InternalType} from '@opn-services/common/decorator/internal.decorator'
import {InternalGuard} from '@opn-services/common/guard/internal.guard'

@ApiTags('CartInternal')
@Controller('internal/api/v1/cart')
@UseGuards(InternalGuard)
export class CartController {
  constructor(private userCardService: UserCardService, private configService: ConfigService) {}

  @Post('/remove-expired-items')
  @ApiHeader({
    name: 'opn-scheduler-key',
  })
  @InternalType(InternalAuthTypes.OpnSchedulerKey)
  async cleanUp(): Promise<ResponseWrapper<void>> {
    await this.userCardService.cleanupUserCart()
    return ResponseWrapper.actionSucceed(null)
  }
}
