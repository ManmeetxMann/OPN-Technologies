import {ApiProperty} from '@nestjs/swagger'
import {IsDateString, IsNotEmpty, IsString, IsUrl} from 'class-validator'
import {firestore} from 'firebase-admin'

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
  dateTime: firestore.Timestamp

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  homeKitCode?: string

  @ApiProperty()
  @IsString()
  @IsUrl()
  @IsNotEmpty()
  photoUrl: string

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
