import {Body, Controller, Get, Param, Post, Delete, UseGuards} from '@nestjs/common'
import {ApiTags, ApiBearerAuth, ApiHeader, ApiResponse} from '@nestjs/swagger'
import {ResponseWrapper} from '@opn-services/common/dto/response-wrapper'
import {AuthGuard, AuthUserDecorator} from '@opn-services/common'

import {CartAddDto, CartResponseDto} from '@opn-services/cart/dto'
import {UserCardService} from '@opn-services/cart/service/user-cart.service'
import {StripeService} from '@opn-services/cart/service/stripe.service'

import {Gender} from '@opn-reservation-v1/models/appointment'
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
  // @ApiHeader({
  //   name: 'organizationid',
  // })
  async add(
    @AuthUserDecorator() authUser,
    @Body() cartItems: CartAddDto,
  ): Promise<ResponseWrapper<void>> {
    const userId = authUser.authUserId
    const organizationId = authUser.requestOrganizationId

    const items = [
      {
        slotId:
          'eyJhcHBvaW50bWVudFR5cGVJZCI6MTk0MjIwMTgsImNhbGVuZGFyVGltZXpvbmUiOiJBbWVyaWNhL1Rvcm9udG8iLCJjYWxlbmRhcklkIjo0NTcxMTAzLCJjYWxlbmRhck5hbWUiOiJCcmFtcHRvbjogTW91bnQgUGxlYXNhbnQgVmlsbGFnZSIsImRhdGUiOiIyMDIxLTA1LTAyIiwidGltZSI6IjIwMjEtMDUtMDJUMDg6MTA6MDAtMDQwMCIsIm9yZ2FuaXphdGlvbklkIjoidkd2cUpVTGZ3SUMwQ0R3VnlBREkiLCJwYWNrYWdlQ29kZSI6IjBGN0U0REI1In0=',
        firstName: 'string',
        lastName: 'string',
        gender: Gender.Male,
        phone: {
          code: 0,
          number: 0,
        },
        dateOfBirth: '2021-04-17',
        address: 'string',
        addressUnit: 'string',
        postalCode: 'string',
        couponCode: 'string',
        shareTestResultWithEmployer: true,
        agreeToConductFHHealthAssessment: true,
        readTermsAndConditions: true,
        receiveResultsViaEmail: true,
        receiveNotificationsFromGov: true,
        userId: 'null',
      },
    ]
    const userCard = await this.userCardService.addItems(userId, organizationId, items)

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
  @ApiHeader({
    name: 'organizationid',
  })
  async paymentAuthorization(@AuthUserDecorator() authUser): Promise<ResponseWrapper<unknown>> {
    const userId = authUser.authUserId
    const organizationId = authUser.requestOrganizationId
    const userEmail = authUser.email

    const orgHasPayment = true
    const cart = await this.userCardService.validateUserCart(userId, organizationId)

    if (cart.cardValidation.isValid) {
      // Payment intent successful
      for (const cartDdItem of cart.cartDdItems) {
        const {appointmentType} = cartDdItem

        if (orgHasPayment) {
          // Create payment intend for each successfully booked appointment
          const itemPrice = this.userCardService.stripePriceWithTax(appointmentType.price)
          // const paymentIntent = {}
          const paymentIntent = await this.stripeService.createPaymentIntent(
            'cus_JJ0T3QA6kYrv9M',
            itemPrice,
            'test',
          )
          if (!this.stripeService.isPaymentIntentSuccess(paymentIntent)) {
            // Not payment intent authorization
            cart.cardValidation.isValid = false

            return ResponseWrapper.actionSucceed({...paymentIntent, ...cart.cardValidation})
          }
        }

        // Create acuity appointment
        try {
          const appointmentCreateStatus = await this.appoinmentService.createAcuityAppointmentFromCartItem(
            cartDdItem,
            userId,
            'w',
          )
        } catch (e) {
          cart.cardValidation.invalidItems.push({
            cartItemId: cartDdItem.cartItemId,
            message: 'Error creating appointment',
          })
          return ResponseWrapper.actionSucceed(cart.cardValidation)
        }

        // Create payment intend DB record
        // appointmentCreateStatus.
      }

      // Create order DB record

      return ResponseWrapper.actionSucceed(cart.cardValidation)
    }

    return ResponseWrapper.actionSucceed(cart.cardValidation)
  }
}
