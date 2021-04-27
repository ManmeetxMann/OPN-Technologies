import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsDefined,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator'
import {Type} from 'class-transformer'

import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'

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

export class CartResponseDto {
  @ApiProperty({type: [CartItemDto]})
  cartItems: CartItemDto[]

  @ApiProperty({type: [CartSummaryDto]})
  paymentSummary: CartSummaryDto[]
}

class CartAddPhoneDto {
  @IsNumber()
  @IsNotEmpty()
  code: number

  @IsNumber()
  @IsNotEmpty()
  number: number
}

export class CartAddDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  slotId: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  gender: string

  @ApiProperty()
  phone: CartAddPhoneDto

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  dateOfBirth: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  addressUnit: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  postalCode: string

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  shareTestResultWithEmployer: boolean

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  readTermsAndConditions: boolean

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  agreeToConductFHHealthAssessment: boolean

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  receiveResultsViaEmail: boolean

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  receiveNotificationsFromGov: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @ApiProperty()
  @IsString()
  userId: string
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
