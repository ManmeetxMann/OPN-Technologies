import {
  Column,
  Entity,
  Generated,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm'
import {Auditable} from '../../../../../libs/common/src/model'
import {ApiProperty} from '@nestjs/swagger'
import {IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsString} from 'class-validator'
import {PatientDigitalConsent, PatientHealth, PatientTravel} from './patient-profile.entity'
import {UserStatus} from '../../../../../../packages/common/src/data/user'
import {PatientToDelegates, PatientToOrganization} from './patient-relations.entity'
import {Organization} from '../organization/organization.entity'

@Entity('patientAuth')
@Unique(['authUserId', 'email'])
export class PatientAuth {
  @PrimaryColumn()
  @Generated('uuid')
  @ApiProperty({readOnly: true})
  idPatientAuth: string

  @OneToOne(
    () => Patient,
    patient => patient.auth,
    {onDelete: 'CASCADE'},
  )
  @JoinColumn({name: 'patientId'})
  @Column({nullable: false})
  @ApiProperty({required: true})
  patientId: number

  @Column()
  @Column({nullable: true, default: null})
  authUserId?: string

  @Column({nullable: true, default: null})
  @ApiProperty()
  @IsEmail()
  email?: string

  @Column({nullable: true, default: null})
  @ApiProperty()
  @IsString()
  phoneNumber?: string
}

@Entity('patientAddresses')
export class PatientAddresses {
  @PrimaryColumn()
  @Generated('uuid')
  @ApiProperty({readOnly: true})
  idPatientAddresses: string

  @OneToOne(
    () => Patient,
    patient => patient.addresses,
  )
  @JoinColumn({name: 'patientId'})
  @Column({nullable: false})
  @ApiProperty({required: true})
  patientId: number

  @Column({nullable: true, default: null})
  @ApiProperty({required: true})
  @IsString()
  homeAddress: string

  @Column({nullable: true, default: null})
  @ApiProperty({required: true})
  @IsString()
  homeAddressUnit: string

  @Column({nullable: true, default: null})
  @ApiProperty()
  @IsString()
  postalCode: string

  @Column({nullable: true, default: null})
  @ApiProperty()
  @IsString()
  city: string

  @Column({nullable: true, default: null})
  @ApiProperty()
  @IsString()
  province: string

  @Column({nullable: true, default: null})
  @ApiProperty()
  @IsString()
  country: string
}

@Entity('patientAdmin')
export class PatientAdmin {
  @PrimaryColumn()
  @Generated('uuid')
  @ApiProperty({readOnly: true})
  patientAdminId: string

  @Column()
  @ApiProperty({nullable: false, default: false})
  @IsBoolean()
  isOpnSuperAdmin?: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  @IsBoolean()
  isManagementDashboardAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  @IsBoolean()
  isTestReportsAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  @IsBoolean()
  isTestAppointmentsAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  @IsBoolean()
  isTestKitBatchAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  @IsBoolean()
  isLabUser: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  @IsBoolean()
  isLabAppointmentsAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  @IsBoolean()
  isLabResultsAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  @IsBoolean()
  isTransportsRunsAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  @IsBoolean()
  isReceivingAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  @IsBoolean()
  isTestRunsAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  @IsBoolean()
  isDueTodayAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  @IsBoolean()
  isBulkUploadAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  @IsBoolean()
  isSingleResultSendAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  @IsBoolean()
  isConfirmResultAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  @IsBoolean()
  isPackageAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  @IsBoolean()
  isCheckInAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  @IsBoolean()
  isGenerateAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  @IsBoolean()
  isLookupAdmin: boolean

  @OneToOne(
    () => Patient,
    patient => patient.admin,
  )
  @JoinColumn({name: 'patientId'})
  @Column({nullable: false})
  @ApiProperty({required: true})
  patientId: number
}

@Entity('patient')
@Unique(['firebaseKey'])
export class Patient extends Auditable {
  @PrimaryGeneratedColumn('increment')
  @ApiProperty({readOnly: true})
  idPatient: number

  @Column({nullable: true})
  @ApiProperty()
  @IsString()
  patientPublicId: string

  @Column({nullable: false})
  @ApiProperty({required: true})
  firebaseKey: string

  @Column()
  @ApiProperty()
  @IsString()
  firstName: string

  @Column()
  @ApiProperty()
  @IsString()
  lastName: string

  @Column()
  @ApiProperty({nullable: true, default: false})
  @IsBoolean()
  isEmailVerified?: boolean

  @Column({nullable: true})
  @ApiProperty()
  @IsString()
  dateOfBirth?: string

  @Column({nullable: true})
  @ApiProperty()
  @IsString()
  phoneNumber?: string

  @Column({nullable: true, default: null})
  @ApiProperty()
  @IsString()
  registrationId?: string

  @Column({nullable: true, default: null})
  @ApiProperty()
  @IsString()
  photoUrl?: string

  @Column({nullable: true, default: null})
  @ApiProperty()
  @IsString()
  consentFileUrl?: string

  @Column({type: 'enum', enum: UserStatus, nullable: true, default: UserStatus.CONFIRMED})
  @IsString()
  @IsNotEmpty()
  @IsEnum(UserStatus)
  status?: UserStatus

  @Column({type: 'timestamp', nullable: true, default: null})
  @ApiProperty()
  lastAppointment?: Date

  @Column({type: 'timestamp', nullable: true, default: null})
  trainingCompletedOn?: Date

  /** Relations */
  @OneToOne(
    () => PatientAuth,
    patientAddress => patientAddress.patientId,
    {eager: true, onDelete: 'CASCADE'},
  )
  auth?: PatientAuth

  @OneToOne(
    () => PatientAddresses,
    patientAddress => patientAddress.patientId,
  )
  addresses?: PatientAddresses

  @OneToOne(
    () => PatientHealth,
    patientHealth => patientHealth.patientId,
  )
  health?: PatientHealth

  @OneToOne(
    () => PatientTravel,
    patientTravel => patientTravel.patientId,
  )
  travel?: PatientTravel

  @OneToOne(
    () => PatientDigitalConsent,
    patientTravel => patientTravel.patientId,
  )
  digitalConsent?: PatientDigitalConsent

  @OneToOne(
    () => PatientAdmin,
    patientAdmin => patientAdmin.patientId,
  )
  admin?: PatientAdmin

  @OneToMany(
    () => PatientToDelegates,
    patientToDelegate => patientToDelegate.delegateId,
  )
  dependants?: PatientToDelegates[]

  @OneToMany(
    () => PatientToDelegates,
    patientToDelegate => patientToDelegate.dependantId,
  )
  delegates?: PatientToDelegates[]

  @OneToMany(
    () => PatientToOrganization,
    patientToOrganization => patientToOrganization.patientId,
  )
  organizations?: Organization[]
}
