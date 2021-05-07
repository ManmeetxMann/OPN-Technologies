import {Body, Controller, Delete, Get, Param, Post, Put, UseGuards} from '@nestjs/common'
import {ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags} from '@nestjs/swagger'
import {ResponseWrapper} from '@opn-services/common/dto/response-wrapper'
import {RequiredUserPermission} from '@opn-services/common/types/authorization'
import {AuthGuard, AuthUserDecorator, Roles} from '@opn-services/common'
import {AuthUser} from '@opn-services/common/model'

import {
  CartAddRequestDto,
  CartResponseDto,
  CheckoutResponseDto,
  PaymentAuthorizationRequestDto,
  PaymentAuthorizationResponseDto,
  CartUpdateRequestDto,
} from '@opn-services/cart/dto'
import {UserCardService} from '@opn-services/cart/service/user-cart.service'
import {StripeService} from '@opn-services/cart/service/stripe.service'
import {CardItemDBModel, CartItemStatus} from '@opn-services/cart/model/cart'

import {AppoinmentService} from '@opn-reservation-v1/services/appoinment.service'

import {CartFunctions, CartEvent} from '@opn-services/common/types/activity-logs'
import {LogInfo, LogWarning, LogError} from '@opn-services/common/utils/logging'

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
  @Roles([RequiredUserPermission.RegUser], true)
  async getAll(@AuthUserDecorator() authUser: AuthUser): Promise<ResponseWrapper<CartResponseDto>> {
    const userId = authUser.authUserId
    const organizationId = authUser.requestOrganizationId

    const userCard = await this.userCardService.getUserCart(userId, organizationId)
    return ResponseWrapper.actionSucceed(userCard)
  }

  @Post()
  @ApiHeader({
    name: 'organizationid',
  })
  @Roles([RequiredUserPermission.RegUser], true)
  async addCartItem(
    @AuthUserDecorator() authUser: AuthUser,
    @Body() cartItems: CartAddRequestDto,
  ): Promise<ResponseWrapper<void>> {
    const userId = authUser.authUserId
    const organizationId = authUser.requestOrganizationId

    const cartItemsCount = await this.userCardService.cartItemsCount(userId, organizationId)
    const maxCartItemsCount = this.maxCartItemsCount
    if (cartItemsCount >= maxCartItemsCount) {
      LogWarning(CartFunctions.addCartItem, CartEvent.maxCartItems, {
        cartItemsCount,
        maxCartItemsCount,
      })
      return ResponseWrapper.actionFailed(`Maximum cart items limit reached`)
    }

    await this.userCardService.addItems(userId, organizationId, cartItems.items)
    return ResponseWrapper.actionSucceed(null)
  }

  @Put('')
  @Roles([RequiredUserPermission.RegUser], true)
  async updateCart(
    @AuthUserDecorator() authUser: AuthUser,
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
  @Roles([RequiredUserPermission.RegUser], true)
  async deleteById(
    @AuthUserDecorator() authUser: AuthUser,
    @Param('cartItemId') cartItemId: string,
  ): Promise<ResponseWrapper<void>> {
    const userId = authUser.authUserId
    const organizationId = authUser.requestOrganizationId

    await this.userCardService.deleteCartItem(userId, cartItemId, organizationId)

    return ResponseWrapper.actionSucceed()
  }

  @Post('/ephemeral-keys')
  @ApiOperation({
    summary: `Return a ephemeral key for stripe customer, create stripe customer if doesn't exist`,
  })
  @ApiHeader({
    name: 'organizationid',
  })
  @Roles([RequiredUserPermission.RegUser], true)
  async creteEphemeralKeys(@AuthUserDecorator() authUser: AuthUser): Promise<unknown> {
    let stripeCustomerId = authUser.stripeCustomerId

    // Create stripe customer and safe in user document
    if (!stripeCustomerId) {
      stripeCustomerId = (await this.stripeService.createUser()).id

      const authUserId = authUser.id
      LogInfo(CartFunctions.creteEphemeralKeys, CartEvent.stripeCreateCustomer, {
        authUserId,
        stripeCustomerId,
      })
      await this.userCardService.updateUserStripeCustomerId(authUserId, stripeCustomerId)
    }

    // Create wallet ephemeral keys
    const ephemeralKeys = await this.stripeService.customerEphemeralKeys(stripeCustomerId)

    return ephemeralKeys
  }

  @Post('/checkout-payment')
  @ApiResponse({type: PaymentAuthorizationResponseDto})
  @ApiOperation({
    summary: 'Create payment intent, book all appointment in the cart, process payment',
  })
  @ApiHeader({
    name: 'organizationid',
  })
  @Roles([RequiredUserPermission.RegUser], true)
  async paymentAuthorization(
    @AuthUserDecorator() authUser: AuthUser,
    @Body() paymentAuthorization: PaymentAuthorizationRequestDto,
  ): Promise<ResponseWrapper<PaymentAuthorizationResponseDto>> {
    const userId = authUser.id
    const authUserId = authUser.authUserId
    const organizationId = authUser.requestOrganizationId
    const userEmail = authUser.email
    const stripeCustomerId = authUser.stripeCustomerId

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
      cart = await this.userCardService.validateUserCart(authUserId, organizationId)
    } catch (e) {
      LogError(CartFunctions.paymentAuthorization, CartEvent.cartValidationError, {...e})
      return ResponseWrapper.actionSucceed(result)
    }
    if (!cart.cardValidation.isValid) {
      const cartValidation = cart.cardValidation
      LogWarning(CartFunctions.paymentAuthorization, CartEvent.cartNotValid, {...cartValidation})
      result.cart = cartValidation
      return ResponseWrapper.actionSucceed(result)
    }
    result.cart.isValid = true

    // Create a payment intent, return error if can't be created
    const total = this.userCardService.stripePriceFromCart(cart.cartDdItems)
    const paymentIntent = await this.stripeService.createPaymentIntent(
      stripeCustomerId,
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
      LogError(CartFunctions.paymentAuthorization, CartEvent.appointmentsBookingError, null)

      result.cart.isValid = false
      result.payment.isValid = false

      if (result.payment.id) {
        await this.stripeService.cancelPaymentIntent(result.payment.id)
        result.payment.status = 'canceled_intent'
      }

      await this.cancelBulkAppointment(userId, appointmentCreateStatuses)
      return ResponseWrapper.actionSucceed(result)
    }

    // Capture payment intent
    const paymentIntentCapture = await this.stripeService.capturePaymentIntent(paymentIntent.id)
    result.payment = {
      isValid: this.stripeService.isPaymentIntentCaptureSuccess(paymentIntentCapture),
      id: paymentIntentCapture.id,
      status: paymentIntentCapture.status,
      client_secret: paymentIntentCapture.client_secret,
    }

    // Save order information and delete all cart items
    await this.userCardService.saveOrderInformation(appointmentCreateStatuses, paymentIntentCapture)
    await this.userCardService.deleteAllCartItems(authUserId, organizationId)

    result.cart.isValid = true
    return ResponseWrapper.actionSucceed(result)
  }

  @Post('/checkout')
  @ApiResponse({type: CheckoutResponseDto})
  @ApiOperation({summary: 'Book all appointment in the cart'})
  @ApiHeader({
    name: 'organizationid',
  })
  @Roles([RequiredUserPermission.RegUser], true)
  async checkout(
    @AuthUserDecorator() authUser: AuthUser,
  ): Promise<ResponseWrapper<CheckoutResponseDto>> {
    const userId = authUser.id
    const authUserId = authUser.authUserId
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
      cart = await this.userCardService.validateUserCart(authUserId, organizationId)
    } catch (e) {
      LogError(CartFunctions.checkout, CartEvent.cartValidationError, {...e})
      return ResponseWrapper.actionSucceed(result)
    }
    const cartValidation = cart.cardValidation
    if (!cartValidation.isValid) {
      LogWarning(CartFunctions.checkout, CartEvent.cartNotValid, {...cartValidation})
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

    await this.userCardService.deleteAllCartItems(authUserId, organizationId)

    return ResponseWrapper.actionSucceed(result)
  }

  async createBulkAppointment(
    cartDdItems: CardItemDBModel[],
    userId: string,
    userEmailAuthToken: string,
  ): Promise<CartItemStatus[]> {
    const appointmentCreateStatuses = await Promise.all(
      cartDdItems.map(async cartDdItem => {
        try {
          const newAppointment = await this.appoinmentService.createAcuityAppointmentFromCartItem(
            cartDdItem,
            userId,
            cartDdItem.patient.email || userEmailAuthToken,
          )
          return {
            cartItemId: cartDdItem.cartItemId,
            appointmentId: newAppointment.id,
            isSuccess: true,
          }
        } catch (e) {
          LogError(CartFunctions.cancelBulkAppointment, CartEvent.errorBookingAppointment, {
            errorMessage: (<Error>e).message,
          })
          return {
            cartItemId: cartDdItem.cartItemId,
            isSuccess: false,
          }
        }
      }),
    )
    return appointmentCreateStatuses
  }

  async cancelBulkAppointment(
    userId: string,
    appointmentCreateStatuses: CartItemStatus[],
  ): Promise<void> {
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
            LogError(CartFunctions.cancelBulkAppointment, CartEvent.appointmentsBookingError, null)
          }
        }),
    )
  }
}
