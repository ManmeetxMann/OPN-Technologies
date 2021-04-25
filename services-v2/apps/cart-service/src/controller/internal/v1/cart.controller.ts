import {Body, Controller, Get, Param, Post, Delete, UseGuards} from '@nestjs/common'
import {ApiTags, ApiBearerAuth, ApiHeader, ApiResponse} from '@nestjs/swagger'
import {ResponseWrapper} from '@opn-services/common/dto/response-wrapper'
import {AuthGuard, AuthUserDecorator} from '@opn-services/common'

import {
  CartResponseDto,
  CartAddRequestDto,
  PaymentAuthorizationResponseDto,
  PaymentAuthorizationRequestDto,
} from '@opn-services/cart/dto'
import {UserCardService} from '@opn-services/cart/service/user-cart.service'
import {StripeService} from '@opn-services/cart/service/stripe.service'

import {AppoinmentService} from '@opn-reservation-v1/services/appoinment.service'

@ApiTags('CartInternal')
@Controller('internal/api/v1/cart')
export class CartController {
  constructor(
    private userCardService: UserCardService,
    private stripeService: StripeService,
    private appoinmentService: AppoinmentService,
  ) {}

  @Post('/remove-expired-items')
  @ApiHeader({
    name: 'organizationid',
  })
  async add(): Promise<ResponseWrapper<void>> {
    await this.userCardService.cleanupUserCart()
    return ResponseWrapper.actionSucceed(null)
  }
}
