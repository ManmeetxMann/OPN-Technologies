import {Column, Entity, Generated, JoinColumn, ManyToOne, PrimaryColumn} from 'typeorm'
import {ApiProperty} from '@nestjs/swagger'
import {Auditable} from '../../../../../libs/common/src/model'
import {Organization} from './organization.entity'

@Entity('location')
export class OrganizationLocation extends Auditable {
  @PrimaryColumn()
  @Generated('uuid')
  @ApiProperty({readOnly: true})
  id: string

  @Column({nullable: false})
  @ApiProperty({required: true})
  title!: string

  @Column()
  @ApiProperty()
  streetAddress: string

  @Column()
  @ApiProperty()
  city: string

  @Column()
  @ApiProperty()
  zip: string

  @Column()
  @ApiProperty()
  state: string

  @Column()
  @ApiProperty()
  country: string

  @ManyToOne(
    () => Organization,
    organization => organization.id,
  )
  @JoinColumn({name: 'organizationId'})
  @ApiProperty()
  organizationId: string
}
