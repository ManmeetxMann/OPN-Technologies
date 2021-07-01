import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator'
import {Type} from 'class-transformer'

import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {CartAddDto} from './cart-item'
export class CartItemDto {
  @ApiProperty()
  cartItemId: string

  @ApiProperty()
  label: string

  @ApiProperty()
  subLabel: string

  @ApiProperty()
  patientName: string

  @ApiProperty()
  date: string

  @ApiProperty()
  price: number

  @ApiProperty()
  @ApiPropertyOptional()
  @ApiProperty()
  userId: string

  discountedPrice?: number
  discountedError?: string
}
export class CartSummaryDto {
  @ApiProperty()
  uid: string

  @ApiProperty()
  label: string

  @ApiProperty()
  amount: number

  @ApiProperty()
  currency: string
}

export class CartCoupon {
  @ApiProperty()
  couponCode: string | null
}

export class CartResponseDto {
  @ApiProperty({type: [CartItemDto]})
  cartItems: CartItemDto[]

  @ApiProperty({type: [CartSummaryDto]})
  paymentSummary: CartSummaryDto[]

  @ApiProperty()
  cart: CartCoupon
}

export class CartUpdateRequestDto extends CartAddDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cartItemId: string
}

export class CartAddRequestDto {
  @ApiProperty({type: [CartAddDto]})
  @IsDefined()
  @IsArray()
  @ValidateNested()
  @Type(() => CartAddDto)
  items!: CartAddDto[]
}

export class CouponRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  coupon!: string
}

class PubSubMessageDto {
  @ApiProperty()
  @IsBoolean()
  data!: string
}

export class AppointmentConfirmedDto {
  @ApiProperty()
  @IsObject()
  message!: PubSubMessageDto
}

export class PaymentAuthorizationRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  paymentMethodId: string
}

export class CartValidationItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cartItemId: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  message: string
}

export class PaymentAuthorizationCartDto {
  @ApiProperty()
  @IsBoolean()
  isValid: boolean

  @ApiProperty({nullable: false, type: [CartValidationItemDto]})
  @IsArray()
  @IsOptional()
  @ValidateNested()
  @Type(() => CartAddDto)
  items!: CartValidationItemDto[]
}

export class PaymentAuthorizationPaymentDto {
  @ApiProperty()
  @IsBoolean()
  isValid: boolean

  @ApiProperty({nullable: false})
  @IsOptional()
  @IsString()
  id: string

  @ApiProperty()
  @IsString()
  status: string

  @ApiProperty({nullable: false})
  @IsOptional()
  @IsString()
  client_secret: string
}

export class PaymentSheet {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  setupPaymentIntent: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  ephemeralKey: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  customer: string
}
export class PaymentAuthorizationResponseDto {
  @ApiProperty()
  @IsObject()
  cart: PaymentAuthorizationCartDto

  @ApiProperty({nullable: true})
  @IsOptional()
  @IsObject()
  payment: PaymentAuthorizationPaymentDto
}

export class CheckoutResponseDto {
  @ApiProperty()
  @IsObject()
  cart: PaymentAuthorizationCartDto
}
