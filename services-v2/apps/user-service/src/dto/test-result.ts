import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl} from 'class-validator'
import {firestore} from 'firebase-admin'

export enum TestTypes {
  Positive = 'Positive',
  Negative = 'Negative',
  Invalid = 'Invalid',
}

enum ReportAs {
  Individual = 'Individual',
  Family = 'Family',
  PartOfATeam = 'PartOfATeam',
}

export class CreateTestResultResponseDto {
  @ApiProperty()
  @IsString()
  couponCode: string
}

export class TestResultCreateDto {
  id: string
  testType: string
  userId: string
  displayInResult: string
  homeKitId: string
  resultExitsForProvidedEmail: boolean
  dateTime: firestore.Timestamp

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  homeKitCode?: string

  @IsString()
  @IsOptional()
  generatedCouponCode?: string

  @ApiProperty()
  @ApiPropertyOptional()
  @IsString()
  @IsUrl()
  @IsOptional()
  photoUrl?: string

  @ApiProperty()
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  dependantId?: number

  @ApiProperty()
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  organizationId?: string

  @ApiProperty({enum: TestTypes})
  @IsString()
  @IsNotEmpty()
  result: TestTypes

  @ApiProperty({enum: ReportAs})
  @IsString()
  @IsNotEmpty()
  reportAs: ReportAs

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  postalCode?: string
}
