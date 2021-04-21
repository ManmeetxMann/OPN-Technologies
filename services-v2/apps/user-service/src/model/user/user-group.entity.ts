import {Entity, Generated, ManyToOne, PrimaryColumn} from 'typeorm'
import {Auditable} from '@opn-services/common/model'
import {User} from './user.entity'
import {OrganizationGroup} from '../organization/group.entity'

@Entity('user_group')
export class UserGroup extends Auditable {
  @PrimaryColumn()
  @Generated('uuid')
  id: string

  @ManyToOne(() => User)
  user: User

  @ManyToOne(() => OrganizationGroup)
  group: OrganizationGroup
}
