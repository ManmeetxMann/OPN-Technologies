import {ApiProperty, ApiPropertyOptional, OmitType, PartialType} from '@nestjs/swagger'
import {PageableRequestFilter} from '@opn-services/common/dto'
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
} from 'class-validator'
import {Patient} from '../model/patient/patient.entity'

export type PatientDTO = Partial<PatientCreateDto> & {
  lastAppointment: Date
  trainingCompletedOn: Date
}

export type AuthenticateDto = {
  patientId: string
  organizationId: string
}

export class PatientCreateDto {
  idPatient: string
  firebaseKey: string // Firestore ID
  authUserId: string // Firestore authUserId
  patientPublicId: string

  @ApiPropertyOptional({
    description: 'Required for Normal Patient',
  })
  @IsOptional()
  @IsEmail()
  email: string

  @IsOptional()
  @IsBoolean()
  isEmailVerified?: boolean

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string

  @IsOptional()
  @IsString()
  registrationId?: string

  @ApiPropertyOptional({
    description: 'Required for Normal Patient',
  })
  @IsOptional()
  @IsString()
  photoUrl?: string

  @IsOptional()
  @IsString()
  phoneNumber?: string

  @IsOptional()
  @IsString()
  consentFileUrl?: string

  @IsOptional()
  @IsString()
  dateOfBirth: string

  @IsOptional()
  @IsString()
  homeAddress?: string

  @IsOptional()
  @IsString()
  homeAddressUnit?: string

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @IsString()
  province?: string

  @IsOptional()
  @IsString()
  country?: string

  @ApiPropertyOptional({
    description: 'Required for Home Test Patient',
  })
  @IsOptional()
  @IsString()
  postalCode?: string

  @IsOptional()
  healthCardType?: string

  @IsOptional()
  @IsString()
  @IsNumberString()
  @Length(9, 9)
  healthCardNumber?: string

  @IsOptional()
  @IsString()
  travelPassport?: string

  @IsOptional()
  @IsString()
  travelCountry?: string

  @IsOptional()
  @IsBoolean()
  agreeToConductFHHealthAssessment?: boolean

  @IsOptional()
  @IsBoolean()
  shareTestResultWithEmployer?: boolean

  @IsOptional()
  @IsBoolean()
  readTermsAndConditions?: boolean

  @IsOptional()
  @IsBoolean()
  receiveResultsViaEmail?: boolean

  @IsOptional()
  @IsBoolean()
  receiveNotificationsFromGov?: boolean

  updatedBy?: string
}

export class PatientCreateAdminDto {
  idPatient: string
  firebaseKey: string // Firestore ID
  authUserId: string // Firestore authUserId
  patientPublicId: string

  @ApiProperty()
  @IsEmail()
  email: string

  @IsOptional()
  @IsBoolean()
  isEmailVerified?: boolean

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
  @IsString()
  registrationId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photoUrl?: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phoneNumber: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  consentFileUrl?: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  dateOfBirth: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  homeAddress: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  homeAddressUnit?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  city?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  province?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  country?: string

  @ApiPropertyOptional()
  @IsNumberString()
  @IsOptional()
  postalCode?: string

  @IsOptional()
  healthCardType?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNumberString()
  @Length(9, 9)
  healthCardNumber?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  travelPassport?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  travelCountry?: string

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  agreeToConductFHHealthAssessment?: boolean

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  shareTestResultWithEmployer?: boolean

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  readTermsAndConditions?: boolean

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  receiveResultsViaEmail?: boolean

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  receiveNotificationsFromGov?: boolean

  updatedBy?: string
}

export class PatientUpdateDto extends PartialType(PatientCreateDto) {
  @IsOptional()
  id?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  trainingCompletedOn?: boolean | Date

  @ApiPropertyOptional()
  pushToken?: string

  @ApiPropertyOptional()
  osVersion?: string

  @ApiPropertyOptional()
  platform?: string
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
  @ApiPropertyOptional()
  @IsOptional()
  nameOrId?: string
}

export const CreatePatientDTOResponse = (patient: Patient): PatientDTO => ({
  idPatient: patient.idPatient,
  firstName: patient.firstName,
  lastName: patient.lastName,
  phoneNumber: patient.phoneNumber,
  patientPublicId: patient.patientPublicId,
  dateOfBirth: patient.dateOfBirth,
  photoUrl: patient.photoUrl,
  lastAppointment: patient.lastAppointment,
  trainingCompletedOn: patient.trainingCompletedOn,
})

export const patientProfileDto = (patient: Patient): PatientUpdateDto => ({
  id: patient.idPatient,
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
  agreeToConductFHHealthAssessment: patient?.digitalConsent?.agreeToConductFHHealthAssessment,
  shareTestResultWithEmployer: patient?.digitalConsent?.shareTestResultWithEmployer,
  readTermsAndConditions: patient?.digitalConsent?.readTermsAndConditions,
  receiveResultsViaEmail: patient?.digitalConsent?.receiveResultsViaEmail,
  receiveNotificationsFromGov: patient?.digitalConsent?.receiveNotificationsFromGov,
  trainingCompletedOn: patient?.trainingCompletedOn,
})
