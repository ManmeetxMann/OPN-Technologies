import {CreateDateColumn, UpdateDateColumn} from 'typeorm'
import {ApiProperty} from '@nestjs/swagger'

export abstract class Auditable {
  @CreateDateColumn({nullable: false})
  @ApiProperty()
  createdAt: Date

  @UpdateDateColumn({nullable: false})
  @ApiProperty()
  updatedAt: Date
}
