import {Column, Entity, Generated, ManyToOne, PrimaryColumn, JoinColumn, Unique} from 'typeorm'
// Relative part since imported into v1
import {Auditable} from '../../../../../libs/common/src/model/auditable'
import {ApiProperty} from '@nestjs/swagger'

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
  firstName: string

  @Column()
  @ApiProperty()
  lastName: string

  @Column()
  @ApiProperty()
  phoneNumber: string

  @Column({nullable: false})
  @ApiProperty()
  registrationId: string

  @Column()
  @ApiProperty()
  photoUrl: string

  @Column({nullable: false})
  @ApiProperty()
  consentFileUrl: string
}

@Entity('patientAuth')
@Unique(['authUserId', 'email'])
export class PatientAuth {
  @PrimaryColumn()
  @Generated('uuid')
  @ApiProperty({readOnly: true})
  idPatientAuth: string

  @ManyToOne(
    () => Patient,
    organization => organization.idPatient,
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
  email: string
}

@Entity('patientAddresses')
export class PatientAddresses {
  @PrimaryColumn()
  @Generated('uuid')
  @ApiProperty({readOnly: true})
  idPatientAddresses: string

  @ManyToOne(
    () => Patient,
    organization => organization.idPatient,
  )
  @JoinColumn({name: 'patientId'})
  @Column({nullable: false})
  @ApiProperty({required: true})
  patientId: string

  @Column()
  @ApiProperty({required: true})
  address1: string

  @Column()
  @ApiProperty({required: true})
  address2: string

  @Column()
  @ApiProperty({required: true})
  address3: string

  @Column()
  @ApiProperty()
  city: string

  @Column()
  @ApiProperty()
  province: string

  @Column()
  @ApiProperty()
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
  isOpnSuperAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  isManagementDashboardAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  isTestReportsAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  isTestAppointmentsAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  isTestKitBatchAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  isLabUser: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  isLabAppointmentsAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  isLabResultsAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  isTransportsRunsAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  isReceivingAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  isTestRunsAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  isDueTodayAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  isBulkUploadAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  isSingleResultSendAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  isConfirmResultAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  isPackageAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  isCheckInAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  isGenerateAdmin: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  isLookupAdmin: boolean

  @ManyToOne(
    () => Patient,
    organization => organization.idPatient,
  )
  @JoinColumn({name: 'patientId'})
  @Column({nullable: false})
  @ApiProperty({required: true})
  patientId: string
}
