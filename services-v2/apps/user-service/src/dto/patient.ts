import {ApiProperty, ApiPropertyOptional, OmitType, PartialType} from '@nestjs/swagger'
import {PageableRequestFilter, PubSubMessage, PubSubPayload} from '@opn-services/common/dto'
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator'
import {Organization} from '../model/organization/organization.entity'
import {Patient} from '../model/patient/patient.entity'
import {Type} from 'class-transformer'
const publicPatientIdPrefix = process.env.PATIENT_ID_PREFIX || 'FH'

export class AuthenticateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  patientId: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  organizationId: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code: string
}

export class PatientCreateDto {
  idPatient: number
  firebaseKey: string // Firestore ID
  authUserId: string // Firestore authUserId

  @ApiPropertyOptional()
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

  @ApiPropertyOptional()
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

  @ApiPropertyOptional()
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
  lastAppointment?: Date

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  trainingCompletedOn?: boolean | Date

  organizations?: Organization[]
  updatedBy?: string
}

export class PatientCreateAdminDto {
  idPatient: number
  firebaseKey: string // Firestore ID
  authUserId: string // Firestore authUserId

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
  @IsOptional()
  lastAppointment?: Date

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  trainingCompletedOn?: boolean | Date

  organizations?: Organization[]
  updatedBy?: string
}

export class NormalPatientCreateDto {
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
  photoUrl: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organizationId?: string
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

export class PatientUpdateAdminDto extends PartialType(PatientCreateAdminDto) {}

export class PatientUpdateDto extends PartialType(PatientCreateAdminDto) {
  @IsOptional()
  id?: number

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

export class CouponDto {
  @ApiProperty()
  @IsString()
  email: string
}

export enum migrationActions {
  Merge = 'MERGE',
  New = 'NEW',
}

export class Migration {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  notConfirmedPatientId: string
  @ApiProperty({enum: migrationActions})
  @IsString()
  @IsNotEmpty()
  @IsEnum(migrationActions)
  action: migrationActions
  @ApiProperty()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  patientId?: string
}

export class MigrateDto {
  @ApiProperty({nullable: false, type: [Migration]})
  @IsArray()
  @IsOptional()
  @ValidateNested()
  @Type(() => Migration)
  migrations: Migration[]
}

export class DependantCreateDto extends OmitType(PatientCreateDto, ['email'] as const) {}

export class DependantCreateAdminDto extends OmitType(PatientCreateAdminDto, ['email'] as const) {}

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

  @ApiPropertyOptional()
  @IsOptional()
  organizationId: string

  @ApiPropertyOptional()
  @IsOptional()
  actionType: string
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

export const patientProfileDto = (
  patient: Patient,
  metaData?: {
    resultExitsForProvidedEmail?: boolean
  },
): PatientProfile => ({
  id: patient.idPatient.toString(),
  firebaseKey: patient?.firebaseKey,
  patientPublicId: `${publicPatientIdPrefix}${String(patient.idPatient).padStart(6, '0')}`,
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
  lastAppointment: patient?.lastAppointment,
  resultExitsForProvidedEmail: metaData?.resultExitsForProvidedEmail,
})

export class PatientProfile extends PartialType(PatientCreateAdminDto) {
  @ApiPropertyOptional()
  id: string

  @ApiPropertyOptional()
  firebaseKey: string

  @ApiPropertyOptional()
  patientPublicId: string

  @ApiPropertyOptional()
  resultExitsForProvidedEmail?: boolean
}

export class DependantProfile extends OmitType(PatientProfile, ['email', 'authUserId'] as const) {}
