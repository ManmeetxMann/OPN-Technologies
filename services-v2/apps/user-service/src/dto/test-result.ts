import {ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty, IsNumberString, IsString} from 'class-validator'

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

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  testResult: TestTypes

  @ApiProperty()
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
  dateOfBirth: string

  @ApiProperty()
  @IsNumberString()
  @IsNotEmpty()
  postalCode: string
}
