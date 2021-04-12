import {EntityRepository, Repository} from 'typeorm'
import {User} from '../model/user/user.entity'
import {UserGroup} from '../model/user/user-group.entity'
import {UserOrganization} from '../model/user/user-organization.entity'

@EntityRepository(User)
export class UserRepository extends Repository<User> {}

@EntityRepository(UserGroup)
export class UserGroupRepository extends Repository<UserGroup> {}

@EntityRepository(UserOrganization)
export class UserOrganizationRepository extends Repository<UserOrganization> {}
