import {Column, Entity, Generated, PrimaryColumn} from 'typeorm'
import {ApiProperty} from '@nestjs/swagger'
import {Auditable} from '../../../../../libs/common/src/model/auditable'

@Entity('organization')
export class Organization extends Auditable {
  @PrimaryColumn()
  @Generated('uuid')
  @ApiProperty({readOnly: true})
  id: string

  @Column({nullable: false})
  @ApiProperty({required: true})
  name!: string

  @Column({nullable: false})
  @ApiProperty()
  key: number
}
