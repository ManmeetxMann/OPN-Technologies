import {
  Column,
  Entity,
  Generated,
  PrimaryColumn,
  JoinColumn,
  Unique,
  BeforeInsert,
  OneToOne,
} from 'typeorm'
import {Auditable} from '@opn/common/model'
import {ApiProperty} from '@nestjs/swagger'
import {IsBoolean, IsEmail, IsString} from 'class-validator'
import {PatientDigitalConsent, PatientHealth, PatientTravel} from './patient-profile'

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
  )
  @JoinColumn({name: 'patientId'})
  @Column({nullable: false})
  @ApiProperty({required: true})
  patientId: string

  @Column()
  @ApiProperty({required: true})
  authUserId: string

  @Column()
  @ApiProperty()
  @IsEmail()
  email: string
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
  patientId: string

  @Column()
  @ApiProperty({required: true})
  @IsString()
  homeAddress: string

  @Column()
  @ApiProperty({required: true})
  @IsString()
  homeAddressUnit: string

  @Column()
  @ApiProperty({required: true})
  @IsString()
  postalCode: string

  @Column()
  @ApiProperty()
  @IsString()
  city: string

  @Column()
  @ApiProperty()
  @IsString()
  province: string

  @Column()
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
  isOpnSuperAdmin: boolean

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
  patientId: string
}

@Entity('patient')
@Unique(['patientPublicId', 'firebaseKey'])
export class Patient extends Auditable {
  @PrimaryColumn()
  @Generated('uuid')
  @ApiProperty({readOnly: true})
  idPatient: string

  @Column({nullable: false})
  @ApiProperty({required: true})
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
  @ApiProperty()
  @IsString()
  dateOfBirth: string

  @Column()
  @ApiProperty()
  @IsString()
  phoneNumber: string

  @Column({nullable: false})
  @ApiProperty()
  @IsString()
  registrationId: string

  @Column()
  @ApiProperty()
  @IsString()
  photoUrl: string

  @Column({nullable: true, default: null})
  @ApiProperty()
  @IsString()
  consentFileUrl: string

  /** Relations */
  @OneToOne(
    () => PatientAuth,
    patientAddress => patientAddress.patientId,
  )
  auth: PatientAuth

  @OneToOne(
    () => PatientAddresses,
    patientAddress => patientAddress.patientId,
  )
  addresses: PatientAddresses

  @OneToOne(
    () => PatientHealth,
    patientHealth => patientHealth.patientId,
  )
  health: PatientHealth

  @OneToOne(
    () => PatientTravel,
    patientTravel => patientTravel.patientId,
  )
  travel: PatientTravel

  @OneToOne(
    () => PatientDigitalConsent,
    patientTravel => patientTravel.patientId,
  )
  digitalConsent: PatientDigitalConsent

  @OneToOne(
    () => PatientAdmin,
    patientAdmin => patientAdmin.patientId,
  )
  admin: PatientAdmin

  /** Hooks */
  @BeforeInsert()
  generatePublicId(): void {
    this.patientPublicId = Math.random()
      .toString(36)
      .substring(2, 10)
  }
}
