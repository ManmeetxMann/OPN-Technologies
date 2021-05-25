import {Column, Entity, Generated, JoinColumn, OneToOne, PrimaryColumn} from 'typeorm'
import {Auditable} from '../../../../../libs/common/src/model'
import {ApiProperty} from '@nestjs/swagger'
import {IsBoolean, IsString} from 'class-validator'

import {Patient} from '../patient/patient.entity'

@Entity('patientTravel')
export class PatientTravel extends Auditable {
  @PrimaryColumn()
  @Generated('uuid')
  @ApiProperty({readOnly: true})
  idPatientTravel: string

  @OneToOne(
    () => Patient,
    patient => patient.travel,
  )
  @JoinColumn({name: 'patientId'})
  @Column({nullable: false})
  @ApiProperty({required: true})
  patientId: number

  @Column({nullable: true, default: null})
  @ApiProperty()
  @IsString()
  travelCountry: string

  @Column({nullable: true, default: null})
  @ApiProperty()
  @IsString()
  travelPassport: string
}

@Entity('patientHealth')
export class PatientHealth extends Auditable {
  @PrimaryColumn()
  @Generated('uuid')
  @ApiProperty({readOnly: true})
  idPatientTravel: string

  @OneToOne(
    () => Patient,
    patient => patient.health,
  )
  @JoinColumn({name: 'patientId'})
  @Column({nullable: false})
  @ApiProperty({required: true})
  patientId: number

  @Column()
  @ApiProperty()
  @IsString()
  healthType: string

  @Column({nullable: true, default: null})
  @ApiProperty()
  @IsString()
  healthCard: string
}

@Entity('patientDigitalConsent')
export class PatientDigitalConsent extends Auditable {
  @PrimaryColumn()
  @Generated('uuid')
  @ApiProperty({readOnly: true})
  idPatientDigitalConsent: string

  @OneToOne(
    () => Patient,
    patient => patient.digitalConsent,
  )
  @JoinColumn({name: 'patientId'})
  @Column({nullable: false})
  @ApiProperty({required: true})
  patientId: number

  @Column({nullable: true, default: null})
  @ApiProperty()
  @IsBoolean()
  agreeToConductFHHealthAssessment: boolean

  @Column({nullable: true, default: null})
  @ApiProperty()
  @IsBoolean()
  shareTestResultWithEmployer: boolean

  @Column({nullable: true, default: null})
  @ApiProperty()
  @IsBoolean()
  readTermsAndConditions: boolean

  @Column({nullable: true, default: null})
  @ApiProperty()
  @IsBoolean()
  receiveResultsViaEmail: boolean

  @Column({nullable: true, default: null})
  @ApiProperty()
  @IsBoolean()
  receiveNotificationsFromGov: boolean
}
