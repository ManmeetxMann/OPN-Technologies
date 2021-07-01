import {Body, Controller, Post, UseGuards} from '@nestjs/common'
import {ApiBearerAuth, ApiHeader, ApiTags} from '@nestjs/swagger'
import {ResponseWrapper} from '@opn-services/common/dto/response-wrapper'
import {AuthTypes, InternalAuthTypes} from '@opn-services/common/types/authorization'
import {UserCardService} from '@opn-services/checkout/service'
import {InternalGuard} from '@opn-services/common/guard/internal.guard'
import {ApiCommonHeaders, InternalType, ApiAuthType} from '@opn-services/common/decorator'
import {BadRequestException} from '@opn-services/common/exception'
import {AppointmentConfirmedDto} from '@opn-services/checkout/dto'

@ApiTags('Cart Internal')
@ApiBearerAuth()
@ApiCommonHeaders()
@Controller('/api/v1/internal/cart')
@UseGuards(InternalGuard)
export class CartInternalController {
  constructor(private userCardService: UserCardService) {}

  @Post('sync-acuity-appointment-types')
  @ApiAuthType(AuthTypes.Internal)
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
  @ApiAuthType(AuthTypes.Internal)
  @InternalType(InternalAuthTypes.OpnSchedulerKey)
  async cleanUp(): Promise<ResponseWrapper<void>> {
    await this.userCardService.cleanupUserCart()
    return ResponseWrapper.actionSucceed(null)
  }

  @Post('/email-appointment-confirmed')
  @ApiAuthType(AuthTypes.Internal)
  @InternalType(InternalAuthTypes.OpnPubSub)
  async sendConfirmedEmail(
    @Body() {message}: AppointmentConfirmedDto,
  ): Promise<ResponseWrapper<void>> {
    if (!message || !message.data) {
      throw new BadRequestException(`data is missing from pub sub post`)
    }
    await this.userCardService.sendConfirmationEmail(message.data)
    return ResponseWrapper.actionSucceed(null)
  }
}
