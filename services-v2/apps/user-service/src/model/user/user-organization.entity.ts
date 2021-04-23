import {Entity, Generated, ManyToOne, PrimaryColumn} from 'typeorm'
import {Auditable} from '../../../../../libs/common/src/model'
import {Organization} from '../organization/organization.entity'
import {User} from './user.entity'

@Entity('user_organization')
export class UserOrganization extends Auditable {
  @PrimaryColumn()
  @Generated('uuid')
  id: string

  @ManyToOne(() => User)
  user: User

  @ManyToOne(() => Organization)
  organization: Organization
}
