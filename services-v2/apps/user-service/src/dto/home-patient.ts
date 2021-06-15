import {ApiProperty} from '@nestjs/swagger'
import {IsBoolean, IsNotEmpty, IsString} from 'class-validator'

export class HomeTestPatientDto {
  idPatient: number
  firebaseKey: string // Firestore ID
  authUserId: string // Firestore authUserId
  phoneNumber: string
  organizationId?: string

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
  postalCode: string

  @ApiProperty()
  @IsBoolean()
  isEmailVerified?: boolean
}
