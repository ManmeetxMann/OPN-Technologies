import {Column, Entity, Generated, JoinColumn, ManyToOne, PrimaryColumn} from 'typeorm'
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
    patient => patient.idPatient,
    {onDelete: 'CASCADE'},
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
    patient => patient.idPatient,
  )
  @JoinColumn({name: 'delegateId', referencedColumnName: 'idPatient'})
  @Column({nullable: false})
  @ApiProperty({required: true})
  delegateId: string

  @ManyToOne(
    () => Patient,
    patient => patient.idPatient,
  )
  @JoinColumn({name: 'dependantId', referencedColumnName: 'idPatient'})
  @Column()
  @ApiProperty()
  dependantId: string
}
