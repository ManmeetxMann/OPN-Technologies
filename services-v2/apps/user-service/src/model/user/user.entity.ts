import {Column, Entity, Generated, PrimaryColumn} from 'typeorm'
import {Auditable} from '@opn-services/common/model'
import {ApiProperty} from '@nestjs/swagger'

@Entity('user')
export class User extends Auditable {
  @PrimaryColumn()
  @Generated('uuid')
  @ApiProperty({readOnly: true})
  id: string

  @Column({nullable: false})
  @ApiProperty({required: true})
  firstName!: string

  @Column({nullable: false})
  @ApiProperty({required: true})
  lastName!: string

  @Column()
  @ApiProperty()
  photo: string

  @Column()
  @ApiProperty()
  email: string
}
