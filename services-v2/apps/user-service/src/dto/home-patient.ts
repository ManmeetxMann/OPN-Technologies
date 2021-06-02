import {ApiProperty} from '@nestjs/swagger'
import {IsBoolean, IsNotEmpty, IsString} from 'class-validator'
import {Auditable} from '@opn-common-v1/types/auditable'

export type RapidHomeKitToUserAssoc = Auditable & {
  id: string
  rapidHomeKitId: string
  userId: string
  used: boolean
}

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
