import {ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty, IsString} from 'class-validator'

export class HomeTestPatientDto {
  idPatient: string
  firebaseKey: string // Firestore ID
  authUserId: string // Firestore authUserId
  phoneNumber: string

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
}