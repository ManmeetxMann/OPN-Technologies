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
  patientId: string

  @Column()
  @ApiProperty()
  @IsString()
  travelCountry: string

  @Column()
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
  patientId: string

  @Column()
  @ApiProperty()
  @IsString()
  healthType: string

  @Column()
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
  patientId: string

  @Column()
  @ApiProperty({nullable: false, default: false})
  @IsBoolean()
  agreeToConductFHHealthAssessment: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  @IsBoolean()
  shareTestResultWithEmployer: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  @IsBoolean()
  readTermsAndConditions: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  @IsBoolean()
  receiveResultsViaEmail: boolean

  @Column()
  @ApiProperty({nullable: false, default: false})
  @IsBoolean()
  receiveNotificationsFromGov: boolean
}
