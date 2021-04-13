import {Column, Entity, Generated, PrimaryColumn, ManyToOne, JoinColumn} from 'typeorm'
import {Auditable} from '@opn/common/model'
import {ApiProperty} from '@nestjs/swagger'

import {Patient} from '../patient/patient.entity'

@Entity('patientTravel')
export class PatientTravel extends Auditable {
  @PrimaryColumn()
  @Generated('uuid')
  @ApiProperty({readOnly: true})
  idPatientTravel: string

  @ManyToOne(
    () => Patient,
    organization => organization.idPatient,
  )
  @JoinColumn({name: 'patientId'})
  @Column({nullable: false})
  @ApiProperty({required: true})
  patientId: string

  @Column()
  @ApiProperty()
  travelCountry: string

  @Column()
  @ApiProperty()
  travelPassport: string
}

@Entity('patientHealth')
export class PatientHealth extends Auditable {
  @PrimaryColumn()
  @Generated('uuid')
  @ApiProperty({readOnly: true})
  idPatientTravel: string

  @ManyToOne(
    () => Patient,
    organization => organization.idPatient,
  )
  @JoinColumn({name: 'patientId'})
  @Column({nullable: false})
  @ApiProperty({required: true})
  patientId: string

  @Column()
  @ApiProperty()
  healthType: string

  @Column()
  @ApiProperty()
  healthCard: string
}

@Entity('patientDigitalConsent')
export class PatientDigitalConsent extends Auditable {
  @PrimaryColumn()
  @Generated('uuid')
  @ApiProperty({readOnly: true})
  idPatientDigitalConsent: string

  @ManyToOne(
    () => Patient,
    organization => organization.idPatient,
  )
  @JoinColumn({name: 'patientId'})
  @Column({nullable: false})
  @ApiProperty({required: true})
  patientId: string

  @Column()
  @ApiProperty({nullable: false, default: false})
  agreeToConductFHHealthAssessment: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  shareTestResultWithEmployer: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  readTermsAndConditions: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  receiveResultsViaEmail: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  receiveNotificationsFromGov: boolean
}
