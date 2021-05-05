import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
  Length,
  IsEnum,
  IsDateString,
  IsNumber,
  IsEmail,
} from 'class-validator'
import {Type} from 'class-transformer'

import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {Gender} from '@opn-reservation-v1/models/appointment'

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

export class CartAddDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  slotId: string

  @ApiProperty()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  firstName: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  lastName: string

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  phone: string

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  @Length(1, 50)
  email: string

  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  dateOfBirth: string

  @ApiProperty({enum: Gender})
  @IsString()
  @IsNotEmpty()
  @IsEnum(Gender)
  gender: string

  @ApiProperty()
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @Length(1, 50)
  ohipCard: string

  @ApiProperty()
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @Length(1, 20)
  travelID: string

  @ApiProperty()
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @Length(1, 20)
  travelIDIssuingCountry: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Length(1, 250)
  address: string

  @ApiProperty()
  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @Length(1, 250)
  addressUnit: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  city: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  province: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  country: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Length(1, 10)
  postalCode: string

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  readTermsAndConditions: boolean

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  receiveResultsViaEmail: boolean

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  agreeToConductFHHealthAssessment: boolean

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  receiveNotificationsFromGov: boolean

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  agreeCancellationRefund: boolean

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  hadCovidConfirmedOrSymptoms: boolean

  @ApiProperty()
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @IsDateString()
  hadCovidConfirmedOrSymptomsDate: string

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  hadCovidExposer: boolean

  @ApiProperty()
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @IsDateString()
  hadCovidExposerData: string

  @ApiProperty()
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  shareTestResultWithEmployer: boolean
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
