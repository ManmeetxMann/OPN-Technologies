import {Body, Controller, Get, Param, Post, Put, Delete, UseGuards} from '@nestjs/common'
import {ApiTags, ApiBearerAuth, ApiHeader, ApiResponse, ApiOperation} from '@nestjs/swagger'
import {ResponseWrapper} from '@opn-services/common/dto/response-wrapper'
import {AuthGuard, AuthUserDecorator} from '@opn-services/common'

import {
  CartResponseDto,
  CartAddRequestDto,
  PaymentAuthorizationResponseDto,
  PaymentAuthorizationRequestDto,
  CheckoutResponseDto,
  CartUpdateRequestDto,
} from '@opn-services/cart/dto'
import {UserCardService} from '@opn-services/cart/service/user-cart.service'
import {StripeService} from '@opn-services/cart/service/stripe.service'
import {CartItemStatus, CardItemDBModel} from '@opn-services/cart/model/cart'

import {AppoinmentService} from '@opn-reservation-v1/services/appoinment.service'

@ApiTags('Cart')
@Controller('/api/v1/cart')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class CartController {
  private maxCartItemsCount = 50
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

    const cartItemsCount = await this.userCardService.cartItemsCount(userId, organizationId)
    if (cartItemsCount >= this.maxCartItemsCount) {
      console.log('Attempt to add more that allowed items to the cart')
      return ResponseWrapper.actionFailed(`Maximum cart items limit reached`)
    }

    await this.userCardService.addItems(userId, organizationId, cartItems.items)
    return ResponseWrapper.actionSucceed(null)
  }

  @Put('')
  async updateCart(
    @AuthUserDecorator() authUser,
    @Body() cartItems: CartUpdateRequestDto,
  ): Promise<ResponseWrapper<void>> {
    const userOrgId = `${authUser.authUserId}_${authUser.requestOrganizationId}`

    await this.userCardService.updateItem(userOrgId, cartItems)
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

    await this.userCardService.deleteCartItem(userId, cartItemId, organizationId)

    return ResponseWrapper.actionSucceed()
  }

  @Post('/ephemeral-keys')
  @ApiHeader({
    name: 'organizationid',
  })
  async creteEphemeralKeys(): Promise<unknown> {
    const ephemeralKeys = await this.stripeService.customerEphemeralKeys('cus_JJ0T3QA6kYrv9M')
    return ephemeralKeys
  }

  @Post('/payment-authorization')
  @ApiResponse({type: PaymentAuthorizationResponseDto})
  @ApiOperation({summary: 'Create payment intent, book all appointment in the cart'})
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

    // Validate each cart item against acuity Available Slots
    let cart = null
    try {
      cart = await this.userCardService.validateUserCart(userId, organizationId)
    } catch (e) {
      console.error('Error validating cart')
      return ResponseWrapper.actionSucceed(result)
    }
    if (!cart.cardValidation.isValid) {
      console.log('Cart not valid')
      result.cart = cart.cardValidation
      return ResponseWrapper.actionSucceed(result)
    }

    // Create a payment intent, return error if can't be created
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

    // Create all cart items appointments, sae failed to cart validation
    const appointmentCreateStatuses = await this.createBulkAppointment(
      cart.cartDdItems,
      userId,
      userEmail,
    )
    result.cart.items = appointmentCreateStatuses
      .filter(status => status.isSuccess === false)
      .map(status => {
        return {
          cartItemId: status.cartItemId,
          message: this.userCardService.timeSlotNotAvailMsg,
        }
      })

    // Cancel payment intent and all successfully created acuity appointment
    if (appointmentCreateStatuses.some(status => status.isSuccess === false)) {
      result.cart.isValid = false
      result.payment.isValid = false

      if (result.payment.id) {
        console.log('Canceling payment intent')
        await this.stripeService.cancelPaymentIntent(result.payment.id)
        result.payment.status = 'canceled_intent'
      }

      await this.cancelBulkAppointment(userId, appointmentCreateStatuses)
      return ResponseWrapper.actionSucceed(result)
    }

    await this.userCardService.saveOrderInformation(appointmentCreateStatuses, paymentIntent)
    await this.userCardService.deleteAllCartItems(userId, organizationId)

    result.cart.isValid = true
    return ResponseWrapper.actionSucceed(result)
  }

  @Post('/checkout')
  @ApiResponse({type: CheckoutResponseDto})
  @ApiOperation({summary: 'Book all appointment in the cart'})
  @ApiHeader({
    name: 'organizationid',
  })
  async checkout(@AuthUserDecorator() authUser) {
    const userId = authUser.authUserId
    const organizationId = authUser.requestOrganizationId
    const userEmail = authUser.email

    const result: CheckoutResponseDto = {
      cart: {
        isValid: false,
        items: [],
      },
    }

    // Validate each cart item against acuity Available Slots
    let cart = null
    try {
      cart = await this.userCardService.validateUserCart(userId, organizationId)
    } catch (e) {
      console.error('Error validating cart')
      return ResponseWrapper.actionSucceed(result)
    }
    if (!cart.cardValidation.isValid) {
      console.log('Cart not valid')
      result.cart = cart.cardValidation
      return ResponseWrapper.actionSucceed(result)
    }

    // Create all cart items appointments
    const appointmentCreateStatuses = await this.createBulkAppointment(
      cart.cartDdItems,
      userId,
      userEmail,
    )
    result.cart.items = appointmentCreateStatuses
      .filter(status => status.isSuccess === false)
      .map(status => {
        return {
          cartItemId: status.cartItemId,
          message: this.userCardService.timeSlotNotAvailMsg,
        }
      })

    // Cancel all successfully created acuity appointment
    if (result.cart.items.length !== 0) {
      result.cart.isValid = false
      await this.cancelBulkAppointment(userId, appointmentCreateStatuses)
      return ResponseWrapper.actionSucceed(result)
    }

    await this.userCardService.deleteAllCartItems(userId, organizationId)

    return ResponseWrapper.actionSucceed(result)
  }

  async createBulkAppointment(
    cartDdItems: CardItemDBModel[],
    userId: string,
    userEmail: string,
  ): Promise<CartItemStatus[]> {
    const appointmentCreateStatuses = await Promise.all(
      cartDdItems.map(async cartDdItem => {
        try {
          const newAppointment = await this.appoinmentService.createAcuityAppointmentFromCartItem(
            cartDdItem,
            userId,
            userEmail,
          )
          return {
            cartItemId: cartDdItem.cartItemId,
            appointmentId: newAppointment.id,
            isSuccess: true,
          }
        } catch (e) {
          console.log('Error creating cart appointment')
          return {
            cartItemId: cartDdItem.cartItemId,
            isSuccess: false,
          }
        }
      }),
    )
    return appointmentCreateStatuses
  }

  async cancelBulkAppointment(userId: string, appointmentCreateStatuses: CartItemStatus[]) {
    await Promise.all(
      appointmentCreateStatuses
        .filter(status => status.isSuccess === true)
        .map(async status => {
          try {
            const isOpnSuperAdmin = true
            await this.appoinmentService.cancelAppointment(
              status.appointmentId,
              userId,
              isOpnSuperAdmin,
            )
          } catch (e) {
            console.error('Error canceling cart appointment')
          }
        }),
    )
  }
}
