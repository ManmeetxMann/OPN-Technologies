import {ApiProperty} from '@nestjs/swagger'
import {IsDateString, IsNotEmpty, IsNumberString, IsString} from 'class-validator'

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

  @ApiProperty({enum: [TestTypes]})
  @IsString()
  @IsNotEmpty()
  testResult: TestTypes

  @ApiProperty({enum: [ReportAs]})
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
  @IsNumberString()
  @IsNotEmpty()
  postalCode: string
}
