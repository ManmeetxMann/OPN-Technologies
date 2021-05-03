import {ApiProperty, ApiPropertyOptional, OmitType, PartialType} from '@nestjs/swagger'
import {ApiModelPropertyOptional} from '@nestjs/swagger/dist/decorators/api-model-property.decorator'
import {PageableRequestFilter} from '@opn-services/common/dto'
import {IsBoolean, IsEmail, IsNotEmpty, IsNumberString, IsString, Length} from 'class-validator'
import {Patient} from '../model/patient/patient.entity'

export class PatientCreateDto {
  idPatient: string
  firebaseKey: string // Firestore ID
  authUserId: string // Firestore authUserId
  patientPublicId: string

  @ApiProperty()
  @IsEmail()
  email: string

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
  registrationId?: string

  @ApiPropertyOptional()
  @IsString()
  photoUrl: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phoneNumber: string

  @ApiPropertyOptional()
  @IsString()
  consentFileUrl?: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  dateOfBirth: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  homeAddress: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  homeAddressUnit: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  city: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  province: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  country: string

  @ApiProperty()
  @IsNumberString()
  postalCode: string

  @ApiProperty()
  healthCardType: string

  @ApiProperty()
  @IsString()
  @IsNumberString()
  @Length(9, 9)
  healthCardNumber: string

  @ApiPropertyOptional()
  @IsString()
  travelPassport: string

  @ApiPropertyOptional()
  @IsString()
  travelCountry: string

  @ApiPropertyOptional()
  @IsBoolean()
  agreeToConductFHHealthAssessment: boolean

  @ApiPropertyOptional()
  @IsBoolean()
  shareTestResultWithEmployer: boolean

  @ApiPropertyOptional()
  @IsBoolean()
  readTermsAndConditions: boolean

  @ApiPropertyOptional()
  @IsBoolean()
  receiveResultsViaEmail: boolean

  @ApiPropertyOptional()
  @IsBoolean()
  receiveNotificationsFromGov: boolean

  updatedBy?: string
}

export class PatientUpdateDto extends PartialType(PatientCreateDto) {
  patientId?: string
  @ApiModelPropertyOptional()
  @IsBoolean()
  trainingCompletedOn?: boolean
}

export class LinkCodeToAccountDto {
  @ApiProperty()
  @IsString()
  code: string
}

export class LinkToAccountDto {
  @ApiProperty()
  @IsString()
  encryptedToken: string
}

export class DependantCreateDto extends OmitType(PatientCreateDto, ['email'] as const) {}

export class PatientFilter extends PageableRequestFilter {
  @ApiModelPropertyOptional()
  nameOrId?: string
}

export const patientProfileDto = (patient: Patient): PatientUpdateDto => ({
  idPatient: patient.idPatient,
  patientPublicId: patient.patientPublicId,
  firstName: patient.firstName,
  lastName: patient.lastName,
  dateOfBirth: patient.dateOfBirth,
  email: patient.auth?.email,
  phoneNumber: patient.phoneNumber,
  photoUrl: patient.photoUrl,
  homeAddress: patient.addresses?.homeAddress,
  homeAddressUnit: patient.addresses?.homeAddressUnit,
  city: patient.addresses?.city,
  province: patient.addresses?.province,
  country: patient.addresses?.country,
  healthCardNumber: patient?.health?.healthCard,
  healthCardType: patient?.health?.healthType,
  travelCountry: patient?.travel?.travelCountry,
  travelPassport: patient?.travel?.travelPassport,
  consentFileUrl: patient?.consentFileUrl,
  agreeToConductFHHealthAssessment: patient?.digitalConsent.agreeToConductFHHealthAssessment,
  shareTestResultWithEmployer: patient?.digitalConsent.shareTestResultWithEmployer,
  readTermsAndConditions: patient?.digitalConsent.readTermsAndConditions,
  receiveResultsViaEmail: patient?.digitalConsent.receiveResultsViaEmail,
  receiveNotificationsFromGov: patient?.digitalConsent.receiveNotificationsFromGov,
})
