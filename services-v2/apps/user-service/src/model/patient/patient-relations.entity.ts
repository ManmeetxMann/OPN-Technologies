import {Column, Entity, Generated, PrimaryColumn, ManyToOne, JoinColumn} from 'typeorm'
import {ApiProperty} from '@nestjs/swagger'

import {Patient} from '../patient/patient.entity'

@Entity('patientToOrganization')
export class PatientToOrganization {
  @PrimaryColumn()
  @Generated('uuid')
  @ApiProperty({readOnly: true})
  idPatientToOrganization: string

  @ManyToOne(
    () => Patient,
    organization => organization.idPatient,
  )
  @JoinColumn({name: 'patientId'})
  @Column({nullable: false})
  @ApiProperty({required: true})
  patientId: string

  @Column({nullable: false})
  @ApiProperty({required: true})
  firebaseOrganizationId: string
}

@Entity('patientToDelegates')
export class PatientToDelegates {
  @PrimaryColumn()
  @Generated('uuid')
  @ApiProperty({readOnly: true})
  idPatientToDelegates: string

  @ManyToOne(
    () => Patient,
    organization => organization.idPatient,
  )
  @JoinColumn({name: 'patientId'})
  @Column({nullable: false})
  @ApiProperty({required: true})
  patientId: string

  @ManyToOne(
    () => Patient,
    organization => organization.idPatient,
  )
  @JoinColumn({name: 'patientId'})
  @Column()
  @ApiProperty()
  delegates: string
}
