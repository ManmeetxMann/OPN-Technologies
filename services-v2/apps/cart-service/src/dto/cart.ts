import {IsNotEmpty, IsString, IsNumber, IsBoolean, IsOptional} from 'class-validator'

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
  @ApiProperty()
  cartItems: CartItemDto[]

  @ApiProperty()
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
  @IsString()
  @IsNotEmpty()
  couponCode: string

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
