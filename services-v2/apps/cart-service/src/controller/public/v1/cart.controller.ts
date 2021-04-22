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

@ApiTags('Cart')
@Controller('/api/v1/cart')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class CartController {
  constructor(
    private userCardService: UserCardService,
    private stripeService: StripeService,
    private appoinmentService: AppoinmentService,
  ) {}

  @Get()
  @ApiResponse({type: CartResponseDto})
  @ApiHeader({
    name: 'organizationid',
  })
  async getAll(@AuthUserDecorator() authUser): Promise<ResponseWrapper<CartResponseDto>> {
    const userId = authUser.authUserId
    const organizationId = authUser.requestOrganizationId

    const userCard = await this.userCardService.getUserCart(userId, organizationId)
    return ResponseWrapper.actionSucceed(userCard)
  }

  @Post()
  @ApiHeader({
    name: 'organizationid',
  })
  async add(
    @AuthUserDecorator() authUser,
    @Body() cartItems: CartAddRequestDto,
  ): Promise<ResponseWrapper<void>> {
    const userId = authUser.authUserId
    const organizationId = authUser.requestOrganizationId

    await this.userCardService.addItems(userId, organizationId, cartItems.items)
    return ResponseWrapper.actionSucceed(null)
  }

  @Delete('/:cartItemId')
  @ApiHeader({
    name: 'organizationid',
  })
  async getById(
    @AuthUserDecorator() authUser,
    @Param('cartItemId') cartItemId: string,
  ): Promise<ResponseWrapper<void>> {
    const userId = authUser.authUserId
    const organizationId = authUser.requestOrganizationId

    await this.userCardService.deleteItem(userId, cartItemId, organizationId)

    return ResponseWrapper.actionSucceed()
  }

  @Post('/ephemeral-keys')
  @ApiHeader({
    name: 'organizationid',
  })
  async creteEphemeralKeys(): Promise<ResponseWrapper<unknown>> {
    const ephemeralKeys = await this.stripeService.customerEphemeralKeys('cus_JJ0T3QA6kYrv9M')
    return ResponseWrapper.actionSucceed(ephemeralKeys)
  }

  @Post('/payment-authorization')
  @ApiResponse({type: PaymentAuthorizationResponseDto})
  @ApiHeader({
    name: 'organizationid',
  })
  async paymentAuthorization(
    @AuthUserDecorator() authUser,
    @Body() paymentAuthorization: PaymentAuthorizationRequestDto,
  ): Promise<ResponseWrapper<PaymentAuthorizationResponseDto>> {
    const userId = authUser.authUserId
    const organizationId = authUser.requestOrganizationId
    const userEmail = authUser.email

    const result: PaymentAuthorizationResponseDto = {
      payment: {
        isValid: false,
        id: null,
        status: 'not_processed',
        client_secret: null,
      },
      cart: {
        isValid: false,
        items: [],
      },
    }

    // Check each cart item against acuity Available Slots
    let cart = null
    try {
      cart = await this.userCardService.validateUserCart(userId, organizationId)
    } catch (e) {
      console.error('Error validating cart')
      return ResponseWrapper.actionSucceed(result)
    }

    if (!cart.cardValidation.isValid) {
      console.log('Cart not valid')
      result.cart.items = cart.cardValidation
      return ResponseWrapper.actionSucceed(result)
    }

    // Create a payment intent, return error in can't be created
    const total = this.userCardService.stripePriceFromCart(cart.cartDdItems)
    const paymentIntent = await this.stripeService.createPaymentIntent(
      'cus_JJ0T3QA6kYrv9M',
      total,
      paymentAuthorization.paymentMethodId,
    )
    result.payment.status = paymentIntent?.status || 'create_intent_failure'
    if (!this.stripeService.isPaymentIntentSuccess(paymentIntent)) {
      return ResponseWrapper.actionSucceed(result)
    }
    result.payment.isValid = true
    result.payment.id = paymentIntent.id
    result.payment.client_secret = paymentIntent.client_secret

    // Create each appointment on acuity
    const appointmentCreatedAcuityIds = []
    let isAllAppointmentCreated = true
    for (const cartDdItem of cart.cartDdItems) {
      try {
        const appointmentCreateStatus = await this.appoinmentService.createAcuityAppointmentFromCartItem(
          cartDdItem,
          userId,
          userEmail,
        )
        appointmentCreatedAcuityIds.push(appointmentCreateStatus.id)
      } catch (e) {
        // If on fails cancel all
        result.cart.isValid = false
        result.cart.items.push({
          cartItemId: cartDdItem.cartItemId,
          message: this.userCardService.timeSlotNotAvailMsg,
        })
        isAllAppointmentCreated = false
        console.error(e)
      }
    }

    // TODO Cancel acuity
    if (!isAllAppointmentCreated) {
      if (result.payment.id) {
        console.log('Canceling payment intent')
        await this.stripeService.cancelPaymentIntent(result.payment.id)
      }
      result.payment.isValid = false
      result.payment.status = 'canceled_intent'
      console.log('Not isAllAppointmentCreated')
      console.log(appointmentCreatedAcuityIds)
      return ResponseWrapper.actionSucceed(result)
    }

    result.cart.isValid = true
    return ResponseWrapper.actionSucceed(result)
  }
}
