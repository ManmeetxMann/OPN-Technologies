import {Controller, Post} from '@nestjs/common'
import {ApiBearerAuth, ApiTags} from '@nestjs/swagger'
import {ResponseWrapper} from '@opn-services/common/dto/response-wrapper'
import {UserCardService} from '@opn-services/cart/service/user-cart.service'

@ApiTags('Cart Internal')
@ApiBearerAuth()
@Controller('/api/v1/internal/cart')
export class CartInternalController {
  constructor(private userCardService: UserCardService) {}

  @Post('sync-acuity-appointment-types')
  async syncAcuityPrices() {
    const result = await this.userCardService.syncAppointmentTypes()

    if (!result) {
      return ResponseWrapper.actionFailed(null)
    }

    return ResponseWrapper.actionSucceed(null)
  }
}
