import {ApiProperty} from '@nestjs/swagger'
import {IsDateString, IsNotEmpty, IsOptional, IsString, IsUrl} from 'class-validator'

enum TestTypes {
  Positive = 'Positive',
  Negative = 'Negative',
  Invalid = 'Invalid',
}

enum ReportAs {
  Individual = 'Individual',
  Family = 'Family',
  PartOfATeam = 'PartOfATeam',
}

export class TestResultCreateDto {
  id: string
  testType: string
  userId: string
  displayInResult: string
  homeKitId: string
  resultExitsForProvidedEmail: boolean

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  homeKitCode?: string

  @ApiProperty()
  @IsString()
  @IsUrl()
  @IsNotEmpty()
  photoUrl: string

  @ApiProperty()
  @IsString()
  @IsOptional()
  dependantId?: number

  @ApiProperty()
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

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsDateString()
  dateOfBirth: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  postalCode: string
}
