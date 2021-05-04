import {Controller, Post, UseGuards} from '@nestjs/common'
import {ApiBearerAuth, ApiHeader, ApiTags} from '@nestjs/swagger'
import {ResponseWrapper} from '@opn-services/common/dto/response-wrapper'
import {UserCardService} from '@opn-services/cart/service/user-cart.service'
import {InternalType} from '@opn-services/common/decorator/internal.decorator'
import {InternalAuthTypes} from '@opn-services/common/types/authorization'
import {InternalGuard} from '@opn-services/common/guard/internal.guard'

@ApiTags('Cart Internal')
@ApiBearerAuth()
@Controller('/api/v1/internal/cart')
@UseGuards(InternalGuard)
export class CartInternalController {
  constructor(private userCardService: UserCardService) {}

  @Post('sync-acuity-appointment-types')
  async syncAcuityPrices(): Promise<ResponseWrapper<void>> {
    const result = await this.userCardService.syncAppointmentTypes()

    if (!result) {
      return ResponseWrapper.actionFailed(null)
    }

    return ResponseWrapper.actionSucceed(null)
  }

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
