import {ApiProperty, ApiPropertyOptional, OmitType, PartialType} from '@nestjs/swagger'
import {PageableRequestFilter, PubSubMessage, PubSubPayload} from '@opn-services/common/dto'
import {
  IsBoolean,
  IsDefined,
  IsEmail,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
} from 'class-validator'
import {Organization} from '../model/organization/organization.entity'
import {Patient} from '../model/patient/patient.entity'

export type PatientDTO = Partial<PatientCreateDto> & {
  lastAppointment: Date
  trainingCompletedOn: Date
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organizationId?: string

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

  organizations?: Organization[]
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organizationId?: string

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

class FCMRegistration {
  @ApiPropertyOptional()
  @IsOptional()
  pushToken?: string

  @ApiPropertyOptional()
  @IsOptional()
  osVersion?: string

  @ApiPropertyOptional()
  @IsOptional()
  platform?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registrationId?: string
}

export class PatientUpdateDto extends PartialType(PatientCreateDto) {
  @IsOptional()
  id?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  trainingCompletedOn?: boolean | Date

  @ApiPropertyOptional({type: FCMRegistration})
  @IsOptional()
  registration?: FCMRegistration
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

  @ApiPropertyOptional()
  @IsOptional()
  organizationId?: string
}

class PatientUpdatePubSubAttributes {
  @ApiProperty()
  @IsString()
  userId: string
}

class PatientUpdatePubSubMessage extends PubSubMessage<PatientUpdatePubSubAttributes> {
  @ApiProperty({type: PatientUpdatePubSubAttributes})
  @IsDefined()
  attributes: PatientUpdatePubSubAttributes
}

export class PatientUpdatePubSubPayload extends PubSubPayload<PatientUpdatePubSubMessage> {
  @ApiProperty({type: PatientUpdatePubSubMessage})
  @IsDefined()
  message: PatientUpdatePubSubMessage
}

export type PatientUpdatePubSubProfile = {
  phone: string
  gender: string
  ohipCard: string
  travelID: string
  travelIDIssuingCountry: string
  address: string
  addressUnit: string
  city: string
  province: string
  country: string
  postalCode: string
  readTermsAndConditions: boolean
  receiveResultsViaEmail: boolean
  agreeToConductFHHealthAssessment: boolean
  receiveNotificationsFromGov: boolean
  shareTestResultWithEmployer: boolean
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
  firebaseKey: patient?.firebaseKey,
  patientPublicId: patient.patientPublicId,
  firstName: patient.firstName,
  lastName: patient.lastName,
  dateOfBirth: patient.dateOfBirth,
  email: patient.auth?.email,
  registrationId: patient?.registrationId,
  phoneNumber: patient.phoneNumber,
  photoUrl: patient.photoUrl,
  organizations: patient.organizations,
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
  postalCode: patient.addresses?.postalCode,
})
