/**
 * Is included in V1
 * All import MUCH be relative
 */
import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {Gender} from '../../../../../packages/reservation/src/models/appointment'

import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  IsEnum,
  IsDateString,
  IsNumber,
  IsEmail,
} from 'class-validator'

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
  hadCovidExposerDate: string

  @ApiProperty()
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  shareTestResultWithEmployer: boolean
}
