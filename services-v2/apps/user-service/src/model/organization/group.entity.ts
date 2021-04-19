import {Column, Entity, Generated, JoinColumn, ManyToOne, PrimaryColumn} from 'typeorm'
import {Organization} from './organization.entity'
import {Auditable} from '@opn-services/common/model'
import {ApiProperty} from '@nestjs/swagger'

@Entity('group')
export class OrganizationGroup extends Auditable {
  @PrimaryColumn()
  @Generated('uuid')
  @ApiProperty({readOnly: true})
  id: string

  @Column({nullable: false})
  @ApiProperty({required: true})
  name!: string

  @Column()
  @ApiProperty()
  priority?: number

  @ManyToOne(
    () => Organization,
    organization => organization.id,
  )
  @JoinColumn({name: 'organizationId'})
  @ApiProperty()
  organizationId: string
}
